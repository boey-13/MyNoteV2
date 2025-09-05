// src/screens/AboutScreen.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';

export default function AboutScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>About Us</Text>
    </View>
  );
}
