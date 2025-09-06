// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import CustomButton from '../components/CustomButton';
import { runFullSync } from '../utils/sync';
import { getJson } from '../utils/api';
import { showToast } from '../components/Toast';
import { countDirtyNotes, listDirtyNotes } from '../db/notes';
import { countDeleteQueue } from '../db/syncQueue';
import { checkDatabaseSchema, forceCreateSyncQueue } from '../utils/checkDatabase';
import { getCurrentUserId } from '../utils/session';
import { getConnectionStatus, addConnectionListener } from '../utils/realtimeStatus';

export default function SettingsScreen({ navigation }: any) {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(getConnectionStatus());

  useEffect(() => {
    const unsubscribe = addConnectionListener(setIsRealtimeConnected);
    return unsubscribe;
  }, []);
  const checkHealth = async () => {
    try {
      const result = await getJson('/health');
      showToast.success('Backend is healthy!');
      console.log('Health check result:', result);
    } catch (e: any) {
      showToast.error(`Health check failed: ${String(e?.message || e)}`);
    }
  };

  const checkDatabase = async () => {
    try {
      await checkDatabaseSchema();
      showToast.success('Database check completed - see console');
    } catch (e: any) {
      showToast.error(`Database check failed: ${String(e?.message || e)}`);
    }
  };

  const fixDatabase = async () => {
    try {
      await forceCreateSyncQueue();
      showToast.success('Database fixed! Please restart the app');
    } catch (e: any) {
      showToast.error(`Database fix failed: ${String(e?.message || e)}`);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Settings</Text>
      
      {/* Realtime Status */}
      <View style={{ 
        padding: 12, 
        backgroundColor: isRealtimeConnected ? '#e8f5e8' : '#ffe8e8', 
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isRealtimeConnected ? '#4caf50' : '#f44336'
      }}>
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600',
          color: isRealtimeConnected ? '#2e7d32' : '#c62828'
        }}>
          🔌 Realtime: {isRealtimeConnected ? 'Connected' : 'Disconnected'}
        </Text>
        <Text style={{ 
          fontSize: 12, 
          color: isRealtimeConnected ? '#388e3c' : '#d32f2f',
          marginTop: 4
        }}>
          {isRealtimeConnected 
            ? 'Changes will sync automatically' 
            : 'Manual sync required'
          }
        </Text>
      </View>
      <CustomButton label="Check Backend Health" onPress={checkHealth} />
      <CustomButton label="Check Database Schema" onPress={checkDatabase} />
      <CustomButton label="Fix Database (Force Create sync_queue)" onPress={fixDatabase} variant="outline" />
      <CustomButton label="Sync Now" onPress={() => runFullSync()} />
      <CustomButton
        label="Show pending uploads"
        variant="outline"
        onPress={async () => {
          try {
            const uid = (await getCurrentUserId()) ?? 1;
            const [dirty, delq] = await Promise.all([
              countDirtyNotes(uid),
              countDeleteQueue(uid),
            ]);
            showToast.success(`Pending: ${dirty} changes + ${delq} deletes = ${dirty + delq}`);
          } catch (e: any) {
            showToast.error(`Failed: ${String(e?.message || e)}`);
          }
        }}
      />
      <CustomButton
        label="Print dirty list (console)"
        variant="ghost"
        onPress={async () => {
          try {
            const uid = (await getCurrentUserId()) ?? 1;
            const rows = await listDirtyNotes(uid, 100);
            console.log('DIRTY NOTES →', rows);
            showToast.success(`Printed ${rows.length} item(s)`);
          } catch (e: any) {
            showToast.error(`Failed: ${String(e?.message || e)}`);
          }
        }}
      />
    </View>
  );
}
