import React from 'react';
import { AppState, View } from 'react-native';
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
import ImageViewerScreen from '../screens/ImageViewerScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { getCurrentUserId, clearSession } from '../utils/session';
import { showToast } from '../components/Toast';
import { runFullSync } from '../utils/sync';
import { Text } from 'react-native';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerTitle: 'Register' }} />
    </Stack.Navigator>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false, tabBarInactiveTintColor: '#6A4E3B' }}>
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
          title: 'Edit Note',
          headerBackTitle: 'Back'
        }} 
      />
      <Stack.Screen 
        name="ImageViewer" 
        component={ImageViewerScreen} 
        options={{ 
          headerShown: true,
          title: 'Image',
          headerBackTitle: 'Back'
        }} 
      />
    </Stack.Navigator>
  );
}

// ✅ Custom Drawer: Place Logout at the bottom
function CustomDrawerContent(
  props: DrawerContentComponentProps & { signedIn: boolean; onSignOut: () => void }
) {
  const { signedIn, onSignOut, ...rest } = props as any;
  
  // Debug info
  console.log('CustomDrawerContent - signedIn:', signedIn);
  
  return (
    <DrawerContentScrollView {...rest}>
      <DrawerItemList {...rest} />
      {signedIn ? (
        <>
          <View style={{ height: 8 }} />
          <DrawerItem
            label="Log out"
            onPress={async () => {
              console.log('Logout pressed');
              await clearSession();
              showToast.success('Signed out');
              onSignOut(); // Update state immediately
              rest.navigation.closeDrawer();
              rest.navigation.navigate('Auth');
            }}
          />
        </>
      ) : null}
    </DrawerContentScrollView>
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

  // Auto-sync on network recovery
  React.useEffect(() => {
    const sub = NetInfo.addEventListener(state => {
      if (state.isConnected) runFullSync(false);
    });
    return () => sub();
  }, []);

  // Auto-sync when app comes to foreground
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') runFullSync(false);
    });
    return () => sub.remove();
  }, []);

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
      drawerContent={(drawerProps) => (
        <CustomDrawerContent {...drawerProps} signedIn={signedIn} onSignOut={handleSignOut} />
      )}
    >
      <Drawer.Screen
        name="MainApp"
        component={AppStack}
        options={{
          title: 'MyNote',
          headerShown: true,
          headerLeft: () => <DrawerToggleButton />,
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
