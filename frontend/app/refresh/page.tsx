"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function RefreshSession() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const refresh = async () => {
      try {
        // First logout to clear current session state
        logout();
        
        // Show message
        toast({
          title: 'Session Refreshed',
          description: 'Please log in again to apply admin changes',
        });
        
        // Redirect to login
        setTimeout(() => {
          router.push('/auth/login');
        }, 1500);
      } catch (error) {
        console.error('Error refreshing session:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh session',
          variant: 'destructive',
        });
      }
    };

    refresh();
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
        <h1 className="text-xl font-bold mb-2">Refreshing Your Session</h1>
        <p className="text-gray-600 mb-4">
          We're refreshing your session to apply admin changes.
        </p>
        <p className="text-gray-500 text-sm">
          You'll be redirected to the login page in a moment.
        </p>
      </div>
    </div>
  );
} 