import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import RecycleBinScreen from '../screens/RecycleBinScreen';
import NoteDetailsScreen from '../screens/NoteDetailsScreen';
import EditNoteScreen from '../screens/EditNoteScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import ImageViewerScreen from '../screens/ImageViewerScreen';
import { Text } from 'react-native';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarInactiveTintColor: '#6A4E3B' }}>
      <Tab.Screen name="Recycle" component={RecycleBinScreen} options={{ title: 'Recycle' }} />
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
    </Tab.Navigator>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="NoteDetails" component={NoteDetailsScreen} options={{ title: 'Note' }} />
      <Stack.Screen name="EditNote" component={EditNoteScreen} options={{ title: 'Edit' }} />
      <Stack.Screen name="ImageViewer" component={ImageViewerScreen} options={{ title: 'Image' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerTitle: () => <Text style={{ fontWeight: '700' }}>MyNote</Text>,
      }}>
      <Drawer.Screen name="Dashboard" component={DashboardStack} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} options={{ title: 'About Us' }} />
    </Drawer.Navigator>
  );
}
