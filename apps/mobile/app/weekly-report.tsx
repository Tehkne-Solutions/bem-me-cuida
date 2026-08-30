import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { getWeeklyActivityFacts, listWeeklyDailyFacts, type DailyActivityFacts, type WeeklyActivityFacts } from '@/data/recent-activity-repository';
import { colors, radius, spacing } from '@/theme/tokens';

const empty: WeeklyActivityFacts = { medicationRecords: 0, practiceRecords: 0, checkInRecords: 0, activeDays: 0, checkInDays: 0, totalRecords: 0 };
function startFor(offset: number): Date { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + offset * 7); }
function endFor(offset: number): Date { const start = startFor(offset); return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7); }
function keyFor(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function fillDays(rows: DailyActivityFacts[], start: Date): DailyActivityFacts[] { const map = new Map(rows.map((r) => [r.date, r])); return Array.from({ length: 7 }, (_, i) => { const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i); const key = keyFor(d); return map.get(key) ?? { date: key, medicationRecords: 0, practiceRecords: 0, checkInRecords: 0, totalRecords: 0 }; }); }
function dateLabel(value: string): string { const [y, m, d] = value.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(y || 0, (m || 1) - 1, d || 1)).replace('.', ''); }

export default function WeeklyReportScreen() {
  const { session } = useAuth();
  const [offset, setOffset] = useState(0); const [facts, setFacts] = useState(empty); const [days, setDays] = useState<DailyActivityFacts[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const load = useCallback(async () => { if (!session) return; setLoading(true); setError(false); try { const start = startFor(offset); const end = endFor(offset); const [weekly, daily] = await Promise.all([getWeeklyActivityFacts(session.user.id, start.toISOString(), end.toISOString()), listWeeklyDailyFacts(session.user.id, start.toISOString(), end.toISOString())]); setFacts(weekly); setDays(fillDays(daily, start)); } catch { setError(true); } finally { setLoading(false); } }, [offset, session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const range = useMemo(() => { const start = startFor(offset); const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6); return `${dateLabel(keyFor(start))} – ${dateLabel(keyFor(end))}`; }, [offset]);
  return <Screen>
    <BackHeader eyebrow="RELATÓRIO SEMANAL" title="Seu período em fatos" />
    <Surface style={styles.nav} testID="weekly-report-period-nav"><Pressable accessibilityRole="button" accessibilityLabel="Semana anterior" onPress={() => setOffset((v) => v - 1)} style={styles.navButton}><AppText variant="bodyStrong">‹</AppText></Pressable><View style={styles.range}><AppText variant="bodyStrong">{offset === 0 ? 'Últimos 7 dias' : range}</AppText><AppText variant="caption" muted>{range}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Próxima semana" disabled={offset >= 0} onPress={() => setOffset((v) => Math.min(0, v + 1))} style={[styles.navButton, offset >= 0 && styles.disabled]}><AppText variant="bodyStrong">›</AppText></Pressable></Surface>
    {loading ? <Surface testID="weekly-report-loading"><AppText muted>Carregando relatório…</AppText></Surface> : error ? <Surface testID="weekly-report-error" style={styles.error}><AppText variant="bodyStrong">Não foi possível carregar este período.</AppText><AppText variant="caption" muted>Os registros continuam salvos no aplicativo.</AppText><Pressable accessibilityRole="button" onPress={() => void load()}><AppText variant="bodyStrong" style={styles.action}>Tentar novamente</AppText></Pressable></Surface> : <>
      <Surface testID="weekly-report-summary" style={styles.card}><AppText variant="h2">Resumo</AppText><View style={styles.grid}><Metric value={facts.totalRecords} label="registros" /><Metric value={facts.medicationRecords} label="medicações" /><Metric value={facts.practiceRecords} label="práticas" /><Metric value={`${facts.checkInDays}/7`} label="dias com check-in" /></View></Surface>
      <Surface testID="weekly-report-daily" style={styles.card}><AppText variant="h2">Dia a dia</AppText><View style={styles.days}>{days.map((day) => <View key={day.date} style={styles.day}><AppText variant="caption" muted>{dateLabel(day.date)}</AppText><AppText variant="display">{day.totalRecords}</AppText><AppText variant="caption" muted>registros</AppText><AppText variant="caption">{day.medicationRecords ? `💊 ${day.medicationRecords}` : ''}{day.practiceRecords ? `  🌿 ${day.practiceRecords}` : ''}{day.checkInRecords ? `  😊 ${day.checkInRecords}` : ''}{day.totalRecords === 0 ? '—' : ''}</AppText></View>)}</View></Surface>
      <Surface testID="weekly-report-categories" style={styles.card}><AppText variant="h2">Por categoria</AppText><FactRow label="Medicações" value={facts.medicationRecords} /><FactRow label="Práticas" value={facts.practiceRecords} /><FactRow label="Check-ins" value={facts.checkInRecords} /></Surface>
      <Surface style={styles.note}><AppText variant="caption" muted>Este relatório descreve somente registros salvos no aplicativo. Não é uma avaliação clínica nem mede eficácia de tratamento.</AppText></Surface>
    </>}
  </Screen>;
}
function Metric({ value, label }: { value: number | string; label: string }) { return <View style={styles.metric}><AppText variant="display">{value}</AppText><AppText variant="caption" muted>{label}</AppText></View>; }
function FactRow({ label, value }: { label: string; value: number }) { return <View style={styles.factRow}><AppText variant="bodyStrong">{label}</AppText><AppText variant="bodyStrong">{value}</AppText></View>; }
const styles = StyleSheet.create({ nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }, navButton: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.35 }, range: { flex: 1, alignItems: 'center', gap: spacing.xs }, card: { gap: spacing.md, marginBottom: spacing.lg }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, metric: { width: '47%', minWidth: 130, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs }, days: { flexDirection: 'row', gap: spacing.xs }, day: { flex: 1, minWidth: 40, alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, gap: spacing.xs }, factRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border }, error: { gap: spacing.sm, backgroundColor: colors.dangerSoft }, action: { color: colors.primaryStrong }, note: { marginBottom: spacing.xl, backgroundColor: colors.primarySoft } });
