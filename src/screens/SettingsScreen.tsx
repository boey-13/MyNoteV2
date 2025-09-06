// src/screens/SettingsScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import CustomButton from '../components/CustomButton';
import { runFullSync } from '../utils/sync';
import { getJson } from '../utils/api';
import { showToast } from '../components/Toast';
import { countDirtyNotes, listDirtyNotes } from '../db/notes';
import { countDeleteQueue } from '../db/syncQueue';
import { checkDatabaseSchema, forceCreateSyncQueue } from '../utils/checkDatabase';

export default function SettingsScreen({ navigation }: any) {
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
      <CustomButton label="Check Backend Health" onPress={checkHealth} />
      <CustomButton label="Check Database Schema" onPress={checkDatabase} />
      <CustomButton label="Fix Database (Force Create sync_queue)" onPress={fixDatabase} variant="outline" />
      <CustomButton label="Sync Now" onPress={() => runFullSync()} />
      <CustomButton
        label="Show pending uploads"
        variant="outline"
        onPress={async () => {
          try {
            const uid = 1; // 先用 1；接入登录后用当前用户 ID
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
            const rows = await listDirtyNotes(1, 100);
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
