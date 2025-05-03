"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axiosInstance from '@/lib/axiosConfig';
import { isAxiosError } from 'axios';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';

export default function AdminCheckPage() {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [adminApiResult, setAdminApiResult] = useState<any>(null);
  const [directUserApiResult, setDirectUserApiResult] = useState<any>(null);
  const [authHeaderValue, setAuthHeaderValue] = useState<string>("");
  
  // Test the admin API connection
  const testAdminConnection = async () => {
    setLoading(true);
    try {
      console.log('Testing admin API connection...');
      // Get the token from localStorage to be 100% sure we're using the right one
      const currentToken = localStorage.getItem('auth_token');
      setAuthHeaderValue(`Bearer ${currentToken}`);
      
      // Try to access admin stats
      const response = await axiosInstance.get('/api/admin/stats');
      console.log('Admin API response:', response.data);
      setAdminApiResult({
        success: true,
        data: response.data
      });
      toast({
        title: 'Success',
        description: 'Admin API connection successful',
      });
    } catch (error) {
      console.error('Admin API error:', error);
      
      let errorMsg = 'Unknown error';
      let errorStatus = 'Unknown';
      
      if (isAxiosError(error)) {
        errorMsg = error.response?.data?.message || error.message;
        errorStatus = error.response?.status?.toString() || 'No status';
      }
      
      setAdminApiResult({
        success: false,
        error: errorMsg,
        status: errorStatus
      });
      
      toast({
        title: 'Error',
        description: `Admin API connection failed: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Test the user API connection (non-admin)
  const testUserConnection = async () => {
    setLoading(true);
    try {
      console.log('Testing user API connection...');
      const response = await axiosInstance.get('/api/auth/me');
      console.log('User API response:', response.data);
      setDirectUserApiResult({
        success: true,
        data: response.data.user
      });
      toast({
        title: 'Success',
        description: 'User API connection successful',
      });
    } catch (error) {
      console.error('User API error:', error);
      
      let errorMsg = 'Unknown error';
      let errorStatus = 'Unknown';
      
      if (isAxiosError(error)) {
        errorMsg = error.response?.data?.message || error.message;
        errorStatus = error.response?.status?.toString() || 'No status';
      }
      
      setDirectUserApiResult({
        success: false,
        error: errorMsg,
        status: errorStatus
      });
      
      toast({
        title: 'Error',
        description: `User API connection failed: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Authorization Debug</h1>
        
        {/* User Info */}
        <section className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium mb-4">Current User</h2>
          {user ? (
            <div className="space-y-2">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Is Admin:</strong> {String(user.is_admin)}</p>
              <p><strong>Type of Is Admin:</strong> {typeof user.is_admin}</p>
              <div className="py-2">
                <Button onClick={refreshUser} className="mr-2">
                  Refresh User Data
                </Button>
              </div>
            </div>
          ) : (
            <p>Not logged in</p>
          )}
        </section>
        
        {/* Auth Header */}
        <section className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium mb-4">Authorization Header</h2>
          <p className="mb-4 break-all"><strong>Current Value:</strong> {authHeaderValue || "Not set yet"}</p>
        </section>
        
        {/* API Test Controls */}
        <section className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium mb-4">API Connection Tests</h2>
          <div className="space-x-4 mb-6">
            <Button 
              onClick={testAdminConnection} 
              disabled={loading}
            >
              Test Admin API
            </Button>
            <Button 
              onClick={testUserConnection} 
              disabled={loading}
              variant="outline"
            >
              Test User API
            </Button>
          </div>
        </section>
        
        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin API Test Results */}
          <section className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-medium mb-4">Admin API Results</h2>
            {adminApiResult ? (
              <div>
                <p className="mb-2"><strong>Status:</strong> {adminApiResult.success ? 'Success ✅' : `Failed ❌ (${adminApiResult.status})`}</p>
                {adminApiResult.error && (
                  <p className="mb-2 text-red-500"><strong>Error:</strong> {adminApiResult.error}</p>
                )}
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60 text-xs mt-4">
                  {JSON.stringify(adminApiResult.data || {}, null, 2)}
                </pre>
              </div>
            ) : (
              <p>No test run yet</p>
            )}
          </section>
          
          {/* User API Test Results */}
          <section className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-medium mb-4">User API Results</h2>
            {directUserApiResult ? (
              <div>
                <p className="mb-2"><strong>Status:</strong> {directUserApiResult.success ? 'Success ✅' : `Failed ❌ (${directUserApiResult.status})`}</p>
                {directUserApiResult.error && (
                  <p className="mb-2 text-red-500"><strong>Error:</strong> {directUserApiResult.error}</p>
                )}
                <p className="mb-2"><strong>Is Admin (API):</strong> {String(directUserApiResult.data?.is_admin)}</p>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60 text-xs mt-4">
                  {JSON.stringify(directUserApiResult.data || {}, null, 2)}
                </pre>
              </div>
            ) : (
              <p>No test run yet</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
} 