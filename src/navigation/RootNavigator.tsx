import React from 'react';
import { AppState, View, Image, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
  DrawerContentComponentProps,
  DrawerToggleButton,
} from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import RecycleBinScreen from '../screens/RecycleBinScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import NoteDetailsScreen from '../screens/NoteDetailsScreen';
import EditNoteScreen from '../screens/EditNoteScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { getCurrentUserId, clearSession } from '../utils/session';
import { showToast } from '../components/Toast';
import { runFullSync } from '../utils/sync';
import { startRealtime, stopRealtime } from '../utils/realtime';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ 
        headerShown: false, 
        tabBarInactiveTintColor: '#6A4E3B',
        tabBarStyle: {
          backgroundColor: '#E8EDF7',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        },
      }}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />
        }} 
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ 
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Icon name="search" size={size} color={color} />
        }} 
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen} 
        options={{ 
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => <Icon name="star" size={size} color={color} />
        }} 
      />
      <Tab.Screen 
        name="Recycle" 
        component={RecycleBinScreen} 
        options={{ 
          title: 'Recycle',
          tabBarIcon: ({ color, size }) => <Icon name="trash-2" size={size} color={color} />
        }} 
      />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen 
        name="NoteDetails" 
        component={NoteDetailsScreen} 
        options={{ 
          headerShown: true,
          title: 'Note Details',
          headerBackTitle: 'Back'
        }} 
      />
      <Stack.Screen 
        name="EditNote" 
        component={EditNoteScreen} 
        options={{ 
          headerShown: true,
          title: 'Note', // Will be dynamically updated by the screen
          headerBackTitle: 'Back'
        }} 
      />
    </Stack.Navigator>
  );
}

// Custom Drawer
function CustomDrawerContent(
  props: DrawerContentComponentProps & { signedIn: boolean; onSignOut: () => void }
) {
  const { signedIn, onSignOut, ...rest } = props as any;
  
  // Debug info
  console.log('CustomDrawerContent - signedIn:', signedIn);
  
  const handleLogout = async () => {
    console.log('Logout pressed');
    await clearSession();
    showToast.success('Signed out');
    onSignOut(); // Update state immediately
    rest.navigation.closeDrawer();
    rest.navigation.navigate('Auth');
  };

  const handleSync = async () => {
    try {
      await runFullSync();
      showToast.success('Sync completed');
      rest.navigation.closeDrawer();
    } catch (e: any) {
      showToast.error('Sync failed: ' + (e?.message || 'Unknown error'));
    }
  };

  return (
    <View style={styles.drawerContainer}>
      <DrawerContentScrollView {...rest} style={styles.drawerScroll}>
        {/* Header Section */}
        <View style={styles.drawerHeader}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo1.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.appName}>MyNote</Text>
          <Text style={styles.appVersion}>Version 2.0.0</Text>
        </View>

        {/* Navigation Items */}
        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>Navigation</Text>
          <View style={styles.navigationItems}>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => {
                rest.navigation.navigate('MainApp');
                rest.navigation.closeDrawer();
              }}
            >
              <Icon name="home" size={20} color="#455B96" />
              <Text style={styles.navItemText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => {
                rest.navigation.navigate('Profile');
                rest.navigation.closeDrawer();
              }}
            >
              <Icon name="user" size={20} color="#455B96" />
              <Text style={styles.navItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => {
                rest.navigation.navigate('Settings');
                rest.navigation.closeDrawer();
              }}
            >
              <Icon name="settings" size={20} color="#455B96" />
              <Text style={styles.navItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => {
                rest.navigation.navigate('About');
                rest.navigation.closeDrawer();
              }}
            >
              <Icon name="info" size={20} color="#455B96" />
              <Text style={styles.navItemText}>About</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        {signedIn && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionItems}>
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={handleSync}
              >
                <Icon name="refresh-cw" size={20} color="#455B96" />
                <Text style={styles.actionItemText}>Sync Now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  rest.navigation.navigate('MainApp', { screen: 'EditNote' });
                  rest.navigation.closeDrawer();
                }}
              >
                <Icon name="plus" size={20} color="#455B96" />
                <Text style={styles.actionItemText}>New Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.drawerFooter}>
          {signedIn ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Icon name="log-out" size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => {
                rest.navigation.navigate('Auth');
                rest.navigation.closeDrawer();
              }}
            >
              <Icon name="log-in" size={20} color="#455B96" />
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </DrawerContentScrollView>
    </View>
  );
}

