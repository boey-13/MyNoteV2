// db/users.ts
import { getDB, nowISO } from './sqlite';
import { hashPassword, comparePassword } from '../utils/crypto';

export type User = { id: number; username: string; email: string; password: string; avatar?: string; created_at: string };

// Create user with encrypted password
export async function createUser(username: string, email: string, password: string): Promise<User> {
  const db = await getDB();
  
  // Hash the password before storing
  const hashedPassword = await hashPassword(password);
  
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, nowISO()],
        (_, rs) => {
          tx.executeSql(`SELECT id, username, email, password, created_at FROM users WHERE id = ?`, [rs.insertId],
            (_, r2) => resolve(r2.rows.item(0)),
            (_, e2) => { 
              console.error('Error fetching created user:', e2);
              reject(new Error(`Failed to fetch created user: ${e2.message || 'Unknown error'}`)); 
              return false; 
            }
          );
        },
        (_, e) => { 
          console.error('Error creating user:', e);
          // Check for specific SQLite error codes
          if (e.message && e.message.includes('UNIQUE constraint failed')) {
            if (e.message.includes('email')) {
              reject(new Error('EMAIL_EXISTS: Email already exists'));
            } else {
              reject(new Error('USER_EXISTS: User with this information already exists'));
            }
          } else {
            reject(new Error(`Failed to create user: ${e.message || 'Unknown database error'}`));
          }
          return false; 
        }
      );
    });
  });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT id, username, email, password, created_at FROM users WHERE email = ?`,
        [email],
        (_, rs) => resolve(rs.rows.length ? rs.rows.item(0) : null),
        (_, e) => { 
          console.error('Error finding user by email:', e);
          reject(new Error(`Database error: ${e.message || 'Unknown error'}`)); 
          return false; 
        }
      );
    });
  });
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT id, username, email, password, created_at FROM users WHERE username = ?`,
        [username],
        (_, rs) => resolve(rs.rows.length ? rs.rows.item(0) : null),
        (_, e) => { 
          console.error('Error finding user by username:', e);
          reject(new Error(`Database error: ${e.message || 'Unknown error'}`)); 
          return false; 
        }
      );
    });
  });
}

export async function getUserById(id: number): Promise<User | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT id, username, email, password, created_at FROM users WHERE id = ?`,
        [id],
        (_, rs) => resolve(rs.rows.length ? rs.rows.item(0) : null),
        (_, e) => { 
          console.error('Error getting user by id:', e);
          reject(new Error(`Database error: ${e.message || 'Unknown error'}`)); 
          return false; 
        }
      );
    });
  });
}

export async function createUserWithId(id: number, username: string, email: string, password: string): Promise<User> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO users (id, username, email, password, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, username, email, password, nowISO()],
        (_, rs) => {
          tx.executeSql(`SELECT id, username, email, password, created_at FROM users WHERE id = ?`, [id],
            (_, r2) => resolve(r2.rows.item(0)),
            (_, e2) => { 
              console.error('Error fetching created user:', e2);
              reject(new Error(`Failed to fetch created user: ${e2.message || 'Unknown error'}`)); 
              return false; 
            }
          );
        },
        (_, e) => { 
          console.error('Error creating user with ID:', e);
          // Check for specific SQLite error codes
          if (e.message && e.message.includes('UNIQUE constraint failed')) {
            if (e.message.includes('email')) {
              reject(new Error('EMAIL_EXISTS: Email already exists'));
            } else {
              reject(new Error('USER_EXISTS: User with this information already exists'));
            }
          } else {
            reject(new Error(`Failed to create user: ${e.message || 'Unknown database error'}`));
          }
          return false; 
        }
      );
    });
  });
}

export async function updateUser(id: number, updates: { username?: string; email?: string; avatar?: string }): Promise<User> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      const fields = [];
      const values = [];
      
      if (updates.username !== undefined) {
        fields.push('username = ?');
        values.push(updates.username);
      }
      if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
      }
      if (updates.avatar !== undefined) {
        fields.push('avatar = ?');
        values.push(updates.avatar);
      }
      
      if (fields.length === 0) {
        reject(new Error('No fields to update'));
        return;
      }
      
      values.push(id);
      
      tx.executeSql(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (_, rs) => {
          tx.executeSql(`SELECT id, username, email, password, avatar, created_at FROM users WHERE id = ?`, [id],
            (_, r2) => resolve(r2.rows.item(0)),
            (_, e2) => { 
              console.error('Error fetching updated user:', e2);
              reject(new Error(`Failed to fetch updated user: ${e2.message || 'Unknown error'}`)); 
              return false; 
            }
          );
        },
        (_, e) => { 
          console.error('Error updating user:', e);
          reject(new Error(`Failed to update user: ${e.message || 'Unknown database error'}`));
          return false; 
        }
      );
    });
  });
}

export async function getOrCreateGuest(): Promise<User> {
  const existing = await findUserByUsername('guest');
  if (existing) return existing;
  return createUser('guest', 'guest@example.com', '');
}

/**
 * Verify user password
 * @param email - User email
 * @param password - Plain text password
 * @returns Promise<User | null> - User if password is correct, null otherwise
 */
export async function verifyUserPassword(email: string, password: string): Promise<User | null> {
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return null;
    }
    
    const isValid = await comparePassword(password, user.password);
    return isValid ? user : null;
  } catch (error) {
    console.error('Password verification error:', error);
    return null;
  }
}

/**
 * Update user password
 * @param userId - User ID
 * @param newPassword - New plain text password
 * @returns Promise<boolean> - True if successful
 */
export async function updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
  try {
    const db = await getDB();
    const hashedPassword = await hashPassword(newPassword);
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE users SET password = ? WHERE id = ?`,
          [hashedPassword, userId],
          (_, rs) => {
            resolve(rs.rowsAffected > 0);
          },
          (_, e) => {
            console.error('Error updating password:', e);
            reject(new Error(`Failed to update password: ${e.message || 'Unknown error'}`));
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Password update error:', error);
    throw new Error('Failed to update password');
  }
}
