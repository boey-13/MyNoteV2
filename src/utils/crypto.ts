// src/utils/crypto.ts
// Password encryption utilities using a simple hash function
// Note: For production, use a proper bcrypt library

// Simple hash function (for demo purposes)
// In production, use: npm install react-native-bcrypt

// Salt rounds for bcrypt (higher = more secure but slower)
const SALT_ROUNDS = 12;

/**
 * Hash a password using a simple hash function
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Simple hash function for demo purposes
    // In production, use proper bcrypt: npm install react-native-bcrypt
    const salt = generateSalt(16);
    const hash = await simpleHash(password + salt);
    return `${salt}:${hash}`;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

// Simple hash function (for demo purposes only)
async function simpleHash(input: string): Promise<string> {
  // This is a very basic hash function - NOT secure for production
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
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
    
    // Hash the input password with the same salt
    const inputHash = await simpleHash(password + salt);
    
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
