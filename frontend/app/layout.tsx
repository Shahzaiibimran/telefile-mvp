"use client";

import './globals.css';
import React from 'react';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>TeleFile - Secure File Sharing</title>
        <meta name="description" content="Secure file sharing with expiring links" />
        <link rel="icon" href="/favicon.ico" />
        <script src="/script.js" defer></script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
