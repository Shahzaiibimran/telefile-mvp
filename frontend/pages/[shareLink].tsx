import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function ShareLinkRedirect() {
  const router = useRouter();
  const { shareLink } = router.query;
  
  useEffect(() => {
    if (router.isReady && shareLink) {
      // Validate that it looks like a share link (alphanumeric, typically 10-12 chars)
      if (typeof shareLink === 'string' && /^[a-zA-Z0-9]{8,14}$/.test(shareLink)) {
        router.push(`/download/${shareLink}`);
      } else {
        // If it doesn't look like a share link, redirect to home
        router.push('/');
      }
    }
  }, [router.isReady, shareLink, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Spinner className="h-12 w-12" />
        <p className="mt-4 text-gray-700">Redirecting...</p>
      </div>
    </div>
  );
}

export function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}

export function getStaticProps({ params }: { params: { shareLink: string } }) {
  // Exclude certain paths that might be actual pages
  const excludedPaths = ['login', 'register', 'dashboard', 'upload', 'settings', 'about'];
  
  if (excludedPaths.includes(params.shareLink)) {
    return {
      notFound: true // Let Next.js show 404 for these paths
    };
  }
  
  return {
    props: {},
    revalidate: 60
  };
} 