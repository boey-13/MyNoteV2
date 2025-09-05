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

// ✅ 自定义 Drawer：把 Logout 放在最底部
function CustomDrawerContent(
  props: DrawerContentComponentProps & { signedIn: boolean; onSignOut: () => void }
) {
  const { signedIn, onSignOut, ...rest } = props as any;
  
  // 调试信息
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
              onSignOut(); // 立即更新状态
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

  // 定期检查登录状态变化（确保状态同步）
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
    }, 1000); // 每秒检查一次

    return () => clearInterval(interval);
  }, []);

  const handleSignOut = React.useCallback(() => {
    console.log('handleSignOut called');
    setSignedIn(false);
  }, []);

  // 调试信息
  console.log('RootNavigator - signedIn:', signedIn, 'checked:', checked);

  if (!checked) {
    return null; // 简单的 splash 占位，必要可换成自定义
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
          drawerItemStyle: signedIn ? undefined : { display: 'none' }, // 未登录时隐藏
        }}
      />
      <Drawer.Screen
        name="Auth"
        component={AuthStack}
        options={{
          title: 'Sign In',
          headerShown: false,
          drawerItemStyle: signedIn ? { display: 'none' } : undefined, // 登录后隐藏
        }}
      />
      <Drawer.Screen name="About" component={AboutScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
