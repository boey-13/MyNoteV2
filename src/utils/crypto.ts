// src/utils/crypto.ts
// Password encryption utilities using crypto-js to match backend

import CryptoJS from 'crypto-js';

/**
 * Hash a password using a simple hash function
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Use SHA256 to match backend hashlib.sha256
    const salt = generateSalt(32); // 32 chars = 16 bytes (matches backend secrets.token_hex(16))
    const hash = CryptoJS.SHA256(password + salt).toString();
    return `${salt}:${hash}`;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}


/**
 * Compare a password with its hash
 * @param password - Plain text password
 * @param hash - Hashed password from database
 * @returns Promise<boolean> - True if password matches
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    // Parse salt and hash from stored value
    const [salt, storedHash] = hash.split(':');
    if (!salt || !storedHash) {
      return false;
    }
    
    // Hash the input password with the same salt using SHA256
    const inputHash = CryptoJS.SHA256(password + salt).toString();
    
    // Compare hashes
    return inputHash === storedHash;
  } catch (error) {
    console.error('Password comparison error:', error);
    throw new Error('Failed to compare password');
  }
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export function validatePasswordStrength(password: string): { isValid: boolean; message: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is strong' };
}

/**
 * Generate a random salt (alternative to bcrypt's built-in salt)
 * @param length - Length of salt (default: 16)
 * @returns Random salt string
 */
export function generateSalt(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
