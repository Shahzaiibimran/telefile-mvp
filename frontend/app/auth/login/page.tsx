"use client";

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiLock, FiUser } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { API_URL } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, loading } = useAuth();
  const { toast } = useToast();
  
  // Check if user is already logged in
  useEffect(() => {
    if (user && !loading) {
      console.log('User already logged in, redirecting to home');
      router.push('/');
    }
  }, [user, loading, router]);
  
  // Check for token in URL (after OAuth redirect)
  useEffect(() => {
    const token = searchParams?.get('token');
    if (token) {
      console.log('Token found in URL, handling login');
      handleLoginWithToken(token);
    }
  }, [searchParams]);
  
  const handleLoginWithToken = async (token: string) => {
    try {
      await login(token);
      router.push('/');
    } catch (error) {
      console.error('Error logging in with token:', error);
      toast({
        title: 'Login Failed',
        description: 'Unable to log in with the provided token',
        variant: 'destructive',
      });
    }
  };
  
  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint with explicit URL
    console.log('Redirecting to Google auth at:', `${API_URL}/api/auth/google`);
    
    // Using window.location for a full page redirect to avoid CORS issues
    window.location.href = `${API_URL}/api/auth/google`;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          TeleFile
        </h1>
        <h2 className="mt-3 text-center text-xl font-medium text-gray-900">
          Sign in to your account
        </h2>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col space-y-4">
            <Button
              onClick={handleGoogleLogin}
              className="py-6 flex justify-center items-center space-x-2 w-full transition-transform hover:scale-[1.02] duration-200"
            >
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 488 512">
                <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
              </svg>
              <span>Sign in with Google</span>
            </Button>
          </div>
          
          <div className="mt-6 flex items-center justify-center">
            <div className="text-sm">
              <p className="text-gray-700 font-medium">
                Secure file sharing with expiring links
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 