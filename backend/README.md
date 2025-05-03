# TeleFile Backend

The backend server for the TeleFile application, providing APIs for file upload, download, and management.

## Features

- User authentication with Google OAuth
- Chunked file uploads (50MB chunks)
- File sharing via unique links
- File expiration system
- Admin dashboard for system monitoring

## Tech Stack

- Node.js and Express
- TypeScript
- MongoDB with Mongoose
- AWS SDK for S3 (compatible with Backblaze B2)
- JWT for authentication

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory based on `.env.example` with your configuration.

3. Build the application:
   ```
   npm run build
   ```

4. Start the server:
   ```
   npm start
   ```

For development:
```
npm run dev
```

## API Endpoints

### Authentication

- `GET /api/auth/google` - Initiate Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Files

- `POST /api/files/initialize` - Initialize file upload
- `POST /api/files/chunk-upload-url` - Get presigned URL for chunk upload
- `POST /api/files/confirm-chunk` - Confirm chunk upload completion
- `GET /api/files/user-files` - Get current user's files
- `GET /api/files/download/:shareLink` - Download file using share link
- `DELETE /api/files/:fileId` - Delete file

### Admin

- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:userId` - Get user details with files
- `GET /api/admin/stats` - Get system statistics
- `DELETE /api/admin/users/:userId` - Delete user and all their files

## Configuration

Required environment variables:

- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection URI
- `JWT_SECRET` - Secret for JWT tokens
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `BACKBLAZE_BUCKET_NAME` - Backblaze B2 bucket name
- `BACKBLAZE_BUCKET_ID` - Backblaze B2 bucket ID
- `BACKBLAZE_KEY_ID` - Backblaze B2 application key ID
- `BACKBLAZE_APPLICATION_KEY` - Backblaze B2 application key
- `BACKBLAZE_ENDPOINT` - Backblaze B2 endpoint URL
- `FRONTEND_URL` - Frontend application URL 