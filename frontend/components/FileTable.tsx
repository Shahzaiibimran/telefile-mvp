"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FiCopy, FiDownload, FiTrash2, FiUpload, FiLink, FiAlertTriangle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { formatBytes, formatDate, timeRemaining } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface File {
  _id: string;
  name: string;
  size: number;
  share_link: string;
  download_count: number;
  expiry: string;
  created_at: string;
}

interface FileTableProps {
  files: File[];
  isLoading: boolean;
  onDelete: (fileId: string) => void;
  onUpload: () => void;
}

const FileTable: React.FC<FileTableProps> = ({ files, isLoading, onDelete, onUpload }) => {
  const { toast } = useToast();
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate pagination values
  const totalPages = Math.ceil(files.length / itemsPerPage);
  const indexOfLastFile = currentPage * itemsPerPage;
  const indexOfFirstFile = indexOfLastFile - itemsPerPage;
  const currentFiles = files.slice(indexOfFirstFile, indexOfLastFile);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const copyShareLink = (shareLink: string) => {
    // Use shorter /d/ format for better sharing
    const shareUrl = `${window.location.origin}/d/${shareLink}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  const handleDeleteClick = (fileId: string) => {
    setFileToDelete(fileId);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      onDelete(fileToDelete);
      setFileToDelete(null);
    }
  };

  const cancelDelete = () => {
    setFileToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-40 bg-white rounded-lg shadow-sm border p-8 animate-pulse">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600 font-medium">Loading your files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center bg-white rounded-lg shadow-sm border p-8 transition-all duration-300 ease-in-out">
        <p className="text-gray-600 mb-6 font-medium">You haven&apos;t uploaded any files yet</p>
        <Button 
          onClick={onUpload}
          className="flex items-center space-x-2 px-6 py-6"
        >
          <FiUpload className="w-6 h-6" />
          <span className="font-medium">Upload Files</span>
        </Button>
      </div>
    );
  }

  return (
    <>
      {fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-200">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-center mb-4 text-amber-500">
              <FiAlertTriangle className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-medium text-center mb-2">Confirm File Deletion</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete this file? This action will permanently remove the file from storage and cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <Button 
                variant="outline" 
                onClick={cancelDelete}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border shadow-sm bg-gray-50 transition-all duration-300 ease-in-out">
        <table className="min-w-full divide-y divide-gray-200" key={files.length}>
          <thead className="bg-gray-100">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                File Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Size
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Uploaded
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Expires
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Downloads
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Share Link
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-50 divide-y divide-gray-200">
            {currentFiles.map((file, index) => (
              <tr key={file._id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors duration-150`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <span className="inline-block max-w-[250px] truncate" title={file.name}>
                    {file.name.length > 30 ? `${file.name.substring(0, 30)}...` : file.name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {formatBytes(file.size)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {formatDate(file.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {timeRemaining(file.expiry)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {file.download_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                      <FiLink className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="break-all">
                      {`${window.location.origin}/d/${file.share_link}`}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => copyShareLink(file.share_link)}
                      title="Copy Share Link"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <FiCopy className="h-4 w-4 text-blue-600" />
                      </div>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-green-600 hover:text-green-900"
                      onClick={() => window.open(`/d/${file.share_link}`, '_blank')}
                      title="Download File"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <FiDownload className="h-4 w-4 text-green-600" />
                      </div>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteClick(file._id)}
                      title="Delete File"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <FiTrash2 className="h-4 w-4 text-red-600" />
                      </div>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstFile + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastFile, files.length)}</span> of{' '}
                  <span className="font-medium">{files.length}</span> files
                </p>
              </div>
              <div>
                <nav className="inline-flex rounded-md shadow-sm" aria-label="Pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-px rounded-l-md !rounded-r-none"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Previous</span>
                    <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </Button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="mx-px !rounded-none"
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-px !rounded-l-none rounded-r-md"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Next</span>
                    <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FileTable; 