import axios from 'axios';
import { API_URL } from './constants';

// Create a custom instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Keep track of the original request to possibly retry it
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Setup request interceptor to consistently apply token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Setup response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log errors to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error);
    }
    
    // Only handle 401 errors that aren't from the auth/me endpoint to avoid loops
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/api/auth/me')) {
      
      // Check if we're already refreshing to avoid multiple refreshes
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      // Clear stored token if we get a 401
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      
      // We could implement token refresh logic here if the backend supports it
      // For now, we'll just reject and let the app handle the logout process
      
      isRefreshing = false;
      processQueue(error);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 