import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppAccessibility } from '@/accessibility/AccessibilityProvider';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = PropsWithChildren<{ style?: StyleProp<ViewStyle> }>;

export function Surface({ children, style }: Props) {
  const { preferences } = useAppAccessibility();
  return <View style={[styles.surface, preferences.highContrast && styles.highContrast, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  highContrast: {
    borderColor: '#202A26',
    borderWidth: 2,
  },
});
