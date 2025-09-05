// src/screens/SettingsScreen.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';

export default function SettingsScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Settings</Text>
    </View>
  );
}
