// utils/realtimeStatus.ts
// Global state for WebSocket connection status

let isConnected = false;
let listeners: Array<(connected: boolean) => void> = [];

export function getConnectionStatus(): boolean {
  return isConnected;
}

export function setConnectionStatus(connected: boolean): void {
  if (isConnected !== connected) {
    isConnected = connected;
    listeners.forEach(listener => listener(connected));
  }
}

export function addConnectionListener(listener: (connected: boolean) => void): () => void {
  listeners.push(listener);
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}
