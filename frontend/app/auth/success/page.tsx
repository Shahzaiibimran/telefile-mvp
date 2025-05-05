"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loginProcessed, setLoginProcessed] = useState(false);
  
  useEffect(() => {
    const token = searchParams?.get('token') || null;
    console.log('Auth success page loaded, token:', token ? 'Token present' : 'No token');
    
    if (loginProcessed) return;
    
    if (token) {
      handleLogin(token);
    } else {
      toast({
        title: "Authentication Failed",
        description: "No authentication token received.",
        variant: "destructive",
      });
      router.push('/auth/login');
    }
  }, [searchParams, loginProcessed]);
  
  const handleLogin = async (token: string) => {
    try {
      setLoginProcessed(true);
      console.log('Attempting to login with token');
      await login(token);
      console.log('Login successful, redirecting to home');
      toast({
        title: "Authentication Successful",
        description: "You have been successfully logged in.",
      });
      router.replace('/');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Authentication Failed",
        description: "Failed to log in with the provided token.",
        variant: "destructive",
      });
      router.push('/auth/login');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
        <p>Please wait while we complete your login.</p>
      </div>
    </div>
  );
} 