"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiFile, FiDownload, FiTrash, FiCopy, FiEye, FiCalendar } from 'react-icons/fi';
import { formatBytes, formatDistanceToNow } from '@/lib/utils';
import { useToast } from './ui/use-toast';
import { Button } from './ui/button';
import axios from 'axios';
import axiosInstance from '@/lib/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/constants';

interface File {
  _id: string;
  filename: string;
  size: number;
  uploadDate: string;
  expiresAt: string;
  owner: string;
}

export default function FileList() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    fetchFiles();
  }, []);

  const refreshFileList = () => {
    fetchFiles();
  };

  // Function to handle file deletion
  const handleDelete = async (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file? This action will permanently remove the file from storage.')) {
      try {
        setDeletingFileId(fileId);
        const response = await axiosInstance.delete(`/api/files/${fileId}`);
        
        if (response.status === 200) {
          refreshFileList();
          // Also refresh user data to update storage used
          refreshUser();
          toast({
            title: 'File Deleted',
            description: 'The file has been successfully deleted from storage.'
          });
        } else {
          throw new Error('Unexpected response status');
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete the file from storage. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setDeletingFileId(null);
      }
    }
  };

  // Function to copy file link to clipboard
  const handleCopyLink = async (fileId: string) => {
    try {
      const response = await axiosInstance.get(`/api/files/${fileId}/link`);
      const fileLink = response.data.downloadUrl;
      
      await navigator.clipboard.writeText(fileLink);
      toast({
        title: 'Link Copied',
        description: 'File link has been copied to clipboard.'
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy the file link.',
        variant: 'destructive'
      });
    }
  };

  // Function to fetch the file list from the server
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/files/user-files`);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your files.',
        variant: 'destructive'
      });
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex justify-center p-8">Loading your files...</div>
      ) : files.length === 0 ? (
        <div className="text-center p-8">
          <p className="mb-4">You haven't uploaded any files yet.</p>
          <Button onClick={() => router.push('/upload')}>Upload a File</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <div key={file._id} className="p-4 border rounded-lg shadow-sm flex justify-between items-center">
              <div className="flex items-center">
                <FiFile className="mr-3 text-blue-500" size={24} />
                <div>
                  <h3 className="font-medium">{file.filename}</h3>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FiCalendar className="text-gray-400" size={14} />
                      {formatDistanceToNow(new Date(file.uploadDate))}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleCopyLink(file._id)}>
                  <FiCopy className="mr-2" size={16} />
                  Copy Link
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(file._id)} disabled={deletingFileId === file._id}>
                  <FiTrash className="mr-2" size={16} />
                  {deletingFileId === file._id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 