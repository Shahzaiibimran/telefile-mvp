## [SETUP-1] 1. Project Setup
1.1 Initialize Structure
Create project root with separate frontend/ and backend/ directories
Initialize Next.js with TypeScript and Tailwind in frontend
Configure Express/Node.js backend with TypeScript
Set up MongoDB connection configurations
Configure Backblaze B2 S3 credentials
Reference documentation:
Introduction to S3-compatible API
S3 Copy Object
S3 Delete Object
S3 Get Object
S3 Get Object ACL
S3 Put Object
Set up Cloudflare CDN integration
1.2 Planning Improvements
Break large tasks into smaller steps with clear completion criteria
Define clear dependencies between tasks
Create checkpoints for validating functionality
Add API endpoint specifications with request/response formats
Include UI component state management approach
Define exact file chunking algorithm and reassembly process
1.3 Development Environment
Configure environment variables (.env files)
Set up ESLint/Prettier for code consistency
Install required dependencies for both frontend/backend
## [SETUP-2] 2. Backend Implementation
2.1 Database Models
Create User schema (email, name, storage_used)
Design File schema (name, size, user_id, share_link, expiry)
Implement FileChunk schema (file_id, chunk_index, storage_path)
2.2 Authentication Service
Implement Google OAuth endpoints
Create JWT token generation/validation
Set up admin authentication middleware
2.3 File Storage
Build chunk upload service (50MB chunks)
Implement Backblaze B2 integration with S3 SDK
Create chunk reassembly logic for downloads
Design file expiration system
Default expiry: 5 days
Auto-delete from storage after expiry
Display expiry message when link accessed after expiration
Set maximum allowed file size to 5GB
2.4 API Routes
Build authentication endpoints
Create file upload/management routes
Implement admin dashboard data endpoints
## [SETUP-3] 3. Frontend Implementation
3.1 Core Components
Create visually stunning, modern, and sleek UI
Ensure responsive design for all devices
Design responsive navbar with circular upload button (80px)
Create file upload modal with progress visualization
Build file listing table with copy/download actions
Implement Google authentication flow
Design admin dashboard with user statistics
3.2 Pages
3.2.1 Home Page
Navbar with "+" button (80px circular)
Google auth integration
File upload progress visualization
File listing table related to each user
3.2.2 Admin Page
Login form
User statistics table
Storage usage breakdown
File management capabilities
3.3 File Upload System
Implement chunked file upload logic
Create progress tracking system
Design estimated time remaining calculation
Build parallel upload queue manager
Generate unique link for each file (10 characters/numbers)
Create recovery processes for interrupted transfers
3.4 File Download System
Implement secure download links
Create client-side chunk assembly
Design download progress visualization
Create recovery processes for interrupted transfers
## [SETUP-4] 4. Testing & Deployment
Test authentication flows
Validate chunked uploads/downloads
Test admin dashboard functionality
Configure production deployment
Set up monitoring and logging
Deploy on Ubuntu VPS
Note: Each task should be implemented sequentially, ensuring proper functionality before moving to the next component.