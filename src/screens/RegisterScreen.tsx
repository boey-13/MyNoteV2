import React, { useState } from 'react';
import { View, Text } from 'react-native';
import InputWithLabel from '../components/InputWithLabel';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';
import { createUser, findUserByEmail } from '../db/users';
import { setCurrentUserId } from '../utils/session';
import { postJsonNoAuth } from '../utils/api';

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
      // First register user on backend
      const backendUser = await postJsonNoAuth('/users/register', {
        username,
        email,
        password
      }) as any;
      
      console.log('Backend response:', backendUser);
      console.log('Backend user ID:', backendUser?.id);
      
      // Check backend response data
      if (!backendUser || !backendUser.id) {
        console.error('Invalid backend response:', backendUser);
        throw new Error('Invalid response from server');
      }
      
      // First create user locally (using auto-generated ID)
      const localUser = await createUser(username, email, password);
      console.log('Local user created:', localUser);
      
      // Set current user ID to local user ID
      await setCurrentUserId(localUser.id);
      console.log('Current user ID set to:', localUser.id);
      
      showToast.success('Account created');
      // Clear input fields
      setUsername('');
      setEmail('');
      setPassword('');
      navigation.navigate('MainApp');
    } catch (error: any) { 
      console.error('Registration error:', error);
      const errorMsg = error?.message || 'Unknown error';
      if (errorMsg.includes('USER_EXISTS')) {
        showToast.error('Username or email already exists');
      } else {
        showToast.error(`Register failed: ${errorMsg}`);
      }
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
