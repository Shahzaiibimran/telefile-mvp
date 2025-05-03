// Simple static site routing handler
(function() {
  // Get URL path and handle dynamic routes
  var path = window.location.pathname;
  
  console.log("Client routing for path:", path);
  
  // Only redirect if needed
  if (path.includes('/download/') && !path.includes('/download/placeholder')) {
    console.log("Redirecting download path to placeholder");
    window.location.replace('/download/placeholder/');
  } 
  else if (path.match(/\/[a-zA-Z0-9]{10}$/) && !path.includes('/share/placeholder')) {
    console.log("Redirecting share link to placeholder");
    window.location.replace('/share/placeholder/');
  }
})(); 