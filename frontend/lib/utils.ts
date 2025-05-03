import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow as fmtDistanceToNow } from "date-fns";

/**
 * Merges tailwind classes and clsx conditionals
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes into human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format relative time using date-fns formatDistanceToNow
 */
export function formatDistanceToNow(date: Date | string | number): string {
  return fmtDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format storage usage with total allowed storage
 * Total storage is fixed at 20GB (20 * 1024 * 1024 * 1024 bytes)
 */
export function formatStorageUsage(bytesUsed: number): string {
  // Total storage is 20GB
  const totalStorage = 20 * 1024 * 1024 * 1024; // 20GB in bytes
  
  // Make sure bytesUsed is a number and not NaN
  const sanitizedBytes = Number.isNaN(bytesUsed) ? 0 : Math.max(0, bytesUsed);
  
  // Calculate percentage (rounded to 1 decimal place)
  const percentage = Math.min(100, Math.round((sanitizedBytes / totalStorage) * 1000) / 10);
  
  // Format both used and total in readable format (force smaller units for small files)
  const usedFormatted = sanitizedBytes < 1024 * 1024 ? 
    formatBytes(sanitizedBytes, 2) : 
    formatBytes(sanitizedBytes, 1);
    
  const totalFormatted = formatBytes(totalStorage, 0);
  
  return `${usedFormatted} / ${totalFormatted} (${percentage}%)`;
}

/**
 * Format date in a readable format
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate time remaining from a date
 */
export function timeRemaining(date: Date | string): string {
  const targetDate = new Date(date);
  const now = new Date();
  
  if (now > targetDate) {
    return 'Expired';
  }
  
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
  }
  
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
  }
  
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} left`;
} 