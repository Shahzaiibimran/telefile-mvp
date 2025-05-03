"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/lib/constants';
import Navbar from '@/components/Navbar';

export default function DebugPage() {
  const { user, token, refreshUser } = useAuth();
  const [directApiData, setDirectApiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const fetchDirectFromApi = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setDirectApiData(response.data);
    } catch (error) {
      console.error('Error fetching direct API data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (token) {
      fetchDirectFromApi();
    }
  }, [token]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">User Debug Information</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-medium mb-4">Auth Context Data</h2>
            {user ? (
              <div className="space-y-2">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user._id}</p>
                <p><strong>Is Admin:</strong> {String(user.is_admin)}</p>
                <p><strong>Type of Is Admin:</strong> {typeof user.is_admin}</p>
                <div className="py-2">
                  <button 
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={refreshUser}
                  >
                    Refresh User Data
                  </button>
                </div>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60 text-xs mt-4">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            ) : (
              <p>Not logged in</p>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-medium mb-4">Direct API Response</h2>
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : directApiData ? (
              <div className="space-y-2">
                <p><strong>Is Admin (API):</strong> {String(directApiData.user?.is_admin)}</p>
                <p><strong>Type of Is Admin (API):</strong> {typeof directApiData.user?.is_admin}</p>
                <div className="py-2">
                  <button 
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={fetchDirectFromApi}
                  >
                    Fetch Direct From API
                  </button>
                </div>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60 text-xs mt-4">
                  {JSON.stringify(directApiData, null, 2)}
                </pre>
              </div>
            ) : (
              <p>No API data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 