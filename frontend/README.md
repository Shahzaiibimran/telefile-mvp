# TeleFile Frontend

The frontend application for TeleFile, providing a user interface for file upload, download, and management.

## Features

- Modern, responsive UI built with Next.js and Tailwind CSS
- Google authentication
- Chunked file uploads with progress tracking
- File management dashboard
- Admin dashboard for system monitoring
- File download page with expiry system

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Axios for API communication
- React Dropzone for file uploads
- React Icons for UI icons

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Build for production:
   ```
   npm run build
   ```

5. Start the production server:
   ```
   npm start
   ```

## Project Structure

- `/app` - Next.js App Router pages
- `/components` - React components
  - `/ui` - Reusable UI components
- `/context` - React context providers
- `/lib` - Utility functions and configurations

## Pages

- `/` - Home page with file listing
- `/auth/login` - Login page with Google authentication
- `/download/[shareLink]` - Public file download page
- `/admin` - Admin dashboard (requires admin privileges)

## Development

This project follows a component-based architecture. Common UI elements are located in the `/components/ui` directory, while page-specific components are in the `/components` directory.

Authentication is managed through the AuthContext provider, which handles token storage and user data fetching.

File uploads are handled using chunked uploads to support large files, with progress tracking and status updates.

## Deployment

The frontend is designed to be deployed on any static hosting service or serverless platform that supports Next.js applications. Popular options include:

- Vercel
- Netlify
- AWS Amplify
- Google Cloud Run
