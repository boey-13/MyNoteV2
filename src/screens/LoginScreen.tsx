import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TextInput, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';
import { verifyUserPassword } from '../db/users';
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
            const user = await verifyUserPassword(email, password);
            if (!user) {
                showToast.error('Invalid email or password');
            } else {
                await setCurrentUserId(user.id);
                showToast.success(`Welcome, ${user.username}`);
                // Clear input fields
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
                    <Text style={styles.inputLabel}>Email</Text>
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
                
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                        style={styles.textInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter password"
                        placeholderTextColor="#999"
                        secureTextEntry
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <CustomButton 
                        label="LOG IN" 
                        onPress={onLogin} 
                        loading={busy}
                        style={styles.loginButton}
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <CustomButton 
                        label="Sign Up" 
                        variant="outline" 
                        onPress={() => navigation.navigate('Register')} 
                        disabled={busy}
                        style={styles.signupButton}
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
        flex: 0.35,
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
        flex: 0.65,
        paddingHorizontal: 24,
        paddingTop: 10,
        zIndex: 2,
    },
    inputContainer: {
        marginBottom: 20,
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
        marginBottom: 16,
    },
    loginButton: {
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
    signupButton: {
        backgroundColor: '#F4A261',
        borderRadius: 25,
        height: 50,
        borderWidth: 0,
    },
});
