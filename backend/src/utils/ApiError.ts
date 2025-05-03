/**
 * Custom API Error class with status code support
 */
export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    
    // This is needed because we're extending a built-in class
    Object.setPrototypeOf(this, ApiError.prototype);
  }
} 