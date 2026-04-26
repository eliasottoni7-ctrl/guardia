import { Stack } from 'expo-router';

export default function FoodLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="restaurant" />
    </Stack>
  );
}
