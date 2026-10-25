import * as LocalAuthentication from 'expo-local-authentication';

import { withAuthPrompt } from '@/lib/auth-prompt';

export type BiometricStatus = 'ready' | 'not-enrolled' | 'unavailable';

export async function getBiometricStatus(): Promise<BiometricStatus> {
  if (!(await LocalAuthentication.hasHardwareAsync())) return 'unavailable';
  if (!(await LocalAuthentication.isEnrolledAsync())) return 'not-enrolled';
  return 'ready';
}

/** Shows the system biometric prompt. Resolves false if the user cancels or it fails. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await withAuthPrompt(() => LocalAuthentication.authenticateAsync({ promptMessage }));
  return result.success;
}
