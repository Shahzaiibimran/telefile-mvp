/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  // Enable trailingSlash to help with routing
  trailingSlash: true,
};

// Only apply static export configuration when building for production
// This prevents CSS issues during development
if (process.env.NODE_ENV === 'production') {
  nextConfig.output = 'export';
  
  // Define specific static paths to generate
  // nextConfig.exportPathMap = async function (defaultPathMap) {
  //   return {
  //     // Core routes
  //     '/': { page: '/' },
      
  //     // Download placeholder - will be used for all downloads
  //     '/download/placeholder/': { 
  //       page: '/download/[shareLink]', 
  //       query: { shareLink: 'placeholder' } 
  //     },
      
  //     // Short download path placeholder - for /d/[shareLink]
  //     '/d/placeholder/': { 
  //       page: '/d/[shareLink]', 
  //       query: { shareLink: 'placeholder' } 
  //     },
      
  //     // Share placeholder - will be used for all share links
  //     '/share/placeholder/': { 
  //       page: '/share/[shareLink]', 
  //       query: { shareLink: 'placeholder' } 
  //     },
  //   };
  // };
}

// These rewrites will only apply during development
if (process.env.NODE_ENV !== 'production') {
  nextConfig.rewrites = async () => {
    return [
      {
        source: '/d/:shareLink',
        destination: '/download/:shareLink',
      },
      {
        source: '/:shareLink(^(?!api|download|d|share|login|register|dashboard|upload|settings|about).*)',
        destination: '/download/:shareLink',
      },
    ];
  };
}

module.exports = nextConfig; 