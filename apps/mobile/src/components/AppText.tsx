import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type Variant = keyof typeof typography;

type Props = PropsWithChildren<TextProps & { variant?: Variant; muted?: boolean }>;

export function AppText({ variant = 'body', muted = false, style, children, ...props }: Props) {
  return (
    <Text
      {...props}
      style={[styles.base, typography[variant], muted && styles.muted, style]}
      allowFontScaling
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text },
  muted: { color: colors.textMuted },
});
