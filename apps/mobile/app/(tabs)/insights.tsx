import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { listRecentCheckIns } from '@/data/check-in-repository';
import { listJournalEntriesSince } from '@/data/journal-repository';
import {
  buildWeeklyInsightSummary,
  journalEmotionLabels,
  moodLabels,
  type WeeklyInsightSummary,
} from '@/services/insights';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const EMPTY_SUMMARY = buildWeeklyInsightSummary([], []);

function weekStart(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - 6);
  return value;
}

function metric(value: number | null, suffix = '/10'): string {
  return value === null ? '—' : `${value}${suffix}`;
}

export default function InsightsScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [summary, setSummary] = useState<WeeklyInsightSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const since = weekStart();
    const [recentCheckIns, entries] = await Promise.all([
      listRecentCheckIns(session.user.id, 30),
      listJournalEntriesSince(session.user.id, since.toISOString()),
    ]);
    const checkIns = recentCheckIns.filter((item) => new Date(item.occurredAt) >= since);
    setSummary(buildWeeklyInsightSummary(checkIns, entries));
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load, sync.lastSuccessAt]));

  return (
    <Screen>
      <AppText variant="caption" muted>INSIGHTS DOS ÚLTIMOS 7 DIAS</AppText>
      <AppText variant="h1" style={styles.title}>Entenda mudanças no seu padrão</AppText>
      <AppText muted style={styles.intro}>Os dados abaixo descrevem somente o que foi registrado. Eles não representam diagnóstico, previsão de crise ou avaliação clínica.</AppText>

      <View style={styles.metrics}>
        <Surface style={styles.metricCard}>
          <AppText variant="caption" muted>Ansiedade média</AppText>
          <AppText variant="h2">{loading ? '…' : metric(summary.averages.anxiety)}</AppText>
        </Surface>
        <Surface style={styles.metricCard}>
          <AppText variant="caption" muted>Energia média</AppText>
          <AppText variant="h2">{loading ? '…' : metric(summary.averages.energy)}</AppText>
        </Surface>
        <Surface style={styles.metricCard}>
          <AppText variant="caption" muted>Concentração</AppText>
          <AppText variant="h2">{loading ? '…' : metric(summary.averages.concentration)}</AppText>
        </Surface>
        <Surface style={styles.metricCard}>
          <AppText variant="caption" muted>Sono médio</AppText>
          <AppText variant="h2">{loading ? '…' : metric(summary.averages.sleepHours, ' h')}</AppText>
        </Surface>
      </View>

      <Surface style={styles.section}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <AppText variant="h2">Cobertura dos registros</AppText>
            <AppText muted>Quanto mais dias registrados, mais contexto você terá para observar mudanças.</AppText>
          </View>
          <View style={styles.coverageBadge}>
            <AppText variant="bodyStrong">{summary.checkInCount + summary.journalCount}</AppText>
            <AppText variant="caption">registros</AppText>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <AppText variant="caption" muted>{summary.checkInCount} check-ins</AppText>
          <AppText variant="caption" muted>{summary.journalCount} entradas no diário</AppText>
          <AppText variant="caption" muted>{summary.therapyNotes} marcadas para conversar</AppText>
        </View>
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Humor e emoções mais presentes</AppText>
        <AppText muted>
          Humor mais registrado: {summary.dominantMood ? moodLabels[summary.dominantMood] : 'ainda sem dados suficientes'}.
        </AppText>
        {summary.topEmotions.length ? (
          <View style={styles.chips}>
            {summary.topEmotions.map(({ emotion, count }) => (
              <View key={emotion} style={styles.emotionChip}>
                <AppText variant="caption">{journalEmotionLabels[emotion]} · {count}</AppText>
              </View>
            ))}
          </View>
        ) : <AppText variant="caption" muted>Registre emoções no Diário para visualizar recorrências.</AppText>}
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Perguntas úteis para refletir</AppText>
        <AppText muted>Leve as perguntas que fizerem sentido para sua terapia ou acompanhamento.</AppText>
        {summary.prompts.map((prompt, index) => (
          <View key={prompt} style={styles.promptRow}>
            <View style={styles.promptNumber}><AppText variant="caption">{index + 1}</AppText></View>
            <AppText style={styles.flex}>{prompt}</AppText>
          </View>
        ))}
      </Surface>

      <SecondaryButton testID="insights-open-reports" label="Criar relatório para compartilhar" onPress={() => router.push('/reports')} />

      <Surface style={styles.notice}>
        <AppText variant="bodyStrong">Sobre análises automáticas</AppText>
        <AppText muted>O BemMeCuida identifica apenas contagens e médias dos seus próprios registros. Nenhuma conclusão clínica é gerada, e decisões sobre tratamento devem permanecer com profissionais habilitados.</AppText>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs, marginBottom: spacing.sm },
  intro: { marginBottom: spacing.xl },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  metricCard: { width: '47%', minWidth: 140, gap: spacing.xs },
  section: { gap: spacing.md, marginBottom: spacing.md },
  rowBetween: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  coverageBadge: { minWidth: 76, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emotionChip: { backgroundColor: colors.lavender, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  promptRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  promptNumber: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sky },
  notice: { gap: spacing.sm, backgroundColor: colors.sand, marginTop: spacing.sm },
});
