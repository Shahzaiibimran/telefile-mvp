// Improved post-build script to handle dynamic routes in static exports
const fs = require('fs');
const path = require('path');

console.log('Running post-build script to fix 404 errors...');

// Path to the output directory (where Next.js built the static files)
const outDir = path.join(__dirname, '../out');

// Function to create a directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Create a simple HTML redirect file
function createRedirectHtml(targetPath) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <meta http-equiv="refresh" content="0;URL='${targetPath}'">
</head>
<body>
  <h1>Redirecting to ${targetPath}...</h1>
  <script>window.location.href = "${targetPath}";</script>
</body>
</html>`;
}

// Create a direct entry point for downloads
const downloadDir = path.join(outDir, 'download');
ensureDirectoryExists(downloadDir);

// Create the placeholder download directory that will handle all share links
console.log('Creating download route handler...');

// Create a directory for an example download
const exampleDownload = path.join(downloadDir, 'example');
ensureDirectoryExists(exampleDownload);

// Create index.html in the download/example directory pointing to the placeholder
const exampleHtmlPath = path.join(exampleDownload, 'index.html');
const downloadRedirect = createRedirectHtml('/download/placeholder');
fs.writeFileSync(exampleHtmlPath, downloadRedirect);
console.log(`Created download example: ${exampleHtmlPath}`);

// Create a 404.html in the download directory that redirects to placeholder
const download404Path = path.join(downloadDir, '404.html');
fs.writeFileSync(download404Path, downloadRedirect);
console.log(`Created download 404 handler: ${download404Path}`);

// Create a direct entry point for share links at root level
console.log('Creating share link handlers...');

// Create an example share link
const exampleSharePath = path.join(outDir, 'ABC1234567.html');
const shareRedirect = createRedirectHtml('/share/placeholder');
fs.writeFileSync(exampleSharePath, shareRedirect);
console.log(`Created example share link: ${exampleSharePath}`);

// Create a root 404.html that helps catch all dynamic routes
const root404Path = path.join(outDir, '404.html');
const root404Content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    // Get the path and determine where to redirect
    var path = window.location.pathname;
    console.log("404 handler for path:", path);
    
    if (path.includes('/download/')) {
      window.location.href = "/download/placeholder";
    } else if (path.match(/\\/[a-zA-Z0-9]{10}$/)) {
      // For share links - 10 character pattern
      window.location.href = "/share/placeholder";
    } else {
      // Default to home
      window.location.href = "/";
    }
  </script>
</head>
<body>
  <div style="display: flex; height: 100vh; justify-content: center; align-items: center; flex-direction: column;">
    <h1>Redirecting...</h1>
    <p>If you're not redirected automatically, <a href="/">click here to go to the homepage</a>.</p>
  </div>
</body>
</html>`;

fs.writeFileSync(root404Path, root404Content);
console.log(`Created root 404 handler: ${root404Path}`);

console.log('Post-build fixes completed! 404 errors should now be resolved.'); 