export default function RootNavigator() {
  const [checked, setChecked] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState(false);
  
  React.useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      setSignedIn(!!uid);
      setChecked(true);
    })();
  }, []);

  // Auto-sync on network recovery (only if auto sync is enabled)
  React.useEffect(() => {
    const sub = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        // Check if auto sync is enabled before syncing
        const isAutoSyncEnabled = await import('../utils/sync').then(m => m.isAutoSyncEnabled());
        if (isAutoSyncEnabled) {
          runFullSync(false);
        }
      }
    });
    return () => sub();
  }, []);

  // Auto-sync when app comes to foreground (only if auto sync is enabled)
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', async (s) => {
      if (s === 'active') {
        // Check if auto sync is enabled before syncing
        const isAutoSyncEnabled = await import('../utils/sync').then(m => m.isAutoSyncEnabled());
        if (isAutoSyncEnabled) {
          runFullSync(false);
        }
      }
    });
    return () => sub.remove();
  }, []);

  // WebSocket realtime connection
  React.useEffect(() => {
    if (signedIn) {
      startRealtime();
    } else {
      stopRealtime();
    }
    return () => stopRealtime();
  }, [signedIn]);

  // Periodically check login state changes (ensure state sync)
  React.useEffect(() => {
    const interval = setInterval(async () => {
      const uid = await getCurrentUserId();
      setSignedIn(prev => {
        const newSignedIn = !!uid;
        if (prev !== newSignedIn) {
          return newSignedIn;
        }
        return prev;
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  const handleSignOut = React.useCallback(() => {
    console.log('handleSignOut called');
    setSignedIn(false);
  }, []);

  // Debug info
  console.log('RootNavigator - signedIn:', signedIn, 'checked:', checked);

  if (!checked) {
    return null; // Simple splash placeholder, can be replaced with custom if needed
  }

  return (
    <Drawer.Navigator
      initialRouteName={signedIn ? 'MainApp' : 'Auth'}
      screenOptions={{
        headerShown: true,
        // Center logo image
        headerTitle: () => (
          <Image
            source={require('../../assets/images/logo1.png')}
            style={{ width: 180, height: 60, resizeMode: 'contain' }}
          />
        ),
        headerTitleAlign: 'center',
        // Left hamburger menu
        headerLeft: () => <DrawerToggleButton tintColor="#222" />,

        headerRight: () => <View style={{ width: 44 }} />,

        headerStyle: { 
          backgroundColor: '#E8EDF7',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        },
        headerShadowVisible: true,
      }}
      drawerContent={(drawerProps) => (
        <CustomDrawerContent {...drawerProps} signedIn={signedIn} onSignOut={handleSignOut} />
      )}
    >
      <Drawer.Screen
        name="MainApp"
        component={AppStack}
        options={{
          title: 'MyNote',
          drawerItemStyle: signedIn ? undefined : { display: 'none' }, // Hide when not logged in
        }}
      />
      <Drawer.Screen
        name="Auth"
        component={AuthStack}
        options={{
          title: 'Sign In',
          headerShown: false,
          drawerItemStyle: signedIn ? { display: 'none' } : undefined, // Hide after login
        }}
      />
      <Drawer.Screen name="About" component={AboutScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerHeader: {
    backgroundColor: '#455B96',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 15,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    fontFamily: 'Poppins-Bold',
  },
  appVersion: {
    fontSize: 14,
    color: '#E8EDF7',
    fontFamily: 'Poppins-Regular',
  },
  navigationSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'Poppins-Bold',
  },
  navigationItems: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  navItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontFamily: 'Poppins-Regular',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionItems: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  actionItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontFamily: 'Poppins-Regular',
  },
  drawerFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  logoutButton: {
    backgroundColor: '#DC3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    fontFamily: 'Poppins-Bold',
  },
  loginButton: {
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#455B96',
  },
  loginButtonText: {
    color: '#455B96',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    fontFamily: 'Poppins-Bold',
  },
});
