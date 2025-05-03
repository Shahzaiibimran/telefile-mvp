import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function Custom404() {
  const router = useRouter();
  const [path, setPath] = useState('');
  const [redirectTarget, setRedirectTarget] = useState('');
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Get the current URL path
    const pathname = window.location.pathname;
    setPath(pathname);
    
    // Logic to determine redirect target
    if (pathname.includes('/download/')) {
      setRedirectTarget('/download/placeholder/');
      // Use immediate redirect to avoid Next.js router issues
      window.location.href = '/download/placeholder/';
    } else if (pathname.match(/\/[a-zA-Z0-9]{10}$/)) {
      setRedirectTarget('/share/placeholder/');
      // Use immediate redirect to avoid Next.js router issues
      window.location.href = '/share/placeholder/';
    }
  }, []);
  
  // Show a simple loading state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Spinner size="lg" />
      <h1 className="mt-4 text-xl font-bold">Redirecting...</h1>
      <p className="mt-2 text-sm text-gray-500">From: {path}</p>
      {redirectTarget && (
        <p className="mt-1 text-sm text-gray-500">To: {redirectTarget}</p>
      )}
      <p className="mt-4">
        If you're not redirected, 
        <a href="/" className="text-blue-500 hover:underline"> go to homepage</a>
      </p>
    </div>
  );
} 