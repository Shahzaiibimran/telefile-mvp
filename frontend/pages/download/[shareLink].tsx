import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { formatBytes, formatDate } from '@/lib/utils';
import { FiDownload, FiFile, FiCalendar, FiClock, FiRepeat } from 'react-icons/fi';
import { API_URL } from '@/lib/constants';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface FileData {
  _id: string;
  name: string;
  size: number;
  mime_type: string;
  download_count: number;
  expiry: string;
  created_at: string;
}

export default function DownloadPage() {
  const router = useRouter();
  const { shareLink } = router.query;
  const { toast } = useToast();
  const [file, setFile] = useState<FileData | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Reference for success sound
  const successSoundRef = React.useRef<HTMLAudioElement | null>(null);
  
  // Initialize the audio element
  useEffect(() => {
    const audio = new Audio('/sounds/winner-bell-game-show-91932.mp3');
    audio.preload = 'auto';
    successSoundRef.current = audio;
    
    return () => {
      // Clean up
      if (successSoundRef.current) {
        successSoundRef.current.pause();
        successSoundRef.current = null;
      }
    };
  }, []);
  
  // Function to play success sound
  const playSuccessSound = () => {
    if (successSoundRef.current) {
      // Reset audio to beginning in case it was played before
      successSoundRef.current.currentTime = 0;
      successSoundRef.current.play().catch(err => {
        console.warn('Could not play notification sound:', err);
      });
    }
  };
  
  // Process direct redirects from root level URLs if needed
  useEffect(() => {
    const handleDirectLink = () => {
      // Check if we're being accessed directly via a root-level URL
      if (window.location.pathname === '/') {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#')) {
          const shareId = hash.substring(1);
          if (shareId.match(/^[a-zA-Z0-9]{8,14}$/)) {
            router.push(`/download/${shareId}`);
          }
        }
      }
    };
    
    // Run once on initial load
    if (typeof window !== 'undefined') {
      handleDirectLink();
      
      // Also listen for hashchange events
      window.addEventListener('hashchange', handleDirectLink);
      return () => window.removeEventListener('hashchange', handleDirectLink);
    }
  }, [router]);
  
  useEffect(() => {
    // Check if router is ready and we have a shareLink
    if (!router.isReady) return;
    
    // Extract shareLink from either query or URL
    let actualShareLink = shareLink as string;
    
    // If placeholder, try to get the actual share ID from URL
    if (actualShareLink === 'placeholder') {
      // Get from URL path
      const path = window.location.pathname;
      console.log("Download path:", path);
      
      // Extract from URL if possible - support /download/LINK or /d/LINK format
      const downloadMatch = path.match(/\/download\/([^\/]+)/);
      const shortMatch = path.match(/\/d\/([^\/]+)/);
      const rootMatch = path.match(/^\/([a-zA-Z0-9]{8,14})\/?$/);
      
      if (downloadMatch && downloadMatch[1] && downloadMatch[1] !== 'placeholder') {
        actualShareLink = downloadMatch[1];
        console.log("Extracted shareLink from download URL:", actualShareLink);
      } else if (shortMatch && shortMatch[1] && shortMatch[1] !== 'placeholder') {
        actualShareLink = shortMatch[1];
        console.log("Extracted shareLink from short URL:", actualShareLink);
      } else if (rootMatch && rootMatch[1]) {
        actualShareLink = rootMatch[1];
        console.log("Extracted shareLink from root URL:", actualShareLink);
      } else {
        // Try to get from URL hash
        const hash = window.location.hash;
        if (hash && hash.startsWith('#')) {
          actualShareLink = hash.substring(1);
          console.log("Using hash as shareLink:", actualShareLink);
        }
      }
    }
    
    if (actualShareLink && actualShareLink !== 'placeholder') {
      console.log("Fetching file with link:", actualShareLink);
      fetchFileData(actualShareLink);
    } else {
      setError('Invalid or missing file link. Please check the URL and try again.');
      setIsLoading(false);
    }
  }, [router.isReady, shareLink]);
  
  const fetchFileData = async (link: string) => {
    try {
      setIsLoading(true);
      // Use the provided link
      const response = await axios.get(`${API_URL}/api/files/download/${link}`);
      setFile(response.data.file);
      setDownloadUrls(response.data.downloadUrls);
      setError(null);
    } catch (error) {
      console.error('Error fetching file:', error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data.message) {
          // Common error cases with more user-friendly messages
          const errorMessage = error.response.data.message;
          if (errorMessage === 'File has expired') {
            setError('This file has expired and is no longer available for download.');
          } else if (errorMessage === 'File not found') {
            setError('This file could not be found. The link may be incorrect or the file has been deleted.');
          } else if (errorMessage === 'Some file chunks are missing from storage') {
            setError('This file appears to be incomplete on our servers. Please contact support.');
          } else if (errorMessage === 'File is not fully uploaded yet') {
            setError('This file is still being processed. Please try again in a few moments.');
          } else {
            setError(errorMessage);
          }
        } else {
          setError('Failed to load file information.');
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const startDownload = async () => {
    if (!file || downloadUrls.length === 0) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Increment download count when user actually downloads the file
      await axios.post(`${API_URL}/api/files/increment-download`, { fileId: file._id });
      
      // For small files with one chunk, download directly
      if (downloadUrls.length === 1) {
        try {
          console.log('Starting direct download with URL:', downloadUrls[0].substring(0, 100) + '...');
          
          // Create a link element for more reliable downloads
          const link = document.createElement('a');
          link.href = downloadUrls[0];
          link.download = file.name || 'download';
          link.rel = 'noopener noreferrer';
          
          // Append to body, click, and remove
          document.body.appendChild(link);
          link.click();
          
          // Small delay before removing to ensure click is processed
          setTimeout(() => {
            document.body.removeChild(link);
          }, 100);
          
          // Set a timer to check if download has started
          setTimeout(() => {
            setIsDownloading(false);
            toast({
              title: 'Download Started',
              description: 'If your download doesn\'t begin automatically, please try again.',
              variant: 'default',
            });
            // Play success sound
            playSuccessSound();
          }, 2000);
        } catch (singleFileError) {
          console.error('Error with direct download:', singleFileError);
          toast({
            title: 'Download Error',
            description: 'The download link appears to be invalid. Please try again or contact support.',
            variant: 'destructive',
          });
          setIsDownloading(false);
          throw singleFileError;
        }
        
        return;
      }
      
      // For multiple chunks, download and concatenate
      const chunks: Blob[] = [];
      const totalChunks = downloadUrls.length;
      let failedChunks = 0;
      
      for (let i = 0; i < totalChunks; i++) {
        const url = downloadUrls[i];
        try {
          console.log(`Downloading chunk ${i+1}/${totalChunks}`);
          const response = await axios.get(url, {
            responseType: 'blob',
            onDownloadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const chunkProgress = progressEvent.loaded / progressEvent.total;
                const totalProgress = (i + chunkProgress) / totalChunks;
                setDownloadProgress(Math.min(99, totalProgress * 100));
              }
            },
            // Add longer timeout for larger files
            timeout: 300000 // 5 minutes per chunk for very large files
          });
          
          chunks.push(response.data);
        } catch (chunkError) {
          console.error(`Error downloading chunk ${i+1}:`, chunkError);
          failedChunks++;
          
          // Try one more time with a simple fetch approach
          try {
            console.log(`Retrying chunk ${i+1} with fetch API`);
            const fetchResponse = await fetch(url);
            if (fetchResponse.ok) {
              const blobData = await fetchResponse.blob();
              chunks.push(blobData);
              console.log(`Retry successful for chunk ${i+1}`);
              // Decrement the failed count since we recovered
              failedChunks--;
            } else {
              // Add an empty chunk as placeholder to maintain order
              chunks.push(new Blob([]));
              toast({
                title: `Chunk ${i+1} Failed`,
                description: 'Part of the file could not be downloaded. The file may be incomplete.',
                variant: 'destructive',
              });
            }
          } catch (retryError) {
            console.error(`Retry also failed for chunk ${i+1}:`, retryError);
            // Add an empty chunk as placeholder to maintain order
            chunks.push(new Blob([]));
            toast({
              title: `Chunk ${i+1} Failed`,
              description: 'Part of the file could not be downloaded. The file may be incomplete.',
              variant: 'destructive',
            });
          }
        }
      }
      
      if (failedChunks === totalChunks) {
        throw new Error('All chunks failed to download');
      }
      
      // Combine chunks and trigger download
      const combinedBlob = new Blob(chunks, { type: file.mime_type || 'application/octet-stream' });
      setDownloadProgress(100);
      
      const downloadUrl = URL.createObjectURL(combinedBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name || 'download';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);
        setIsDownloading(false);
        // Play success sound
        playSuccessSound();
      }, 100);
      
    } catch (error) {
      console.error('Download error:', error);
      setIsDownloading(false);
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download file. Please try again later.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-700 font-medium">Loading file information...</p>
          </div>
        ) : error ? (
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">File Unavailable</h1>
            <p className="text-gray-700 mb-6">{error}</p>
            <Button 
              onClick={() => window.location.href = '/'} 
              variant="secondary"
              className="w-full"
            >
              Go to Homepage
            </Button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-primary/10 rounded-full mr-4">
                <FiFile className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{file?.name}</h1>
                <p className="text-sm text-gray-700 mt-1">{formatBytes(file?.size || 0)}</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8 bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <FiClock className="h-4 w-4 text-gray-500 mr-3" />
                <span className="text-gray-700 text-sm font-medium">Uploaded:</span>
                <span className="text-gray-900 text-sm ml-auto">{file ? formatDate(file.created_at) : ''}</span>
              </div>
              <div className="flex items-center">
                <FiRepeat className="h-4 w-4 text-gray-500 mr-3" />
                <span className="text-gray-700 text-sm font-medium">Downloads:</span>
                <span className="text-gray-900 text-sm ml-auto">{file?.download_count}</span>
              </div>
              <div className="flex items-center">
                <FiCalendar className="h-4 w-4 text-gray-500 mr-3" />
                <span className="text-gray-700 text-sm font-medium">Expires:</span>
                <span className="text-gray-900 text-sm ml-auto">{file ? formatDate(file.expiry) : ''}</span>
              </div>
            </div>
            
            {isDownloading ? (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner relative">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300 ease-out progress-shimmer relative"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center text-gray-700 font-medium">
                  Downloading... {Math.round(downloadProgress)}%
                </p>
              </div>
            ) : (
              <Button 
                onClick={startDownload} 
                className="w-full py-6"
              >
                <div className="flex items-center justify-center space-x-3">
                  <FiDownload className="h-5 w-5" />
                  <span className="font-medium text-lg">Download File</span>
                </div>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Update getStaticPaths to generate only the placeholder
export function getStaticPaths() {
  return {
    paths: [
      { params: { shareLink: 'placeholder' } }
    ],
    fallback: 'blocking'  // Change to blocking for better SEO and user experience
  };
}

// Add getStaticProps
export function getStaticProps() {
  return {
    props: {},
    // Add revalidation to ensure the page is up-to-date
    revalidate: 60 // Revalidate every 60 seconds
  };
} 