import { Stack } from 'expo-router';

import { SendProvider } from '@/features/send/send-context';

export default function SendLayout() {
  return (
    <SendProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SendProvider>
  );
}
