import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { getWeeklyActivityFacts, type WeeklyActivityFacts } from '@/data/recent-activity-repository';
import { colors, radius, spacing } from '@/theme/tokens';

const emptyFacts: WeeklyActivityFacts = {
  medicationRecords: 0,
  practiceRecords: 0,
  checkInRecords: 0,
  activeDays: 0,
  checkInDays: 0,
  totalRecords: 0,
};

function sevenDayStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();
}

export function WeeklyFactualSummary({ refreshToken }: { refreshToken: string }) {
  const { session } = useAuth();
  const [facts, setFacts] = useState<WeeklyActivityFacts>(emptyFacts);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setFacts(await getWeeklyActivityFacts(session.user.id, sevenDayStartIso()));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [refreshToken, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <>
      <View style={styles.headingRow}>
        <View>
          <AppText variant="h2">Últimos 7 dias</AppText>
          <AppText variant="caption" muted>Hoje e os seis dias anteriores</AppText>
        </View>
        <Link href="/care-history" asChild>
          <Pressable testID="home-open-weekly-history" accessibilityRole="button">
            <AppText variant="caption" style={styles.linkText}>Ver histórico</AppText>
          </Pressable>
        </Link>
      </View>

      <Surface testID="home-weekly-factual-summary" style={styles.card}>
        {failed ? (
          <View style={styles.emptyState}>
            <AppText variant="bodyStrong">Não foi possível atualizar a semana agora.</AppText>
            <AppText variant="caption" muted>Os registros continuam salvos no aplicativo.</AppText>
          </View>
        ) : facts.totalRecords > 0 ? (
          <>
            <View style={styles.grid}>
              <View style={styles.metric}><AppText variant="display">{facts.medicationRecords}</AppText><AppText variant="caption" muted>medicações registradas</AppText></View>
              <View style={styles.metric}><AppText variant="display">{facts.practiceRecords}</AppText><AppText variant="caption" muted>práticas registradas</AppText></View>
              <View style={styles.metric}><AppText variant="display">{facts.checkInDays}/7</AppText><AppText variant="caption" muted>dias com check-in</AppText></View>
              <View style={styles.metric}><AppText variant="display">{facts.activeDays}/7</AppText><AppText variant="caption" muted>dias com algum registro</AppText></View>
            </View>
            <View style={styles.noteBox}>
              <AppText variant="caption" muted>{facts.totalRecords} registro(s) no período. As contagens descrevem apenas o que foi salvo no aplicativo.</AppText>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <AppText variant="bodyStrong">Nenhum registro nos últimos 7 dias.</AppText>
            <AppText variant="caption" muted>Tomadas, práticas e check-ins aparecerão aqui quando forem registrados.</AppText>
          </View>
        )}
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md },
  linkText: { color: colors.primaryStrong, fontWeight: '700' },
  card: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '47%', minWidth: 130, gap: spacing.xs, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  noteBox: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  emptyState: { gap: spacing.sm, paddingVertical: spacing.sm },
});
