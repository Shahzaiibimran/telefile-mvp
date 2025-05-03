"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axiosConfig';
import { isAxiosError } from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { formatBytes, formatDate } from '@/lib/utils';
import { FiUser, FiUsers, FiFileText, FiHardDrive, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { API_URL } from '@/lib/constants';

interface User {
  _id: string;
  name: string;
  email: string;
  storage_used: number;
  is_admin?: boolean;
  created_at: string;
}

interface SystemStats {
  totalUsers: number;
  totalFiles: number;
  totalChunks: number;
  totalStorage: number;
  recentUsers: number;
  recentFiles: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user: currentUser, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/auth/login');
      } else if (!currentUser.is_admin) {
        console.log('User data from auth context:', currentUser);
        console.log('Admin check failed, user.is_admin =', currentUser.is_admin);
        console.log('Type of user.is_admin =', typeof currentUser.is_admin);
        
        router.push('/');
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access the admin dashboard',
          variant: 'destructive',
        });
      } else {
        console.log('Admin access granted, user.is_admin =', currentUser.is_admin);
        console.log('Type of user.is_admin =', typeof currentUser.is_admin);
        fetchData();
      }
    }
  }, [currentUser, loading, router]);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching admin data with auth token...');
      
      // Fetch system stats
      const statsResponse = await axiosInstance.get(`/api/admin/stats`);
      setStats(statsResponse.data);
      
      // Fetch users
      const usersResponse = await axiosInstance.get(`/api/admin/users`);
      
      // Log the full user data for debugging
      console.log('Users data from API:', usersResponse.data);
      
      // Make sure we're getting the is_admin field
      const users = usersResponse.data.users || [];
      users.forEach((user: User) => {
        console.log(`User ${user.email}: is_admin = ${user.is_admin}`);
      });
      
      setUsers(users);
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
      
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
          router.push('/auth/login');
        } else if (error.response?.status === 403) {
          toast({
            title: 'Access Denied',
            description: 'You do not have admin privileges',
            variant: 'destructive',
          });
          router.push('/');
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load admin dashboard data',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load admin dashboard data',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and all their files? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/api/admin/users/${userId}`);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };
  
  const promoteToAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to make this user an admin? This will give them full access to all admin features.')) {
      return;
    }
    
    try {
      const response = await axiosInstance.post(`/api/admin/users/${userId}/promote-admin`, {});
      
      console.log('Promotion response:', response.data);
      
      // Update the user in the local state directly for immediate UI update
      setUsers(prev => prev.map(user => 
        user._id === userId 
          ? { ...user, is_admin: true } 
          : user
      ));
      
      toast({
        title: 'Success',
        description: 'User promoted to admin successfully',
      });
      
      // Refresh the entire data to ensure database consistency
      fetchData();
    } catch (error) {
      console.error('Error promoting user to admin:', error);
      
      let errorMessage = 'Failed to promote user to admin';
      if (isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        console.error('Server error response:', error.response.data);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };
  
  const demoteFromAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to remove admin privileges from this user? They will no longer have access to admin features.')) {
      return;
    }
    
    try {
      const response = await axiosInstance.post(`/api/admin/users/${userId}/demote-admin`, {});
      
      console.log('Demotion response:', response.data);
      
      // Update the user in the local state directly for immediate UI update
      setUsers(prev => prev.map(user => 
        user._id === userId 
          ? { ...user, is_admin: false } 
          : user
      ));
      
      toast({
        title: 'Success',
        description: 'User demoted to regular user successfully',
      });
      
      // Refresh the entire data to ensure database consistency
      fetchData();
    } catch (error) {
      console.error('Error demoting user from admin:', error);
      
      let errorMessage = 'Failed to demote user from admin';
      if (isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        console.error('Server error response:', error.response.data);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };
  
  const renderStatsCards = () => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <FiUsers className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500">{stats.recentUsers} new in last 7 days</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center">
          <div className="bg-green-100 p-3 rounded-full mr-4">
            <FiFileText className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Files</p>
            <p className="text-2xl font-bold">{stats.totalFiles}</p>
            <p className="text-xs text-gray-500">{stats.recentFiles} new in last 7 days</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center">
          <div className="bg-purple-100 p-3 rounded-full mr-4">
            <FiHardDrive className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Storage Used</p>
            <p className="text-2xl font-bold">{formatBytes(stats.totalStorage)}</p>
            <p className="text-xs text-gray-500">{stats.totalChunks} file chunks</p>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
        {/* Admin Tools */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium mb-2">Admin Tools</h2>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={fetchData}
              className="flex items-center gap-2"
            >
              <FiRefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/refresh')}
              className="flex items-center gap-2"
            >
              <FiRefreshCw className="h-4 w-4" />
              Reset Session
            </Button>
            <p className="text-xs text-gray-500 my-auto">
              {currentUser?.is_admin ? "✅ Admin access confirmed" : "❌ Admin permissions required"}
            </p>
          </div>
        </div>
        
        {renderStatsCards()}
        
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <h2 className="p-4 border-b font-medium">Users</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storage Used
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <FiUser className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{userItem.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userItem.is_admin ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatBytes(userItem.storage_used)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(userItem.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {!userItem.is_admin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => promoteToAdmin(userItem._id)}
                          >
                            Make Admin
                          </Button>
                        )}
                        {userItem.is_admin && userItem._id !== currentUser?._id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-600 hover:text-orange-900"
                            onClick={() => demoteFromAdmin(userItem._id)}
                          >
                            Remove Admin
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteUser(userItem._id)}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 