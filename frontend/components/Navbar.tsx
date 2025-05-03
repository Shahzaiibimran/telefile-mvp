"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { FiUpload, FiUser, FiLogOut, FiHome, FiHardDrive, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { formatBytes, formatStorageUsage } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const Navbar: React.FC = () => {
  const { user, logout, recalculateStorage } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  
  // Utility functions
  // Generate initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    return user.name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Calculate storage usage percentage for progress bar
  const getStoragePercentage = () => {
    if (!user) return 0;
    // Total storage is 20GB in bytes
    const totalStorage = 20 * 1024 * 1024 * 1024;
    return Math.min(100, (user.storage_used / totalStorage) * 100);
  };
  
  // Handle refresh storage click
  const handleRefreshStorage = async () => {
    try {
      await recalculateStorage();
      toast({
        title: 'Storage Updated',
        description: 'Your storage usage has been recalculated.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Unable to update storage usage.',
        variant: 'destructive',
      });
    }
  };
  
  // Recalculate storage when component mounts
  useEffect(() => {
    if (user) {
      recalculateStorage().catch(err => {
        console.error('Failed to recalculate storage on mount:', err);
      });
    }
  }, []);
  
  // Skip rendering navbar on login pages, but show simplified navbar on download pages
  if (pathname === '/auth/login') {
    return null;
  }

  // Show simplified navbar for public download pages
  if (pathname.startsWith('/download') || pathname.startsWith('/d/')) {
    return (
      <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-primary transition-colors">
              TeleFile
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-xs">
                  {getUserInitials()}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={logout}
                  title="Logout"
                  className="text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <FiLogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                >
                  <FiUser className="w-4 h-4" />
                  <span>Login</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b shadow-md">
      <div className="container flex items-center justify-between h-16 px-4 mx-auto">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-primary transition-colors">
            TeleFile
          </Link>
          
          {user && (
            <nav className="hidden md:flex space-x-4">
              <Link 
                href="/" 
                className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                  pathname === '/' 
                    ? 'text-primary font-semibold' 
                    : 'text-gray-700 hover:text-primary'
                }`}
              >
                <FiHome className="w-4 h-4" />
                <span>Home</span>
              </Link>
              
              {user.is_admin && (
                <Link 
                  href="/admin" 
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                    pathname.startsWith('/admin') 
                      ? 'text-primary font-semibold' 
                      : 'text-gray-700 hover:text-primary'
                  }`}
                >
                  <FiUser className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>
          )}
        </div>
        
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              {/* Storage usage info */}
              <div className="flex items-center text-sm text-gray-700 mr-1">
                <FiHardDrive className="w-4 h-4 mr-1 text-gray-500" />
                <span className="text-xs font-medium">
                  {formatStorageUsage(user.storage_used)}
                </span>
                <div className="ml-2 w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" 
                    style={{ width: `${getStoragePercentage()}%` }}
                  ></div>
                </div>
                <button
                  onClick={handleRefreshStorage}
                  className="ml-1 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                  title="Refresh storage calculation"
                >
                  <FiRefreshCw className="w-3 h-3" />
                </button>
              </div>
              
              {/* User avatar and name */}
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-xs mr-2">
                  {getUserInitials()}
                </div>
                <span className="font-medium text-sm text-gray-700">{user.name}</span>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              title="Logout"
              className="text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button 
                variant="default" 
                className="flex items-center space-x-2 transition-transform hover:scale-[1.02] duration-200"
              >
                <FiUser className="w-4 h-4" />
                <span>Login</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar; 