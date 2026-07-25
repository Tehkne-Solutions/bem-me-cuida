import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
};

export function CheckboxRow({ checked, label, description, onChange }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <AppText variant="bodyStrong" style={styles.check}>✓</AppText> : null}
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? <AppText variant="caption" muted>{description}</AppText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, alignItems: 'flex-start' },
  pressed: { opacity: 0.72 },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  check: { color: colors.white, lineHeight: 20 },
  copy: { flex: 1, gap: spacing.xs },
});
