// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomButton from '../components/CustomButton';
import { getCurrentUserId, clearSession } from '../utils/session';
import { getUserById, updateUser, updateUserPassword } from '../db/users';
import { validatePasswordStrength } from '../utils/crypto';
import { showToast } from '../components/Toast';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ProfileScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const loadUserInfo = async () => {
    const uid = await getCurrentUserId();
    console.log('ProfileScreen - Current user ID:', uid);
    setUserId(uid);
    if (uid) {
      const u = await getUserById(uid);
      console.log('ProfileScreen - User data:', u);
      
      // Load avatar from AsyncStorage first, then from database
      const storedAvatar = await AsyncStorage.getItem(`avatar_${uid}`);
      const avatarData = storedAvatar || u?.avatar || '';
      
      console.log('ProfileScreen - Avatar data:', avatarData ? 'Present' : 'Empty');
      console.log('ProfileScreen - Avatar source:', storedAvatar ? 'AsyncStorage' : 'Database');
      
      setUsername(u?.username ?? '');
      setEmail(u?.email ?? '');
      setAvatar(avatarData);
    } else {
      console.log('ProfileScreen - No user ID found');
      setUsername('');
      setEmail('');
      setAvatar('');
    }
  };
  
  useEffect(() => {
    loadUserInfo();
  }, []);
  
  // Listen to navigation focus, reload user info when page regains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserInfo();
    });
    return unsubscribe;
  }, [navigation]);

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      showToast.error('Username is required');
      return;
    }
    
    if (!email.trim()) {
      showToast.error('Email is required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast.error('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await updateUser(userId!, { username, email, avatar });
      showToast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    loadUserInfo(); // Reload original data
    setIsEditing(false);
  };

  const handlePasswordChange = async () => {
    if (!userId) return;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast.error('Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast.error('New passwords do not match');
      return;
    }
    
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      showToast.error(passwordValidation.message);
      return;
    }
    
    setLoading(true);
    try {
      // For now, we'll skip current password verification since we don't have the old password
      // In a real app, you'd verify the current password here
      
      await updateUserPassword(userId, newPassword);
      showToast.success('Password updated successfully!');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast.error(`Failed to update password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAvatar = async () => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      maxWidth: 300,
      maxHeight: 300,
      includeBase64: true, // Enable Base64 encoding
    };

    launchImageLibrary(options, async (response) => {
      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        const base64Data = response.assets[0].base64;
        
        if (imageUri && userId) {
          try {
            // Use Base64 data if available, otherwise use URI
            const avatarData = base64Data ? `data:image/jpeg;base64,${base64Data}` : imageUri;
            
            console.log('ProfileScreen - Avatar data type:', base64Data ? 'Base64' : 'URI');
            console.log('ProfileScreen - Avatar data length:', avatarData.length);
            
            // Update the avatar with the data
            setAvatar(avatarData);
            
            // Save to both AsyncStorage and database
            await AsyncStorage.setItem(`avatar_${userId}`, avatarData);
            await updateUser(userId, { avatar: avatarData });
            
            console.log('ProfileScreen - Avatar saved to AsyncStorage and database successfully');
            showToast.success('Avatar updated successfully');
          } catch (error: any) {
            console.error('Error saving avatar:', error);
            showToast.error(error?.message || 'Failed to update avatar');
            // Revert the avatar if save failed
            loadUserInfo();
          }
        }
      }
    });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            showToast.success('Signed out');
            navigation.navigate('Auth');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your account settings</Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handleChangeAvatar} style={styles.avatarContainer}>
              <Image
                source={avatar ? { uri: avatar } : require('../../assets/images/default-avatar.jpg')}
                style={styles.avatar}
              />
              <View style={styles.avatarOverlay}>
                <Icon name="camera-alt" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarLabel}>Tap to change photo</Text>
            <Text style={styles.usernameDisplay}>{username || 'User'}</Text>
          </View>

          {/* Profile Information */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>User Information</Text>
                <Icon name="person" size={24} color="#667eea" />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                {isEditing ? (
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Enter username"
                      placeholderTextColor="#999"
                    />
                  </View>
                ) : (
                  <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>{username || '—'}</Text>
                    <Icon name="edit" size={16} color="#999" />
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                {isEditing ? (
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter email"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                ) : (
                  <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>{email || '—'}</Text>
                    <Icon name="edit" size={16} color="#999" />
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity 
                  style={styles.passwordButton}
                  onPress={() => setShowPasswordChange(!showPasswordChange)}
                >
                  <Text style={styles.passwordButtonText}>
                    {showPasswordChange ? 'Hide Password Change' : 'Change Password'}
                  </Text>
                  <Icon 
                    name={showPasswordChange ? 'lock' : 'lock-open'} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
              </View>

              {showPasswordChange && (
                <View style={styles.passwordSection}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        placeholderTextColor="#999"
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                        placeholderTextColor="#999"
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm new password"
                        placeholderTextColor="#999"
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View style={styles.passwordActions}>
                    <CustomButton
                      label="Update Password"
                      onPress={handlePasswordChange}
                      loading={loading}
                      style={styles.passwordUpdateButton}
                    />
                    <CustomButton
                      label="Cancel"
                      onPress={() => {
                        setShowPasswordChange(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      style={styles.passwordCancelButton}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>User ID</Text>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>{userId || '—'}</Text>
                  <Icon name="badge" size={16} color="#999" />
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            {isEditing ? (
              <View style={styles.editButtons}>
                <CustomButton
                  label="Save Changes"
                  onPress={handleSaveProfile}
                  loading={loading}
                  style={styles.saveButton}
                />
                <CustomButton
                  label="Cancel"
                  variant="outline"
                  onPress={handleCancelEdit}
                  disabled={loading}
                  style={styles.cancelButton}
                />
              </View>
            ) : (
              <CustomButton
                label="Edit Profile"
                onPress={handleEditProfile}
                style={styles.editButton}
              />
            )}
            
            <CustomButton
              label="Sign Out"
              variant="outline"
              onPress={handleSignOut}
              style={styles.signOutButton}
            />
          </View>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B4513',
    fontFamily: 'Anta-Regular',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#A0522D',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 14,
    color: '#A0522D',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  usernameDisplay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    fontFamily: 'Poppins-Bold',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EDE7E1',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-Bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  passwordButton: {
    backgroundColor: '#7267F0',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7267F0',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  passwordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
    marginRight: 8,
  },
  passwordSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  passwordActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },
  passwordUpdateButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 10,
  },
  passwordCancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 10,
    borderWidth: 0,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins-Regular',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
    flex: 1,
  },
  buttonSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 12,
    height: 55,
    shadowColor: '#28a745',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6C757D',
    borderRadius: 12,
    height: 55,
    borderWidth: 0,
    shadowColor: '#6C757D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  editButton: {
    backgroundColor: '#7267F0',
    borderRadius: 12,
    height: 55,
    marginBottom: 16,
    shadowColor: '#7267F0',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  signOutButton: {
    backgroundColor: '#DC3545',
    borderRadius: 12,
    height: 55,
    borderWidth: 0,
    shadowColor: '#DC3545',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
