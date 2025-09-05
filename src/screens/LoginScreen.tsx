import React, { useState } from 'react';
import { View, Text } from 'react-native';
import InputWithLabel from '../components/InputWithLabel';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';
import { findUserByEmail } from '../db/users';
import { setCurrentUserId } from '../utils/session';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);

    const onLogin = async () => {
        if (!email) { showToast.error('Please enter email'); return; }
        if (!password) { showToast.error('Please enter password'); return; }
        
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
        
        setBusy(true);
        try {
            const u = await findUserByEmail(email);
            if (!u || u.password !== password) {
                showToast.error('Invalid email or password');
            } else {
                await setCurrentUserId(u.id);
                showToast.success(`Welcome, ${u.username}`);
                // 清空输入框
                setEmail('');
                setPassword('');
                navigation.navigate('MainApp');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast.error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally { setBusy(false); }
    };


    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: '600' }}>Sign In</Text>
            <InputWithLabel label="Email" value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" />
            <InputWithLabel label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
            <CustomButton label="Sign In" onPress={onLogin} loading={busy} />
            <CustomButton label="Create an account" variant="outline" onPress={() => navigation.navigate('Register')} disabled={busy} />

        </View>
    );
}
