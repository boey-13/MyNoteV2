import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TextInput, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';
import { createUser, findUserByEmail } from '../db/users';
import { validatePasswordStrength } from '../utils/crypto';
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
    
    // Password strength validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      showToast.error(passwordValidation.message);
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
      console.error('Error message:', error?.message);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error toString:', error?.toString());
      
      let errorMsg = 'Unknown error';
      
      if (error?.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (error?.toString) {
        errorMsg = error.toString();
      }
      
      // Handle specific error cases
      if (errorMsg.includes('timeout')) {
        errorMsg = 'Request timed out. Please check your internet connection.';
      } else if (errorMsg.includes('409')) {
        errorMsg = 'Email already exists. Please use a different email address.';
      } else if (errorMsg.includes('EMAIL_EXISTS')) {
        errorMsg = 'Email already exists. Please use a different email address.';
      }
      
      // Show user-friendly error message
      showToast.error(errorMsg);
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FFFAEC', '#F8F4F0']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative Dots */}
      <View style={styles.decorativeDots}>
        <View style={[styles.dot, styles.dot1, { backgroundColor: '#7267F0' }]} />
        <View style={[styles.dot, styles.dot2, { backgroundColor: '#ADD8EB' }]} />
        <View style={[styles.dot, styles.dot3, { backgroundColor: '#7267F0' }]} />
        <View style={[styles.dot, styles.dot4, { backgroundColor: '#ADD8EB' }]} />
      </View>

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image 
          source={require('../../assets/images/logo1.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.textInput}
            value={username}
            onChangeText={setUsername}
            placeholder="Choose a username"
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.textInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Choose a password"
            placeholderTextColor="#999"
            secureTextEntry
          />
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton 
            label="CREATE ACCOUNT" 
            onPress={onRegister} 
            loading={busy}
            style={styles.createButton}
          />
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton 
            label="Back to Sign In" 
            variant="outline" 
            onPress={() => navigation.goBack()} 
            disabled={busy}
            style={styles.backButton}
          />
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFAEC',
  },
  decorativeDots: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  dot: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.3,
  },
  dot1: {
    width: 20,
    height: 20,
    top: height * 0.15,
    left: width * 0.1,
  },
  dot2: {
    width: 15,
    height: 15,
    top: height * 0.25,
    right: width * 0.15,
  },
  dot3: {
    width: 25,
    height: 25,
    top: height * 0.4,
    left: width * 0.2,
  },
  dot4: {
    width: 18,
    height: 18,
    top: height * 0.6,
    right: width * 0.1,
  },
  logoSection: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    zIndex: 2,
  },
  logoImage: {
    width: width * 0.6,
    height: width * 0.6,
    maxWidth: 400,
    maxHeight: 400,
  },
  formSection: {
    flex: 0.7,
    paddingHorizontal: 24,
    paddingTop: 10,
    zIndex: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-SemiBold',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins-Regular',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonContainer: {
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#7267F0',
    borderRadius: 25,
    height: 50,
    shadowColor: '#7267F0',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    backgroundColor: '#F4A261',
    borderRadius: 25,
    height: 50,
    borderWidth: 0,
  },
});
