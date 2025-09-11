// utils/realtime.ts
import io, { Socket } from 'socket.io-client';
import { runFullSync } from './sync';
import { getCurrentUserId } from '../utils/session';
import { setConnectionStatus } from './realtimeStatus';

const WS_URL =
  __DEV__
    ? 'http://localhost:5000' // Use localhost with ADB port forwarding
    : 'http://10.0.2.2:5000'; // Production change as needed

let socket: Socket | null = null;
let debounceTimer: any = null;

async function scheduleSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    // Check if auto sync is enabled before syncing
    const { isAutoSyncEnabled } = await import('./sync');
    const enabled = await isAutoSyncEnabled();
    if (enabled) {
      runFullSync(false); // Silent sync (no Toast)
    }
  }, 800); // Merge instant multiple events
}

export async function startRealtime() {
  // Avoid duplicate connections
  if (socket) {
    console.log('🔌 WebSocket already connected, skipping...');
    return;
  }
  const uid = (await getCurrentUserId()) ?? 1;
  
  console.log('🔌 Starting WebSocket connection...');
  console.log('🔌 URL:', WS_URL);
  console.log('🔌 User ID:', uid);

  socket = io(WS_URL, {
    path: '/socket.io',
    transports: ['polling', 'websocket'], // Try polling first, then websocket
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
    query: { user: String(uid) }, // Backend uses this to add connection to user room
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connected');
    setConnectionStatus(true);
  });
  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
    setConnectionStatus(false);
  });
  
  socket.on('connect_error', (error) => {
    console.log('🔌 WebSocket connection error:', error);
    setConnectionStatus(false);
  });

  // Server push: any update/delete → trigger one sync
  socket.on('note_updated', (data) => {
    console.log('📝 Note updated:', data);
    scheduleSync();
  });
  socket.on('note_deleted', (data) => {
    console.log('🗑️ Note deleted:', data);
    scheduleSync();
  });

  // Optional: server hello
  socket.on('hello', (data) => {
    console.log('👋 Server hello:', data);
  });
}

export function stopRealtime() {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    setConnectionStatus(false);
    console.log('🔌 WebSocket stopped');
  }
}
