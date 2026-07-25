import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { spacing } from '@/theme/tokens';

export default function DiaryScreen() {
  return (
    <Screen>
      <AppText variant="caption" muted>DIÁRIO EMOCIONAL</AppText>
      <AppText variant="h1" style={styles.title}>Um espaço para colocar em palavras</AppText>
      <Surface style={styles.card}>
        <AppText variant="h2">Planejado para o Sprint 02</AppText>
        <AppText muted>Texto, emoções, gatilhos, estratégias e marcação para conversar na terapia.</AppText>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { marginTop: spacing.xs, marginBottom: spacing.xl }, card: { gap: spacing.sm } });
