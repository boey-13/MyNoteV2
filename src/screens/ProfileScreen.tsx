// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import CustomButton from '../components/CustomButton';
import { getCurrentUserId, clearSession } from '../utils/session';
import { getUserById } from '../db/users';
import { showToast } from '../components/Toast';

export default function ProfileScreen({ navigation }: any) {
  const [username, setUsername] = useState<string>('');
  
  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (uid) {
        const u = await getUserById(uid);
        setUsername(u?.username ?? '');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Profile</Text>
      <Text style={{ marginTop: 8 }}>Current user: <Text style={{ fontWeight: '600' }}>{username || '—'}</Text></Text>
      <View style={{ height: 12 }} />
      <CustomButton
        label="Sign Out"
        variant="outline"
        onPress={async () => {
          await clearSession();
          showToast.success('Signed out');
          navigation.navigate('Auth');
        }}
      />
    </View>
  );
}
