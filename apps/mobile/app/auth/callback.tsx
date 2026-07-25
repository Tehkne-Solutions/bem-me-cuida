import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/theme/tokens';

export default function AuthCallbackScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primaryStrong} />
      <AppText variant="h2" style={styles.center}>Protegendo seu acesso…</AppText>
      <AppText muted style={styles.center}>A confirmação será concluída e você seguirá para o aplicativo.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  center: { textAlign: 'center' },
});
