import crypto from 'crypto';
import File from '../models/File';

/**
 * Generate a unique share link (10 characters alphanumeric)
 * @returns {Promise<string>} Unique share link
 */
export const generateShareLink = async (): Promise<string> => {
  let isUnique = false;
  let shareLink = '';
  
  while (!isUnique) {
    // Generate a random string of 10 characters
    const buffer = crypto.randomBytes(8);
    shareLink = buffer.toString('base64')
      .replace(/[+/=]/g, '') // Remove non-alphanumeric characters
      .substring(0, 10);    // Truncate to 10 characters
    
    // Check if the link already exists in the database
    const existingFile = await File.findOne({ share_link: shareLink });
    
    if (!existingFile) {
      isUnique = true;
    }
  }
  
  return shareLink;
};

export default generateShareLink; 