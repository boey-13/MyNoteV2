// db/users.ts
import { getDB, nowISO } from './sqlite';

export type User = { id: number; username: string; email: string; password: string; avatar?: string; created_at: string };

// For local demo only: plain text storage (for educational purposes). Production should use "salted hash"!
export async function createUser(username: string, email: string, password: string): Promise<User> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)`,
        [username, email, password, nowISO()],
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
              reject(new Error('Email already exists'));
            } else if (e.message.includes('username')) {
              reject(new Error('Username already exists'));
            } else {
              reject(new Error('User with this information already exists'));
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
          reject(new Error(`Failed to create user: ${e.message || 'Unknown database error'}`));
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
