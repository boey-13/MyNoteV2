import React, { useState } from 'react';
import { View, Text } from 'react-native';
import InputWithLabel from '../components/InputWithLabel';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';
import { createUser, findUserByEmail } from '../db/users';
import { setCurrentUserId } from '../utils/session';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onRegister = async () => {
    if (!username || !email || !password) { showToast.error('Fill all fields'); return; }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast.error('Please enter a valid email');
      return;
    }
    
    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      showToast.error('Password must be at least 6 characters');
      return;
    }
    
    // Username validation (minimum 3 characters)
    if (username.length < 3) {
      showToast.error('Username must be at least 3 characters');
      return;
    }
    
    setBusy(true);
    try {
      const u = await createUser(username, email, password);
      await setCurrentUserId(u.id);
      showToast.success('Account created');
      // 清空输入框
      setUsername('');
      setEmail('');
      setPassword('');
      navigation.navigate('MainApp');
    } catch (error) { 
      showToast.error(`Register failed: ${error instanceof Error ? error.message : 'Unknown error'}`); 
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Create Account</Text>
      <InputWithLabel label="Username" value={username} onChangeText={setUsername} placeholder="Choose a username" />
      <InputWithLabel label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" />
      <InputWithLabel label="Password" value={password} onChangeText={setPassword} placeholder="Choose a password" secureTextEntry />
      <CustomButton label="Create" onPress={onRegister} loading={busy} />
      <CustomButton label="Back to Sign In" variant="ghost" onPress={() => navigation.goBack()} disabled={busy} />
    </View>
  );
}
