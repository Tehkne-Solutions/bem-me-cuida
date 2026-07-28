import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { CheckIn } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { listTodayCarePractices } from '@/data/care-practice-repository';
import { listRecentCheckIns } from '@/data/check-in-repository';
import { listLowStockMedications, listTodayMedicationDoses } from '@/data/medication-repository';
import { listAppointments } from '@/data/care-management-repository';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const moodLabel: Record<CheckIn['mood'], string> = {
  very_low: 'Muito difícil',
  low: 'Difícil',
  neutral: 'Neutro',
  good: 'Bem',
  very_good: 'Muito bem',
};

type CareSummary = {
  medicationTotal: number;
  medicationDone: number;
  practiceTotal: number;
  practiceDone: number;
  lowStock: number;
  upcomingAppointments: number;
};

type HomeDataState = 'loading' | 'ready' | 'error';

const emptyCareSummary: CareSummary = {
  medicationTotal: 0,
  medicationDone: 0,
  practiceTotal: 0,
  practiceDone: 0,
  lowStock: 0,
  upcomingAppointments: 0,
};

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const sync = useSync();
  const [latest, setLatest] = useState<CheckIn | null>(null);
  const [care, setCare] = useState<CareSummary>(emptyCareSummary);
  const [dataState, setDataState] = useState<HomeDataState>('loading');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const focusedRef = useRef(false);

  const loadHomeData = useCallback(async () => {
    if (!session) return;

    if (!hasLoadedOnce) setDataState('loading');

    try {
      const [checkIns, doses, practices, lowStock, appointments] = await Promise.all([
        listRecentCheckIns(session.user.id, 1),
        listTodayMedicationDoses(session.user.id),
        listTodayCarePractices(session.user.id),
        listLowStockMedications(session.user.id),
        listAppointments(session.user.id, { limit: 20 }),
      ]);

      if (!focusedRef.current) return;

      setLatest(checkIns[0] ?? null);
      setCare({
        medicationTotal: doses.length,
        medicationDone: doses.filter((item) => item.intake?.status === 'taken').length,
        practiceTotal: practices.length,
        practiceDone: practices.filter((item) => item.completion?.status === 'completed').length,
        lowStock: lowStock.length,
        upcomingAppointments: appointments.filter((item) => item.status === 'scheduled').length,
      });
      setHasLoadedOnce(true);
      setDataState('ready');
    } catch {
      if (!focusedRef.current) return;
      setDataState('error');
    }
  }, [hasLoadedOnce, session]);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    void loadHomeData();

    return () => {
      focusedRef.current = false;
    };
  }, [loadHomeData, sync.lastSuccessAt]));

  const syncLabel = sync.status === 'syncing'
    ? 'Sincronizando…'
    : sync.status === 'offline'
      ? 'Sem internet · salvo no aparelho'
      : sync.status === 'error'
        ? 'Sincronização pendente'
        : sync.pending > 0
          ? `${sync.pending} registro${sync.pending === 1 ? '' : 's'} aguardando envio`
          : 'Dados sincronizados';

  const careTotal = care.medicationTotal + care.practiceTotal;
  const careDone = care.medicationDone + care.practiceDone;
  const showBlockingError = dataState === 'error' && !hasLoadedOnce;
  const showRefreshWarning = dataState === 'error' && hasLoadedOnce;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" muted>BEMMECUIDA</AppText>
          <AppText variant="h1" testID="home-title">Olá, {profile?.displayName ?? 'por aí'} 🌿</AppText>
        </View>
        <View style={styles.headerActions}>
          <Link href="/settings" asChild>
            <Pressable testID="home-open-settings" accessibilityRole="button" accessibilityLabel="Abrir conta e privacidade" style={styles.settingsButton}>
              <AppText variant="caption" style={styles.settingsText}>Conta</AppText>
            </Pressable>
          </Link>
          <Link href="/crisis" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Abrir apoio imediato" style={styles.helpButton}>
              <AppText variant="caption" style={styles.helpText}>Preciso de apoio</AppText>
            </Pressable>
          </Link>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Sincronizar registros agora" onPress={() => void sync.syncNow()} style={styles.syncRow}>
        <AppText variant="caption" style={styles.syncText}>{syncLabel}</AppText>
        <AppText variant="caption" style={styles.syncAction}>Atualizar</AppText>
      </Pressable>

      {dataState === 'loading' ? (
        <Surface style={styles.statusCard} testID="home-data-loading">
          <AppText variant="bodyStrong">Preparando seu resumo…</AppText>
          <AppText variant="caption" muted>Os registros continuam salvos enquanto organizamos os dados desta tela.</AppText>
        </Surface>
      ) : null}

      {showBlockingError ? (
        <Surface style={[styles.statusCard, styles.errorCard]} testID="home-data-error">
          <AppText variant="bodyStrong">Não foi possível carregar seu resumo agora.</AppText>
          <AppText variant="caption" muted>Seus registros não foram apagados. Tente novamente para ler os dados salvos no aparelho.</AppText>
          <Pressable testID="home-retry-data" accessibilityRole="button" onPress={() => void loadHomeData()} style={styles.retryButton}>
            <AppText variant="bodyStrong" style={styles.retryText}>Tentar novamente</AppText>
          </Pressable>
        </Surface>
      ) : null}

      {showRefreshWarning ? (
        <Pressable testID="home-data-refresh-warning" accessibilityRole="button" onPress={() => void loadHomeData()} style={styles.warningRow}>
          <AppText variant="caption" style={styles.warningText}>Não conseguimos atualizar agora. O último resumo válido continua visível.</AppText>
          <AppText variant="caption" style={styles.syncAction}>Tentar de novo</AppText>
        </Pressable>
      ) : null}

      {!showBlockingError ? (
        <>
          <LinearGradient colors={[colors.primarySoft, colors.sky]} style={styles.hero}>
            <AppText variant="h2">Como você está agora?</AppText>
            <AppText muted>Um registro curto pode ajudar a perceber seu momento com mais clareza.</AppText>
            <Link href="/(tabs)/check-in" asChild>
              <Pressable testID="home-open-check-in" style={styles.heroAction} accessibilityRole="button">
                <AppText variant="bodyStrong" style={styles.heroActionText}>Fazer check-in</AppText>
              </Pressable>
            </Link>
          </LinearGradient>

          <AppText variant="h2" style={styles.sectionTitle}>Cuidados de hoje</AppText>
          <Surface style={styles.careCard}>
            <View style={styles.rowBetween}>
              <View>
                <AppText variant="display">{careDone}/{careTotal}</AppText>
                <AppText variant="caption" muted>{careTotal ? 'cuidados registrados como realizados' : 'nenhum cuidado programado'}</AppText>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${careTotal ? Math.round((careDone / careTotal) * 100) : 0}%` }]} />
              </View>
            </View>
            <View style={styles.careLinks}>
              <Link href="/medications" asChild>
                <Pressable style={styles.careLink} accessibilityRole="button">
                  <AppText variant="bodyStrong">💊 Medicamentos</AppText>
                  <AppText variant="caption" muted>{care.medicationDone}/{care.medicationTotal}</AppText>
                </Pressable>
              </Link>
              <Link href="/routines" asChild>
                <Pressable style={styles.careLink} accessibilityRole="button">
                  <AppText variant="bodyStrong">🌿 Práticas</AppText>
                  <AppText variant="caption" muted>{care.practiceDone}/{care.practiceTotal}</AppText>
                </Pressable>
              </Link>
            </View>
            <View style={styles.careLinks}>
              <Link href="/appointments" asChild><Pressable style={styles.careLink} accessibilityRole="button"><AppText variant="bodyStrong">🗓️ Consultas</AppText><AppText variant="caption" muted>{care.upcomingAppointments} próxima(s)</AppText></Pressable></Link>
              <Link href="/medications" asChild><Pressable style={styles.careLink} accessibilityRole="button"><AppText variant="bodyStrong">📦 Reposição</AppText><AppText variant="caption" muted>{care.lowStock} aviso(s)</AppText></Pressable></Link>
            </View>
            <AppText variant="caption" muted>Não completar tudo não apaga o que você conseguiu fazer.</AppText>
          </Surface>

          <AppText variant="h2" style={styles.sectionTitle}>Resumo emocional</AppText>
          <Surface>
            {latest ? (
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <AppText variant="caption" muted>Último humor</AppText>
                  <AppText variant="bodyStrong">{moodLabel[latest.mood]}</AppText>
                </View>
                <View style={styles.summaryItem}>
                  <AppText variant="caption" muted>Ansiedade</AppText>
                  <AppText variant="bodyStrong">{latest.anxiety}/10</AppText>
                </View>
                <View style={styles.summaryItem}>
                  <AppText variant="caption" muted>Energia</AppText>
                  <AppText variant="bodyStrong">{latest.energy}/10</AppText>
                </View>
              </View>
            ) : (
              <AppText muted>Seu primeiro resumo aparecerá depois de um check-in.</AppText>
            )}
          </Surface>
        </>
      ) : null}

      <AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.xl },
  flex: { flex: 1 },
  headerActions: { gap: spacing.sm, alignItems: 'flex-end' },
  settingsButton: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  settingsText: { color: colors.primaryStrong },
  helpButton: { backgroundColor: colors.dangerSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  helpText: { color: colors.danger },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  syncText: { color: colors.textMuted },
  syncAction: { color: colors.primaryStrong, fontWeight: '700' },
  statusCard: { gap: spacing.sm, marginBottom: spacing.md },
  errorCard: { backgroundColor: colors.dangerSoft },
  retryButton: { alignSelf: 'flex-start', marginTop: spacing.sm, backgroundColor: colors.primaryStrong, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.white },
  warningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.sand, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  warningText: { color: colors.text, flex: 1 },
  hero: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  heroAction: { alignSelf: 'flex-start', marginTop: spacing.md, backgroundColor: colors.primaryStrong, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  heroActionText: { color: colors.white },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  careCard: { gap: spacing.lg },
  rowBetween: { gap: spacing.md },
  progressTrack: { height: 8, backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primaryStrong, borderRadius: radius.pill },
  careLinks: { flexDirection: 'row', gap: spacing.md },
  careLink: { flex: 1, gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  summaryGrid: { flexDirection: 'row', gap: spacing.md },
  summaryItem: { flex: 1, gap: spacing.xs },
  signature: { textAlign: 'center', marginTop: spacing.xxxl, marginBottom: spacing.xl },
});
