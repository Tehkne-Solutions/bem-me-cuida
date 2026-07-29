import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { listActivityPage, type RecentActivity } from '@/data/recent-activity-repository';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  medicationDone: number;
  medicationTotal: number;
  practiceDone: number;
  practiceTotal: number;
  checkInToday: boolean;
  pendingTitles: string[];
  refreshToken: string;
};

function startOfLocalDayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function activityLabel(item: RecentActivity): string {
  if (item.kind === 'medication') return `Medicação registrada às ${timeLabel(item.occurredAt)}`;
  if (item.kind === 'practice') return `Prática registrada às ${timeLabel(item.occurredAt)}`;
  return `Check-in registrado às ${timeLabel(item.occurredAt)}`;
}

export function DailyFactualSummary({
  medicationDone,
  medicationTotal,
  practiceDone,
  practiceTotal,
  checkInToday,
  pendingTitles,
  refreshToken,
}: Props) {
  const { session } = useAuth();
  const [todayActivities, setTodayActivities] = useState<RecentActivity[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const page = await listActivityPage(session.user.id, {
        since: startOfLocalDayIso(),
        limit: 50,
      });
      setTodayActivities(page.items);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [refreshToken, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const lastActivity = todayActivities[0] ?? null;
  const hasAnyFact = medicationDone > 0 || practiceDone > 0 || checkInToday || todayActivities.length > 0;

  return (
    <>
      <View style={styles.headingRow}>
        <AppText variant="h2">Resumo de hoje</AppText>
        <Link href="/care-history" asChild>
          <Pressable testID="home-open-daily-history" accessibilityRole="button">
            <AppText variant="caption" style={styles.linkText}>Ver detalhes</AppText>
          </Pressable>
        </Link>
      </View>

      <Surface testID="home-daily-factual-summary" style={styles.card}>
        {failed ? (
          <View style={styles.emptyState}>
            <AppText variant="bodyStrong">Não foi possível atualizar o resumo agora.</AppText>
            <AppText variant="caption" muted>Os demais dados da Home continuam disponíveis.</AppText>
          </View>
        ) : hasAnyFact ? (
          <>
            <View style={styles.factRow}>
              <AppText style={styles.icon}>💊</AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{medicationDone} de {medicationTotal} medicações registradas</AppText>
                <AppText variant="caption" muted>Considera apenas as doses programadas para hoje.</AppText>
              </View>
            </View>
            <View style={styles.factRow}>
              <AppText style={styles.icon}>🌿</AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{practiceDone} de {practiceTotal} práticas concluídas</AppText>
                <AppText variant="caption" muted>Considera apenas práticas programadas para hoje.</AppText>
              </View>
            </View>
            <View style={styles.factRow}>
              <AppText style={styles.icon}>😊</AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{checkInToday ? 'Check-in registrado hoje' : 'Nenhum check-in registrado hoje'}</AppText>
                {lastActivity ? <AppText variant="caption" muted>Última atividade: {activityLabel(lastActivity)}</AppText> : null}
              </View>
            </View>

            {pendingTitles.length ? (
              <View style={styles.pendingBox}>
                <AppText variant="bodyStrong">Ainda para hoje</AppText>
                {pendingTitles.slice(0, 3).map((title) => (
                  <AppText key={title} variant="caption" muted>○ {title}</AppText>
                ))}
                {pendingTitles.length > 3 ? <AppText variant="caption" muted>+ {pendingTitles.length - 3} outro(s) item(ns)</AppText> : null}
              </View>
            ) : (
              <View style={styles.completeBox}>
                <AppText variant="caption" style={styles.completeText}>Nenhuma medicação ou prática programada permanece pendente.</AppText>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <AppText variant="bodyStrong">Nenhum registro feito hoje.</AppText>
            <AppText variant="caption" muted>Check-ins, tomadas e práticas aparecerão aqui conforme forem registrados.</AppText>
          </View>
        )}
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  linkText: { color: colors.primaryStrong, fontWeight: '700' },
  card: { gap: spacing.md },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { fontSize: 22 },
  flex: { flex: 1, gap: spacing.xs },
  pendingBox: { gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  completeBox: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  completeText: { color: colors.primaryStrong },
  emptyState: { gap: spacing.sm, paddingVertical: spacing.sm },
});
