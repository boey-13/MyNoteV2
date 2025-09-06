// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import CustomButton from '../components/CustomButton';
import { getCurrentUserId, clearSession } from '../utils/session';
import { getUserById } from '../db/users';
import { showToast } from '../components/Toast';

export default function ProfileScreen({ navigation }: any) {
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  
  const loadUserInfo = async () => {
    const uid = await getCurrentUserId();
    console.log('ProfileScreen - Current user ID:', uid);
    setUserId(uid);
    if (uid) {
      const u = await getUserById(uid);
      console.log('ProfileScreen - User data:', u);
      setUsername(u?.username ?? '');
    } else {
      console.log('ProfileScreen - No user ID found');
      setUsername('');
    }
  };
  
  useEffect(() => {
    loadUserInfo();
  }, []);
  
  // 监听导航焦点，当页面重新获得焦点时重新加载用户信息
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserInfo();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Profile</Text>
      <View style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>User Information</Text>
        <Text style={{ marginTop: 8 }}>Username: <Text style={{ fontWeight: '600' }}>{username || '—'}</Text></Text>
        <Text style={{ marginTop: 4 }}>User ID: <Text style={{ fontWeight: '600' }}>{userId || '—'}</Text></Text>
      </View>
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
