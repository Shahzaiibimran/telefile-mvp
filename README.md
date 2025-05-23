# TeleFile

TeleFile is a secure file sharing application that allows users to upload and share files with expiring links. The application supports large file uploads (up to 5GB) through chunked uploads, and provides a clean, modern interface for managing files.

## Features

- **Google Authentication**: Secure user authentication using Google OAuth
- **Chunked File Uploads**: Support for large file uploads (up to 5GB) with 50MB chunks
- **Progress Tracking**: Real-time upload and download progress tracking
- **File Expiry System**: Automatic file expiration (configurable from 1-30 days)
- **Secure Sharing**: Unique, random links for file sharing
- **Admin Dashboard**: System statistics and user management
- **Responsive Design**: Mobile-friendly interface

## Project Structure

The project is organized into two main parts:

- **Frontend**: Next.js application with TypeScript and Tailwind CSS
- **Backend**: Express.js API with MongoDB and S3-compatible storage

## Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Axios
- React Dropzone

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- AWS SDK (for S3-compatible storage)
- Passport.js (for Google OAuth)
- JWT authentication

### Storage
- Backblaze B2 (S3-compatible) for file storage
- MongoDB for metadata

## Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB
- Backblaze B2 account (or any S3-compatible storage)
- Google Developer Account (for OAuth)

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` with your configuration:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/telefile
   JWT_SECRET=your_jwt_secret_key_here
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   BACKBLAZE_BUCKET_NAME=your_backblaze_bucket_name
   BACKBLAZE_BUCKET_ID=your_backblaze_bucket_id
   BACKBLAZE_KEY_ID=your_backblaze_key_id
   BACKBLAZE_APPLICATION_KEY=your_backblaze_application_key
   BACKBLAZE_ENDPOINT=your_backblaze_endpoint
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the backend server in development mode:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. Start the frontend development server:
   ```
   npm run dev
   ```

5. Access the application at http://localhost:3000

## Deployment

### Backend
The backend can be deployed on any platform that supports Node.js applications, such as:
- Digital Ocean
- AWS EC2
- Heroku
- Railway

### Frontend
The frontend can be deployed on:
- Vercel
- Netlify
- AWS Amplify
- Google Cloud Run

## File Upload Process

1. User selects a file and expiry duration
2. File metadata is sent to the server to initialize the upload
3. File is split into 50MB chunks
4. Each chunk is uploaded directly to Backblaze B2 using presigned URLs
5. Server confirms completion of each chunk
6. When all chunks are uploaded, the file is marked as complete
7. User receives a unique share link

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/) - React framework
- [Express.js](https://expressjs.com/) - Web framework for Node.js
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [AWS SDK](https://aws.amazon.com/sdk-for-javascript/) - AWS SDK for JavaScript
- [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) - Cloud storage #   t e l t e f i l e  
 