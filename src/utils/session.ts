// utils/session.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'session.user_id';

export async function setCurrentUserId(id: number) {
  await AsyncStorage.setItem(KEY, String(id));
}
export async function getCurrentUserId(): Promise<number | null> {
  const v = await AsyncStorage.getItem(KEY);
  return v ? Number(v) : null;
}
export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}
