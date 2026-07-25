import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  return (
    <Screen>
      <AppText variant="caption" muted>INSIGHTS</AppText>
      <AppText variant="h1" style={styles.title}>Entenda mudanças no seu padrão</AppText>
      <Surface style={styles.card}>
        <AppText variant="h2">Sem diagnósticos automáticos</AppText>
        <AppText muted>Os relatórios apresentarão tendências registradas, contexto e perguntas úteis para levar ao profissional.</AppText>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { marginTop: spacing.xs, marginBottom: spacing.xl }, card: { gap: spacing.sm } });
