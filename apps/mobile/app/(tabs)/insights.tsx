import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { listRecentCarePracticeCompletions } from '@/data/care-practice-repository';
import { listCheckInsInRange } from '@/data/check-in-repository';
import { listJournalEntries } from '@/data/journal-repository';
import { listRecentMedicationIntakes } from '@/data/medication-repository';
import { buildPersonalSummary, formatPersonalSummary, moodSummaryLabel, type InsightPeriod, type PersonalSummary } from '@/services/insights';
import { useSync } from '@/sync/SyncProvider';
import { colors, spacing } from '@/theme/tokens';

function periodBounds(period: InsightPeriod): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (period === 'week') {
    const weekday = from.getDay();
    const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
    from.setDate(from.getDate() - daysSinceMonday);
  }
  return { from: from.toISOString(), to: new Date(to.getTime() + 1).toISOString() };
}

function inRange(value: string, from: string, to: string): boolean {
  return value >= from && value < to;
}

export default function InsightsScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [period, setPeriod] = useState<InsightPeriod>('week');
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const bounds = useMemo(() => periodBounds(period), [period]);

  const load = useCallback(async () => {
    if (!session) return;
    const [journalEntries, checkIns, medicationIntakes, practiceCompletions] = await Promise.all([
      listJournalEntries(session.user.id, { from: bounds.from, to: bounds.to, includeArchived: false, limit: 500 }),
      listCheckInsInRange(session.user.id, bounds.from, bounds.to),
      listRecentMedicationIntakes(session.user.id, 500),
      listRecentCarePracticeCompletions(session.user.id, 500),
    ]);
    setSummary(buildPersonalSummary({
      period,
      from: bounds.from,
      to: bounds.to,
      journalEntries,
      checkIns,
      medicationIntakes: medicationIntakes.filter((item) => inRange(item.plannedAt, bounds.from, bounds.to)),
      practiceCompletions: practiceCompletions.filter((item) => inRange(item.plannedAt, bounds.from, bounds.to)),
    }));
  }, [bounds.from, bounds.to, period, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load, sync.lastSuccessAt]));

  async function share() {
    if (!summary) return;
    try {
      await Share.share({ message: formatPersonalSummary(summary), title: 'Resumo BemMeCuida' });
    } catch {
      Alert.alert('Não foi possível compartilhar', 'Tente novamente.');
    }
  }

  return (
    <Screen>
      <AppText variant="caption" muted>INSIGHTS PESSOAIS</AppText>
      <AppText variant="h1" style={styles.title}>Observe o que você registrou</AppText>
      <Surface style={styles.notice}>
        <AppText variant="bodyStrong">Descrição, não diagnóstico</AppText>
        <AppText variant="caption" muted>Os resumos contam ocorrências e frequências nos seus próprios registros. Não explicam causas, não fazem previsões e não substituem avaliação profissional.</AppText>
      </Surface>

      <View style={styles.periods}>
        <ChoiceChip label="Hoje" selected={period === 'day'} onPress={() => setPeriod('day')} />
        <ChoiceChip label="Esta semana" selected={period === 'week'} onPress={() => setPeriod('week')} />
      </View>

      {summary ? (
        <>
          <View style={styles.metrics}>
            <Surface style={styles.metric}><AppText variant="h1">{summary.journalCount}</AppText><AppText variant="caption" muted>Diário</AppText></Surface>
            <Surface style={styles.metric}><AppText variant="h1">{summary.checkInCount}</AppText><AppText variant="caption" muted>Check-ins</AppText></Surface>
            <Surface style={styles.metric}><AppText variant="h1">{summary.therapyFlagCount}</AppText><AppText variant="caption" muted>Para terapia</AppText></Surface>
          </View>

          <Surface style={styles.card}>
            <AppText variant="h2">Resumo do período</AppText>
            {summary.observations.map((observation) => <AppText key={observation}>• {observation}</AppText>)}
          </Surface>

          <Surface style={styles.card}>
            <AppText variant="h2">Indicadores registrados</AppText>
            <AppText muted>Estado mais frequente: {summary.dominantMood ? moodSummaryLabel[summary.dominantMood] : 'sem dados'}</AppText>
            <AppText muted>Intensidade média do diário: {summary.averageIntensity ?? 'não registrada'}</AppText>
            <AppText muted>Medicamentos com registro: {summary.medicationRecorded}</AppText>
            <AppText muted>Práticas com registro: {summary.practicesRecorded}</AppText>
            <AppText muted>Marcadores: {summary.topTags.length ? summary.topTags.map((item) => `${item.tag} (${item.count})`).join(', ') : 'nenhum'}</AppText>
          </Surface>
          <PrimaryButton label="Compartilhar resumo sem textos do diário" onPress={() => void share()} />
        </>
      ) : <Surface><AppText muted>Preparando seu resumo local…</AppText></Surface>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs, marginBottom: spacing.lg },
  notice: { gap: spacing.sm, backgroundColor: colors.sky, marginBottom: spacing.lg },
  periods: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metric: { flex: 1, alignItems: 'center', gap: spacing.xs, padding: spacing.md },
  card: { gap: spacing.md, marginBottom: spacing.md },
});
