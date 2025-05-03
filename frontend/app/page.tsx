"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import FileTable from '@/components/FileTable';
import UploadModal from '@/components/UploadModal';
import { FiPlus, FiUpload, FiRefreshCw } from 'react-icons/fi';
import axiosInstance from '@/lib/axiosConfig';
import { isAxiosError } from 'axios';
import { API_URL } from '@/lib/constants';

export default function Home() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Use memoized fetchFiles to prevent recreation on every render
  const fetchFiles = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      console.log('Fetching user files...');
      const response = await axiosInstance.get(`/api/files/user-files`);
      console.log('Files fetched successfully:', response.data);
      
      if (response.data && Array.isArray(response.data.files)) {
        // Get current file count before update
        const prevFileCount = files.length;
        
        // Update files with new data
        setFiles(response.data.files);
        
        // Calculate if files changed based on count
        const filesChanged = prevFileCount !== response.data.files.length;
        
        // Always refresh user data after successful upload 
        // to ensure storage metrics are up to date
        if (filesChanged) {
          console.log('File count changed, refreshing user data');
          await refreshUser();
        }
      } else {
        console.error('Invalid response format:', response.data);
        setFiles([]);
        toast({
          title: 'Error',
          description: 'Received invalid file data format',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
      
      // Handle API errors
      if (isAxiosError(error)) {
        const status = error.response?.status;
        
        if (status === 401) {
          console.log('Authentication error - redirecting to login');
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
          
          // Refresh user context (will handle logout if needed)
          await refreshUser();
          
          // Redirect to login after a short delay
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login';
            }
          }, 1500);
        } else if (status === 403) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access these files.',
            variant: 'destructive',
          });
        } else if (status && status >= 500) {
          toast({
            title: 'Server Error',
            description: 'The server encountered an error. Please try again later.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: error.response?.data?.message || 'Failed to load your files. Please try again.',
            variant: 'destructive',
          });
        }
      } else {
        // For network or other errors
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to the server. Please check your internet connection.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      setInitialLoad(false);
    }
  }, [user, toast, refreshUser, files.length]);

  // Initial load effect - only run when auth state changes
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchFiles();
      } else {
        setInitialLoad(false);
      }
    }
  }, [authLoading, user, fetchFiles]);

  const handleUploadComplete = useCallback(async () => {
    console.log('Upload complete - refreshing file list');
    setShowUploadModal(false);
    
    // Give backend a moment to finalize the upload
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Always need to fetch files after upload completes because storage changed
    try {
      setIsLoading(true);
      await fetchFiles(); // fetchFiles already includes conditional refreshUser
      console.log('Files refreshed after upload');
    } catch (error) {
      console.error('Error refreshing files after upload:', error);
    } finally {
      setIsLoading(false);
    }
    
    toast({
      title: 'Success',
      description: 'File uploaded successfully',
    });
  }, [fetchFiles, toast]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      setIsLoading(true);
      await axiosInstance.delete(`/api/files/${fileId}`);
      await fetchFiles();
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, [fetchFiles, toast]);

  // Loading state combines both auth loading and initial file loading
  const isPageLoading = authLoading || (initialLoad && user);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 flex-grow">
        {!user && !authLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to TeleFile</h1>
            <p className="mb-6 max-w-md">
              Secure file sharing with expiring links. 
              Login to upload and manage your files.
            </p>
            <Link href="/auth/login">
              <Button 
                className="w-[100px] h-[100px] rounded-full flex items-center justify-center transition-transform hover:scale-[1.04] duration-200 shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600"
                aria-label="Get Started"
                title="Login to Get Started"
              >
                <FiPlus className="w-10 h-10 text-white" />
              </Button>
            </Link>
          </div>
        ) : isPageLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-700">Loading your files...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-center mb-3">
              <h1 className="text-2xl font-bold mb-2 md:mb-0">My Files</h1>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchFiles}
                disabled={isLoading}
                className="transition-all duration-300 flex items-center gap-2"
              >
                <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
            
            <FileTable 
              key={files.length} // Force re-render when files change
              files={files} 
              isLoading={isLoading} 
              onDelete={handleDelete}
              onUpload={() => setShowUploadModal(true)}
            />

            {user && (
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="fixed bottom-8 right-8 w-[80px] h-[80px] rounded-full shadow-lg flex items-center justify-center z-10"
                aria-label="Upload File"
                disabled={isLoading}
              >
                <FiPlus className="w-8 h-8 text-white" />
              </Button>
            )}
          </>
        )}
      </div>

      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)} 
          onUploadComplete={handleUploadComplete}
        />
      )}
    </main>
  );
}
