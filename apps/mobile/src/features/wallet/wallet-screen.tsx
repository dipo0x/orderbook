import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavBar } from '@/components/ui/nav-bar';

type WalletScreenProps = {
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  /** Gap between the content blocks. Figma uses 24 on some screens and 16 on others. */
  gap?: 4 | 6;
  /** Unlock screens have no nav bar. */
  showNavBar?: boolean;
};

/** Shared layout for the wallet setup screens: nav bar, scrolling content, pinned footer. */
export function WalletScreen({
  children,
  footer,
  onBack,
  right,
  gap = 4,
  showNavBar = true,
}: WalletScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      {showNavBar ? <NavBar onBack={onBack} right={right} /> : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName={`px-6 pt-2 ${gap === 6 ? 'gap-6' : 'gap-4'}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? (
          <View className="gap-3 px-6" style={{ paddingBottom: insets.bottom + 8 }}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
