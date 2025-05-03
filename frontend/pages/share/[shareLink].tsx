import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatBytes, formatDate } from '@/lib/utils';
import { FiFile, FiDownload, FiClock, FiRepeat, FiCalendar } from 'react-icons/fi';
import { API_URL } from '@/lib/constants';
import Navbar from '@/components/Navbar';
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

export default function DirectSharePage() {
  const router = useRouter();
  const { shareLink } = router.query;
  const { toast } = useToast();
  const [file, setFile] = useState<FileData | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  useEffect(() => {
    // Check if router is ready and we have a shareLink
    if (!router.isReady) return;
    
    // Extract shareLink from either query or URL
    let actualShareLink = shareLink;
    
    // If placeholder, try to get the actual share ID from URL
    if (actualShareLink === 'placeholder') {
      // Get from URL path
      const path = window.location.pathname;
      console.log("Share path:", path);
      
      // Extract from URL if possible
      const match = path.match(/\/share\/([^\/]+)/);
      if (match && match[1] && match[1] !== 'placeholder') {
        actualShareLink = match[1];
        console.log("Extracted shareLink from URL:", actualShareLink);
      } else {
        // Try to get from URL hash
        const hash = window.location.hash;
        if (hash && hash.startsWith('#')) {
          actualShareLink = hash.substring(1);
          console.log("Using hash as shareLink:", actualShareLink);
        } else {
          // Try direct route pattern
          const directMatch = window.location.pathname.match(/\/([a-zA-Z0-9]{10})$/);
          if (directMatch && directMatch[1]) {
            actualShareLink = directMatch[1];
            console.log("Using direct path as shareLink:", actualShareLink);
          }
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
        if (error.response.status === 400 && error.response.data.message === 'File has expired') {
          setError('This file has expired and is no longer available for download.');
        } else if (error.response.data.message) {
          setError(error.response.data.message);
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
        const link = document.createElement('a');
        link.href = downloadUrls[0];
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsDownloading(false);
        return;
      }
      
      // For multiple chunks, download and concatenate
      const chunks: Blob[] = [];
      const totalChunks = downloadUrls.length;
      
      for (let i = 0; i < totalChunks; i++) {
        const url = downloadUrls[i];
        const response = await axios.get(url, {
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const chunkProgress = progressEvent.loaded / progressEvent.total;
              const totalProgress = (i + chunkProgress) / totalChunks;
              setDownloadProgress(Math.min(99, totalProgress * 100));
            }
          }
        });
        
        chunks.push(response.data);
      }
      
      // Combine chunks and trigger download
      const combinedBlob = new Blob(chunks, { type: file.mime_type });
      setDownloadProgress(100);
      
      const downloadUrl = URL.createObjectURL(combinedBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Download Failed',
        description: 'There was a problem downloading the file',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
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
              className="transition-transform hover:scale-[1.02] duration-200"
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
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-300 ease-out"
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
                className="w-full py-6 flex items-center justify-center space-x-2 transition-transform hover:scale-[1.02] duration-200"
              >
                <FiDownload className="h-5 w-5" />
                <span className="font-medium">Download File</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// This defines all paths that will be pre-rendered at build time
export function getStaticPaths() {
  return {
    paths: [
      { params: { shareLink: 'placeholder' } }
    ],
    fallback: false
  };
}

// This function runs at build time
export function getStaticProps() {
  return {
    props: {} // Empty props since the client component will handle fetching
  };
} 