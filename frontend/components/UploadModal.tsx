"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile, FiX, FiCalendar } from 'react-icons/fi';
import { formatBytes } from '@/lib/utils';
import axios, { CancelTokenSource } from 'axios';
import axiosInstance from '@/lib/axiosConfig';
import { isAxiosError } from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { storageConfig } from '@/lib/config';
import { API_URL } from '@/lib/constants';

interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [expireDays, setExpireDays] = useState(5);
  
  // Refs to track upload progress across chunks
  const totalBytesUploadedRef = useRef(0);
  const totalChunkBytesUploadedRef = useRef(0); // Track bytes within current chunk
  const uploadStartTimeRef = useRef(0);
  const lastProgressUpdateRef = useRef(0);
  const speedCalculationWindowRef = useRef<{time: number, bytes: number}[]>([]);
  const activeChunkIndexRef = useRef(0);
  const currentFileIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const cancelTokenSourcesRef = useRef<CancelTokenSource[]>([]);
  
  // Add ref for the success sound
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Add a state to track if audio is unlocked
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.size > storageConfig.maxFileSize) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${formatBytes(storageConfig.maxFileSize)}`,
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    maxSize: storageConfig.maxFileSize
  });

  const resetUploadState = () => {
    setProgress(0);
    setIsUploading(false);
    setUploadSpeed(0);
    setTimeRemaining('');
    totalBytesUploadedRef.current = 0;
    totalChunkBytesUploadedRef.current = 0;
    activeChunkIndexRef.current = 0;
    uploadStartTimeRef.current = 0;
    lastProgressUpdateRef.current = 0;
    speedCalculationWindowRef.current = [];
    cancelledRef.current = false;
    cancelTokenSourcesRef.current = [];
  };

  const calculateProgress = (bytesUploaded: number, totalBytes: number) => {
    if (totalBytes <= 0) return 0;
    // Return a decimal value between 0 and 1 (not percentage)
    return Math.min(0.99, Math.max(0, bytesUploaded / totalBytes));
  };

  const updateUploadStats = (bytesUploaded: number, totalBytes: number) => {
    if (cancelledRef.current) return;
    
    // Validate input to ensure we're working with valid numbers
    if (typeof bytesUploaded !== 'number' || isNaN(bytesUploaded) || bytesUploaded < 0 ||
        typeof totalBytes !== 'number' || isNaN(totalBytes) || totalBytes <= 0) {
      console.warn('Invalid bytesUploaded or totalBytes:', { bytesUploaded, totalBytes });
      return;
    }
    
    const now = Date.now();
    
    // Update progress - calculate more precisely (as a decimal between 0-1)
    const newProgress = calculateProgress(bytesUploaded, totalBytes);
    setProgress(newProgress);
    
    // Only update speed calculations every 500ms to smooth out fluctuations
    if (now - lastProgressUpdateRef.current > 500) {
      lastProgressUpdateRef.current = now;
      
      // Add current data point to sliding window
      speedCalculationWindowRef.current.push({
        time: now,
        bytes: bytesUploaded
      });
      
      // Keep only the last 5 measurements (2.5 seconds worth) for smoothing
      if (speedCalculationWindowRef.current.length > 5) {
        speedCalculationWindowRef.current.shift();
      }
      
      // Calculate speed based on sliding window
      if (speedCalculationWindowRef.current.length >= 2) {
        const oldest = speedCalculationWindowRef.current[0];
        const newest = speedCalculationWindowRef.current[speedCalculationWindowRef.current.length - 1];
        
        const timeDiffSeconds = (newest.time - oldest.time) / 1000;
        const bytesDiff = newest.bytes - oldest.bytes;
        
        // Ensure we have meaningful measurements to calculate speed
        if (timeDiffSeconds > 0 && bytesDiff >= 0) {
          const speed = bytesDiff / timeDiffSeconds;
          
          // Make sure speed is a valid number before setting it
          if (isFinite(speed) && !isNaN(speed) && speed >= 0) {
            setUploadSpeed(speed);
            
            // Calculate time remaining
            if (speed > 0) {
              const remainingBytes = totalBytes - bytesUploaded;
              const remainingTime = remainingBytes / speed;
              
              // Ensure time remaining is valid before formatting
              if (isFinite(remainingTime) && !isNaN(remainingTime) && remainingTime >= 0) {
                // Cap extremely large time estimates to a reasonable maximum (1 day)
                const cappedTime = Math.min(remainingTime, 86400); // 24 hours in seconds
                setTimeRemaining(formatTimeRemaining(cappedTime));
              } else {
                setTimeRemaining('Calculating...');
              }
            } else {
              setTimeRemaining('Calculating...');
            }
          } else {
            // Invalid speed value
            setUploadSpeed(0);
            setTimeRemaining('Calculating...');
          }
        } else {
          // Not enough data for accurate calculation yet
          setTimeRemaining('Calculating...');
        }
      } else {
        // Not enough data points yet
        setTimeRemaining('Calculating...');
      }
    }
  };

  const cancelUpload = async () => {
    // Ask for confirmation first
    if (!window.confirm('Are you sure you want to cancel this upload? The upload process will be terminated and the file will not be saved.')) {
      return; // User cancelled the operation
    }
    
    // Only cancel if we have a fileId and are currently uploading
    if (currentFileIdRef.current && isUploading) {
      try {
        // First set the cancelled flag so ongoing uploads stop
        cancelledRef.current = true;
        console.log(`Cancelling upload for file ID: ${currentFileIdRef.current}`);
        
        // Cancel all pending axios requests
        cancelTokenSourcesRef.current.forEach(source => {
          try {
            source.cancel('Upload cancelled by user');
          } catch (err) {
            console.error('Error cancelling request:', err);
          }
        });
        
        // Clear cancel token sources array
        cancelTokenSourcesRef.current = [];
        
        // Call the cancel API endpoint
        await axios.post(`${API_URL}/api/files/cancel-upload`, 
          { fileId: currentFileIdRef.current },
          { 
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Reset the UI state
        resetUploadState();
        setFile(null); // Also reset the file selection
        
        // Call onUploadComplete to refresh the file list and ensure partially uploaded files don't appear
        onUploadComplete();
        
        toast({
          title: 'Upload Cancelled',
          description: 'File upload has been cancelled',
        });
      } catch (error) {
        console.error('Error cancelling upload:', error);
        
        // Even if the cancel API fails, we should still stop the upload in the UI
        resetUploadState();
        setFile(null); // Also reset the file selection
        
        // Call onUploadComplete to refresh the file list and ensure partially uploaded files don't appear
        onUploadComplete();
        
        toast({
          title: 'Cancel Warning',
          description: 'Upload stopped but server cleanup may have failed',
          variant: 'destructive',
        });
      } finally {
        // Always clean up our state regardless of success/failure
        currentFileIdRef.current = null;
      }
    }
  };

  // Initialize the audio element on mount with stronger autoplay support
  useEffect(() => {
    try {
      console.log('Initializing audio player...');
      
      // Create audio context to ensure proper audio initialization
      const audio = new Audio();
      
      // Set the source after creating the element
      audio.src = '/sounds/winner-bell-game-show-91932.mp3';
      audio.preload = 'auto';
      audio.volume = 0.8; // Increase volume for better audibility
      audio.muted = false; // Ensure not muted
      
      // Test loading the audio file and log any errors
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        console.error('Audio error code:', audio.error?.code);
        console.error('Audio error message:', audio.error?.message);
      });

      audio.addEventListener('canplaythrough', () => {
        console.log('Audio file loaded successfully and can play');
      });
      
      // Force a load attempt
      audio.load();
      
      successSoundRef.current = audio;
      
      // Function to unlock audio - more aggressive approach
      const unlockAudio = () => {
        console.log('Attempting to unlock audio...');
        if (!audioUnlocked) {
          // Create a temporary audio context
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const audioContext = new AudioContext();
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
              audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
              });
            }
          }
          
          // Try playing with both approaches
          const tempAudio = new Audio();
          tempAudio.src = audio.src;
          tempAudio.volume = 0.1;
          
          // Try to play the main audio
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Immediately pause and reset - this just unlocks audio
                audio.pause();
                audio.currentTime = 0;
                console.log('Audio playback unlocked via main audio');
                setAudioUnlocked(true);
              })
              .catch(err => {
                console.warn('Failed to unlock main audio:', err);
                
                // Try with temp audio as backup
                const tempPlayPromise = tempAudio.play();
                if (tempPlayPromise !== undefined) {
                  tempPlayPromise
                    .then(() => {
                      tempAudio.pause();
                      tempAudio.currentTime = 0;
                      console.log('Audio playback unlocked via temp audio');
                      setAudioUnlocked(true);
                    })
                    .catch(tempErr => {
                      console.warn('Failed to unlock temp audio:', tempErr);
                    });
                }
              });
          }
        }
      };
      
      // Multiple unlock approaches - add listeners to various user interactions
      document.addEventListener('click', unlockAudio, { once: false });
      document.addEventListener('touchstart', unlockAudio, { once: false });
      document.addEventListener('keydown', unlockAudio, { once: false });
      
      // Also try to unlock audio immediately 
      setTimeout(unlockAudio, 1000);
      
    } catch (err) {
      console.error('Error initializing audio:', err);
    }
    
    return () => {
      // Clean up
      if (successSoundRef.current) {
        successSoundRef.current.pause();
        successSoundRef.current = null;
      }
      
      // Remove event listeners
      document.removeEventListener('click', () => {});
      document.removeEventListener('touchstart', () => {});
      document.removeEventListener('keydown', () => {});
    };
  }, [audioUnlocked]);
  
  // Function to play success sound - enhanced with multiple play attempts
  const playSuccessSound = () => {
    console.log('playSuccessSound called, attempting to play notification...');
    
    if (successSoundRef.current) {
      try {
        // Create a new audio element for this specific play action
        // This can help bypass some browser restrictions
        const playAudio = new Audio('/sounds/winner-bell-game-show-91932.mp3');
        playAudio.volume = 1.0; // Full volume for notification
        
        console.log('Playing sound with new audio element');
        playAudio.play()
          .then(() => {
            console.log('New audio element played successfully');
          })
          .catch(err => {
            console.warn('Could not play with new audio element:', err);
            
            // Try with the stored audio reference as fallback
            console.log('Trying fallback with stored audio reference');
            successSoundRef.current!.currentTime = 0;
            successSoundRef.current!.volume = 1.0;
            
            const fallbackPromise = successSoundRef.current!.play();
            if (fallbackPromise !== undefined) {
              fallbackPromise
                .then(() => {
                  console.log('Fallback sound played successfully');
                })
                .catch(fallbackErr => {
                  console.warn('Could not play fallback sound:', fallbackErr);
                  
                  // Last resort - use AudioContext API directly
                  try {
                    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioContext) {
                      const audioCtx = new AudioContext();
                      const oscillator = audioCtx.createOscillator();
                      const gainNode = audioCtx.createGain();
                      
                      oscillator.frequency.value = 800; // Beep frequency
                      gainNode.gain.value = 0.1; // Lower volume
                      
                      oscillator.connect(gainNode);
                      gainNode.connect(audioCtx.destination);
                      
                      oscillator.start();
                      setTimeout(() => oscillator.stop(), 200); // Short beep
                      
                      console.log('Played fallback beep using AudioContext API');
                    }
                  } catch (audioCtxErr) {
                    console.error('All audio playback attempts failed:', audioCtxErr);
                  }
                });
            }
          });
          
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    } else {
      console.warn('Success sound not initialized');
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    try {
      // Reset all stats
      setIsUploading(true);
      setProgress(0);
      totalBytesUploadedRef.current = 0;
      totalChunkBytesUploadedRef.current = 0;
      activeChunkIndexRef.current = 0;
      uploadStartTimeRef.current = Date.now();
      lastProgressUpdateRef.current = 0;
      speedCalculationWindowRef.current = [];
      cancelledRef.current = false;
      cancelTokenSourcesRef.current = [];
      
      // 1. Initialize file upload on the server
      const initResponse = await axiosInstance.post(`/api/files/initialize`, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        expiryDays: expireDays
      });
      
      const fileId = initResponse.data.file._id;
      currentFileIdRef.current = fileId;
      
      // 2. Calculate chunks
      const chunkSize = storageConfig.chunkSize;
      const chunksCount = Math.ceil(file.size / chunkSize);
      
      // 3. Upload each chunk
      for (let chunkIndex = 0; chunkIndex < chunksCount; chunkIndex++) {
        // Check if upload was cancelled
        if (cancelledRef.current) {
          console.log('Upload cancelled, stopping chunk upload');
          return;
        }
        
        // Update active chunk index for progress calculation
        activeChunkIndexRef.current = chunkIndex;
        totalChunkBytesUploadedRef.current = 0;
        
        // Get chunk from file
        const startByte = chunkIndex * chunkSize;
        const endByte = Math.min(file.size, startByte + chunkSize);
        const chunkBlob = file.slice(startByte, endByte);
        const chunkBlobSize = endByte - startByte;
        
        // Create form data to send chunk
        const formData = new FormData();
        formData.append('fileId', fileId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', chunksCount.toString());
        formData.append('chunk', new Blob([chunkBlob]), file.name);
        
        // Create cancel token for this request
        const cancelTokenSource = axios.CancelToken.source();
        cancelTokenSourcesRef.current.push(cancelTokenSource);
        
        try {
          // Upload chunk to our backend server
          await axiosInstance.post(`/api/files/upload-chunk`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            cancelToken: cancelTokenSource.token,
            onUploadProgress: (progressEvent) => {
              // Check if upload was cancelled
              if (cancelledRef.current) return;
              
              // Calculate how many bytes of this chunk have been uploaded
              const chunkBytesUploaded = progressEvent.loaded;
              totalChunkBytesUploadedRef.current = chunkBytesUploaded;
              
              // Calculate total bytes uploaded (completed chunks + current chunk progress)
              const completedChunksBytes = chunkIndex * chunkSize;
              const totalBytesUploaded = completedChunksBytes + chunkBytesUploaded;
              
              // Store in ref for access across chunks
              totalBytesUploadedRef.current = totalBytesUploaded;
              
              // Update progress and stats
              updateUploadStats(totalBytesUploaded, file.size);
            },
            // Add timeout to prevent hanging requests
            timeout: 60000 // 60 seconds timeout for larger chunks
          });
          
          // After chunk completes, ensure progress reflects completed chunk
          const completedBytes = (chunkIndex + 1) * chunkSize;
          totalBytesUploadedRef.current = Math.min(completedBytes, file.size);
          updateUploadStats(totalBytesUploadedRef.current, file.size);
          
          // Remove the completed request's cancel token
          cancelTokenSourcesRef.current = cancelTokenSourcesRef.current.filter(
            source => source !== cancelTokenSource
          );
          
        } catch (error) {
          if (axios.isCancel(error)) {
            console.log('Request cancelled:', error.message);
            return; // Exit the function if cancelled
          }
          
          console.error(`Error uploading chunk ${chunkIndex}:`, error);
          
          // If it's a network or server error, try again up to 3 times
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries && !cancelledRef.current) {
            try {
              retryCount++;
              console.log(`Retrying chunk ${chunkIndex}, attempt ${retryCount}...`);
              
              // Wait a bit before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              
              // Create a new cancel token for the retry
              const retryCancelToken = axios.CancelToken.source();
              cancelTokenSourcesRef.current.push(retryCancelToken);
              
              // Try uploading again
              await axiosInstance.post(`/api/files/upload-chunk`, formData, {
                headers: {
                  'Content-Type': 'multipart/form-data'
                },
                cancelToken: retryCancelToken.token,
                timeout: 60000, // 60 seconds timeout for larger chunks
                onUploadProgress: (progressEvent) => {
                  if (cancelledRef.current) return;
                  
                  const chunkBytesUploaded = progressEvent.loaded;
                  totalChunkBytesUploadedRef.current = chunkBytesUploaded;
                  
                  const completedChunksBytes = chunkIndex * chunkSize;
                  const totalBytesUploaded = completedChunksBytes + chunkBytesUploaded;
                  
                  totalBytesUploadedRef.current = totalBytesUploaded;
                  updateUploadStats(totalBytesUploaded, file.size);
                }
              });
              
              // If we get here, the retry was successful
              console.log(`Chunk ${chunkIndex} retry successful`);
              
              // After chunk completes, ensure progress reflects completed chunk
              const completedBytes = (chunkIndex + 1) * chunkSize;
              totalBytesUploadedRef.current = Math.min(completedBytes, file.size);
              updateUploadStats(totalBytesUploadedRef.current, file.size);
              
              // Remove the completed request's cancel token
              cancelTokenSourcesRef.current = cancelTokenSourcesRef.current.filter(
                source => source !== retryCancelToken
              );
              
              break; // Exit retry loop
            } catch (retryError) {
              if (axios.isCancel(retryError)) {
                console.log('Retry cancelled:', retryError.message);
                return; // Exit the function if cancelled
              }
              
              console.error(`Retry attempt ${retryCount} failed:`, retryError);
              
              // If this was our last retry, throw the error to be caught by the outer catch
              if (retryCount >= maxRetries) {
                throw retryError;
              }
            }
          }
          
          // If we've exited the retry loop and still have cancelled flag, return
          if (cancelledRef.current) {
            return;
          }
        }
      }
      
      // Check if upload was cancelled before completing
      if (cancelledRef.current) {
        return;
      }
      
      // 4. Complete upload
      setProgress(1.0); // Set to 100% (1.0 as decimal)
      await axiosInstance.post(`/api/files/complete-upload`, { fileId });
      
      // All done!
      setIsUploading(false);
      currentFileIdRef.current = null;
      
      // Play success sound
      playSuccessSound();
      
      // Call onUploadComplete callback to update parent component
      // This will refresh file list and user data with updated storage
      onUploadComplete();
      
      toast({
        title: 'Upload Complete',
        description: `${file.name} has been uploaded successfully`,
      });
      
    } catch (error) {
      console.error('Error uploading file:', error);
      resetUploadState();
      currentFileIdRef.current = null;
      
      // Show a more specific error message if available
      let errorMessage = 'There was a problem uploading your file';
      
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return 'Calculating...';
    }
    
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)} minutes`;
    } else {
      return `${(seconds / 3600).toFixed(1)} hours`;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending requests if component unmounts during upload
      if (isUploading && cancelTokenSourcesRef.current.length > 0) {
        cancelledRef.current = true;
        cancelTokenSourcesRef.current.forEach(source => {
          try {
            source.cancel('Component unmounted');
          } catch (err) {
            console.error('Error cancelling request on unmount:', err);
          }
        });
        
        // If we have a fileId, try to clean up on the server
        if (currentFileIdRef.current) {
          axios.post(`${API_URL}/api/files/cancel-upload`, 
            { fileId: currentFileIdRef.current },
            { withCredentials: true }
          ).catch(err => {
            console.error('Failed to cancel upload on unmount:', err);
          });
        }
      }
    };
  }, [isUploading]);

  // Close modal on escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        !isUploading && onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isUploading, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Upload File</h2>
          {!isUploading && (
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {!file ? (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200 ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm font-medium text-gray-700">
              Drag &amp; drop a file here, or click to select a file
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Maximum file size: {formatBytes(storageConfig.maxFileSize)}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
              <FiFile className="h-10 w-10 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {formatBytes(file.size)}
                </p>
              </div>
              {!isUploading && (
                <button 
                  onClick={() => setFile(null)}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-full transition-colors"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {isUploading ? (
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg border">
                <div className="mt-4 text-sm text-gray-600 flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span>{formatBytes(Math.round(progress * file.size))} / {formatBytes(file.size)}</span>
                      <span className="font-semibold">{Math.round(progress * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress * 100}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    {uploadSpeed > 0 && isFinite(uploadSpeed) && !isNaN(uploadSpeed) && (
                      <span className="text-gray-500">{formatBytes(uploadSpeed)}/s</span>
                    )}
                    {timeRemaining && !timeRemaining.includes('NaN') && !timeRemaining.includes('undefined') && (
                      <span className="text-gray-500">{timeRemaining}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <FiCalendar className="mr-2 h-4 w-4 text-gray-500" />
                  Link expires after
                </label>
                <select
                  value={expireDays}
                  onChange={(e) => setExpireDays(Number(e.target.value))}
                  disabled={isUploading}
                  className="block w-full pl-3 pr-10 py-2 text-gray-700 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md transition-colors"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-2">
              {isUploading ? (
                <Button 
                  variant="destructive"
                  onClick={cancelUpload}
                >
                  Cancel Upload
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              )}
              
              <Button 
                onClick={uploadFile}
                disabled={isUploading || !file}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal; 