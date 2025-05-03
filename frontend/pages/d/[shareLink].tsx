import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function DownloadRedirect() {
  const router = useRouter();
  const { shareLink } = router.query;
  
  useEffect(() => {
    if (router.isReady && shareLink) {
      router.push(`/download/${shareLink}`);
    }
  }, [router.isReady, shareLink, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Spinner className="h-12 w-12" />
        <p className="mt-4 text-gray-700">Redirecting to download page...</p>
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

export function getStaticProps() {
  return {
    props: {},
    revalidate: 60
  };
} 