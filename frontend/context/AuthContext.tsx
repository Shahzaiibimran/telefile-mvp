"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import { isAxiosError } from 'axios';
import { API_URL } from '@/lib/constants';

interface User {
  _id: string;
  name: string;
  email: string;
  storage_used: number;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  recalculateStorage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchTime = useRef<number>(0);
  const DEBOUNCE_INTERVAL = 2000; // 2 seconds minimum between refreshes
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse JWT token to check expiration
  const isTokenExpired = (token: string): boolean => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const { exp } = JSON.parse(jsonPayload);
      // Add a 60-second buffer to prevent edge cases
      return exp * 1000 < Date.now() - 60000;
    } catch (error) {
      console.error('Error parsing JWT:', error);
      // If we can't parse the token, assume it's invalid
      return true;
    }
  };

  // Refresh token at a regular interval
  const setupTokenRefresh = useCallback((currentToken: string) => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    try {
      // If token is already expired, no need to setup refresh
      if (isTokenExpired(currentToken)) {
        console.log('Token already expired, skipping refresh timer');
        return;
      }
      
      // Parse the token to get its expiration time
      const base64Url = currentToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const { exp } = JSON.parse(jsonPayload);
      const expiresAt = exp * 1000; // Convert to milliseconds
      
      // Calculate time until token expires (minus a buffer to refresh early)
      const timeUntilExpiry = expiresAt - Date.now();
      const refreshBuffer = 5 * 60 * 1000; // 5 minutes before expiry
      const timeToRefresh = Math.max(timeUntilExpiry - refreshBuffer, 1000); // At least 1 second
      
      console.log(`Token will be refreshed in ${Math.round(timeToRefresh / 1000 / 60)} minutes`);
      
      // Set up timer to refresh token
      refreshTimerRef.current = setTimeout(() => {
        console.log('Token refresh timer triggered');
        // Don't trigger a full fetchUserData which could cause a refresh loop
        // Instead just silently get a new token in the background
        silentTokenRefresh(currentToken);
      }, timeToRefresh);
    } catch (error) {
      console.error('Error setting up token refresh:', error);
    }
  }, []);

  // Silent token refresh to avoid redirect loops
  const silentTokenRefresh = async (authToken: string) => {
    try {
      console.log('Silent token refresh attempted');
      const response = await axiosInstance.get(`/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      // Get new token but don't trigger a re-render cascade
      if (response.data.token) {
        console.log('Received new token from silent refresh');
        const newToken = response.data.token;
        localStorage.setItem('auth_token', newToken);
        
        // Quietly update token state without triggering other effects
        setToken(newToken);
        
        // Don't trigger a full refresh or setup a new refresh timer immediately
        // This helps prevent refresh loops
        setTimeout(() => {
          setupTokenRefresh(newToken);
        }, 5000); // Wait 5 seconds before setting up the next refresh
      }
    } catch (error) {
      console.error('Silent token refresh failed:', error);
      // Don't log out or redirect on silent refresh failure
      // The next user interaction will handle authentication errors
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      console.log('Found saved token in localStorage');
      
      // Check if token is expired
      if (isTokenExpired(savedToken)) {
        console.log('Saved token is expired, removing it');
        localStorage.removeItem('auth_token');
        setToken(null);
        setLoading(false);
      } else {
        setToken(savedToken);
        fetchUserData(savedToken);
      }
    } else {
      console.log('No token found in localStorage');
      setLoading(false);
    }
  }, []);

  // Fetch user data with token
  const fetchUserData = async (authToken: string) => {
    try {
      setLoading(true);
      console.log('Fetching user data from API...');
      const response = await axiosInstance.get(`/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      console.log('User data fetched successfully');
      // Show complete API response
      console.log('Complete API response:', response.data);
      
      // Explicitly check for admin status and log it
      const userData = response.data.user;
      console.log('Admin status from DB:', userData.is_admin);
      console.log('Admin status type:', typeof userData.is_admin);
      
      // Check if we received a fresh token
      if (response.data.token) {
        console.log('Received new token from API');
        const newToken = response.data.token;
        setToken(newToken);
        localStorage.setItem('auth_token', newToken);
        
        // Setup refreshing for the new token
        setupTokenRefresh(newToken);
      }
      
      // Use the value directly from the database without conversion
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Check if this is a 401 Unauthorized error
      if (isAxiosError(error) && error.response?.status === 401) {
        console.log('Session expired or invalid token - logging out');
        // Clear invalid token
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        // Optionally redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      } else {
        // For other errors, just clear the token and user state
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (newToken: string) => {
    console.log('Login initiated with token');
    if (!newToken || newToken.trim() === '') {
      console.error('Invalid token provided');
      throw new Error('Invalid token');
    }
    
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
    try {
      await fetchUserData(newToken);
      // Setup token refresh on successful login
      setupTokenRefresh(newToken);
      console.log('Login successful');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    
    // Clear any token refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // Refresh user data with debouncing
  const refreshUser = async () => {
    const now = Date.now();
    if (token) {
      // Check if token is expired before trying to use it
      if (isTokenExpired(token)) {
        console.log('Token expired during refresh attempt, logging out');
        logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return;
      }
      
      // Only refresh if we're past the debounce interval
      if (now - lastFetchTime.current > DEBOUNCE_INTERVAL) {
        lastFetchTime.current = now;
        
        try {
          console.log('Refreshing user data...');
          const response = await axiosInstance.get(`/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log('User data refreshed successfully');
          // Show complete API response
          console.log('Complete API response:', response.data);
          
          // Explicitly check for admin status and log it
          const userData = response.data.user;
          
          // Use the value directly from the database without conversion
          setUser(userData);
          
          // Check if we received a fresh token
          if (response.data.token) {
            console.log('Received new token from API');
            const newToken = response.data.token;
            if (newToken !== token) {
              setToken(newToken);
              localStorage.setItem('auth_token', newToken);
              
              // Setup refreshing for the new token (with throttling)
              setTimeout(() => {
                setupTokenRefresh(newToken);
              }, 1000);
            }
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
          // Only handle 401 errors, leave other errors for the caller to handle
          if (isAxiosError(error) && error.response?.status === 401) {
            console.log('Session expired during refresh, logging out');
            logout();
          }
        }
      } else {
        console.log(`Skipping refresh - debounced (last refresh was ${now - lastFetchTime.current}ms ago)`);
      }
    }
  };

  // Recalculate storage used
  const recalculateStorage = async () => {
    if (!token) return;
    
    try {
      console.log('Recalculating storage...');
      await axiosInstance.get(`/api/auth/recalculate-storage`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Refresh user data to get updated storage
      await fetchUserData(token);
    } catch (error) {
      console.error('Error recalculating storage:', error);
    }
  };

  // Set up axios interceptor for authentication
  useEffect(() => {
    // Add a request interceptor to include the token in all requests
    const interceptor = axiosInstance.interceptors.request.use(
      (config) => {
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axiosInstance.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Clear the refresh timer when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    recalculateStorage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 