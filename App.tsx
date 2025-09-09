import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import ThemeProvider from './src/theme/ThemeProvider';
import ThemedToast from './src/components/Toast';
import { getDB } from './src/db/sqlite';
import { initializeAutoSync } from './src/utils/sync';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#FFFAEC' },
};

export default function App() {
  useEffect(() => {
    // Initialize DB on app start
    getDB().then(() => console.log('[DB] initialized')).catch(err => console.error('[DB] init error', err));
    
    // Initialize auto sync
    initializeAutoSync().catch(err => console.error('[AutoSync] init error', err));
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
        <ThemedToast />
      </NavigationContainer>
    </ThemeProvider>
  );
}
