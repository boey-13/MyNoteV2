// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import CustomButton from '../components/CustomButton';
import { runFullSync } from '../utils/sync';
import { getJson } from '../utils/api';
import { showToast } from '../components/Toast';
import { countDirtyNotes, listDirtyNotes } from '../db/notes';
import { countDeleteQueue } from '../db/syncQueue';
import { checkDatabaseSchema, forceCreateSyncQueue } from '../utils/checkDatabase';
import { getCurrentUserId } from '../utils/session';
import { getConnectionStatus, addConnectionListener } from '../utils/realtimeStatus';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';

export default function SettingsScreen({ navigation }: any) {
  const { theme } = useAppTheme();
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

  const showPendingUploads = async () => {
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
  };

  const printDirtyList = async () => {
    try {
      const uid = (await getCurrentUserId()) ?? 1;
      const rows = await listDirtyNotes(uid, 100);
      console.log('DIRTY NOTES →', rows);
      showToast.success(`Printed ${rows.length} item(s)`);
    } catch (e: any) {
      showToast.error(`Failed: ${String(e?.message || e)}`);
    }
  };

  const handleSyncNow = () => {
    Alert.alert(
      'Sync Now',
      'This will sync all pending changes with the server. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sync', onPress: () => runFullSync() }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Manage your app preferences and sync settings</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={[
            styles.statusCard,
            { backgroundColor: isRealtimeConnected ? '#E8F5E8' : '#FFE8E8' }
          ]}>
            <View style={styles.statusHeader}>
              <Text style={[
                styles.statusTitle,
                { color: isRealtimeConnected ? '#2E7D32' : '#C62828' }
              ]}>
                {isRealtimeConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            <Text style={[
              styles.statusDescription,
              { color: isRealtimeConnected ? '#388E3C' : '#D32F2F' }
            ]}>
              {isRealtimeConnected 
                ? 'Changes will sync automatically' 
                : 'Manual sync required'
              }
            </Text>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>2.0.0</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2024.1.0</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Sync</Text>
              <Text style={styles.infoValue}>Just now</Text>
            </View>
          </View>
        </View>

        {/* Sync Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync & Data</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionItem} onPress={handleSyncNow}>
              <Icon name="refresh-cw" size={20} color="#455B96" style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Sync Now</Text>
                <Text style={styles.actionDescription}>Sync all pending changes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={showPendingUploads}>
              <Icon name="bar-chart-2" size={20} color="#455B96" style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Show Pending Uploads</Text>
                <Text style={styles.actionDescription}>View pending sync items</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={printDirtyList}>
              <Icon name="file-text" size={20} color="#455B96" style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Print Dirty List</Text>
                <Text style={styles.actionDescription}>Debug: Print to console</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Tools</Text>
          <View style={styles.devToolsCard}>
            <CustomButton 
              label="Check Backend Health" 
              onPress={checkHealth}
              style={styles.devButton}
            />
            <CustomButton 
              label="Check Database Schema" 
              onPress={checkDatabase}
              variant="outline"
              style={styles.devButton}
            />
            <CustomButton 
              label="Fix Database" 
              onPress={fixDatabase}
              variant="outline"
              style={styles.devButton}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerSection: {
    marginBottom: 25,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'Poppins-Bold',
  },
  statusCard: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  statusDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  actionsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  actionIcon: {
    marginRight: 15,
    width: 30,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  devToolsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  devButton: {
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins-Regular',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#455B96',
    fontFamily: 'Poppins-SemiBold',
  },
});
