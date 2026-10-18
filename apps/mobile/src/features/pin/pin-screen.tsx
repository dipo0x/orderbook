import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavBar } from '@/components/ui/nav-bar';
import { ScreenHeading } from '@/components/ui/screen-heading';

import { PinDots } from './pin-dots';
import { PinKeypad } from './pin-keypad';

type PinScreenProps = {
  title: string;
  body: string;
  filled: number;
  /** Line under the dots. Red when `error`, accent when `link`, muted otherwise. */
  message?: ReactNode;
  messageTone?: 'muted' | 'error' | 'link';
  onMessagePress?: () => void;
  /** Hides the back button, for unlock screens that have nowhere to go back to. */
  onBack?: () => void;
  showNavBar?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  keypadDisabled?: boolean;
};

const MESSAGE_COLOR = {
  muted: 'text-ink-muted',
  error: 'text-sell',
  link: 'text-accent',
} as const;

/** Layout shared by every PIN screen: heading, dots, a line of feedback, and the keypad. */
export function PinScreen({
  title,
  body,
  filled,
  message,
  messageTone = 'muted',
  onMessagePress,
  onBack,
  showNavBar = true,
  onDigit,
  onBackspace,
  keypadDisabled,
}: PinScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      {showNavBar ? <NavBar onBack={onBack} /> : null}
      <View className="gap-6 px-6 pt-2">
        <ScreenHeading title={title} body={body} />
        <PinDots filled={filled} tone={messageTone === 'error' ? 'error' : 'default'} />
        {message ? (
          <Text
            onPress={onMessagePress}
            className={`text-center font-inter-medium text-[13px] leading-5 ${MESSAGE_COLOR[messageTone]}`}>
            {message}
          </Text>
        ) : null}
      </View>
      <View className="flex-1" />
      <View style={{ paddingBottom: insets.bottom }}>
        <PinKeypad onDigit={onDigit} onBackspace={onBackspace} disabled={keypadDisabled} />
      </View>
    </View>
  );
}
