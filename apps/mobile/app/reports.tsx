import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { listAppointmentsInRange, listTreatments } from '@/data/care-management-repository';
import { listCarePracticeCompletionsInRange, listCarePractices } from '@/data/care-practice-repository';
import { listCheckInsInRange } from '@/data/check-in-repository';
import { listJournalEntriesSince } from '@/data/journal-repository';
import { listMedicationIntakesInRange, listMedications } from '@/data/medication-repository';
import {
  buildLongitudinalReport,
  formatLongitudinalReport,
  type LongitudinalReport,
  type ReportPeriodDays,
  type ReportPrivacyOptions,
} from '@/services/health-report';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const periodOptions: Array<{ days: ReportPeriodDays; label: string }> = [
  { days: 1, label: 'Hoje' },
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
];

const defaultPrivacy: ReportPrivacyOptions = {
  includeMoodAndSymptoms: true,
  includeSleep: true,
  includeJournalThemes: true,
  includeCareAdherence: true,
  includeMedicationNames: false,
  includeTreatmentNames: false,
};

function rangeFor(days: ReportPeriodDays): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setHours(0, 0, 0, 0);
  if (days > 1) from.setDate(from.getDate() - (days - 1));
  return { from: from.toISOString(), to: new Date(to.getTime() + 1).toISOString() };
}

function metric(value: number | null, suffix = ''): string {
  return value === null ? '—' : `${value}${suffix}`;
}

export default function ReportsScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [periodDays, setPeriodDays] = useState<ReportPeriodDays>(7);
  const [privacy, setPrivacy] = useState<ReportPrivacyOptions>(defaultPrivacy);
  const [report, setReport] = useState<LongitudinalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const bounds = useMemo(() => rangeFor(periodDays), [periodDays]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [checkIns, journalEntries, medicationIntakes, medicationRows, practiceCompletions, practices, appointments, treatments] = await Promise.all([
        listCheckInsInRange(session.user.id, bounds.from, bounds.to),
        listJournalEntriesSince(session.user.id, bounds.from),
        listMedicationIntakesInRange(session.user.id, bounds.from, bounds.to),
        listMedications(session.user.id, false),
        listCarePracticeCompletionsInRange(session.user.id, bounds.from, bounds.to),
        listCarePractices(session.user.id, false),
        listAppointmentsInRange(session.user.id, bounds.from, bounds.to),
        listTreatments(session.user.id, true),
      ]);
      setReport(buildLongitudinalReport({
        periodDays,
        from: bounds.from,
        to: bounds.to,
        checkIns,
        journalEntries: journalEntries.filter((entry) => entry.occurredAt < bounds.to),
        medicationIntakes,
        medications: medicationRows,
        practiceCompletions,
        practices,
        appointments,
        treatments,
      }));
    } finally {
      setLoading(false);
    }
  }, [bounds.from, bounds.to, periodDays, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load, sync.lastSuccessAt]));

  function toggle<K extends keyof ReportPrivacyOptions>(key: K, value: ReportPrivacyOptions[K]) {
    setPrivacy((current) => ({ ...current, [key]: value }));
  }

  async function shareReport() {
    if (!report) return;
    try {
      await Share.share({
        title: 'Relatório BemMeCuida',
        message: formatLongitudinalReport(report, privacy),
      });
    } catch {
      Alert.alert('Não foi possível compartilhar', 'Revise as permissões do aparelho e tente novamente.');
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>

      <AppText variant="caption" muted style={styles.eyebrow}>RELATÓRIO LOCAL</AppText>
      <AppText variant="h1" testID="reports-title">Acompanhamento para revisar e conversar</AppText>
      <AppText muted style={styles.intro}>O relatório é calculado no aparelho. Textos do diário nunca são incluídos, e nomes de medicamentos ou tratamentos ficam desativados por padrão.</AppText>

      <View style={styles.periods}>
        {periodOptions.map((option) => (
          <ChoiceChip key={option.days} label={option.label} selected={periodDays === option.days} onPress={() => setPeriodDays(option.days)} />
        ))}
      </View>

      {loading || !report ? (
        <Surface><AppText muted>Preparando o resumo no aparelho…</AppText></Surface>
      ) : (
        <>
          <View style={styles.metrics}>
            <Surface style={styles.metricCard}><AppText variant="caption" muted>Check-ins</AppText><AppText variant="h2">{report.checkIns.count}</AppText></Surface>
            <Surface style={styles.metricCard}><AppText variant="caption" muted>Diário</AppText><AppText variant="h2">{report.journal.count}</AppText></Surface>
            <Surface style={styles.metricCard}><AppText variant="caption" muted>Adesão registrada</AppText><AppText variant="h2">{metric(report.medication.adherencePercent, '%')}</AppText></Surface>
            <Surface style={styles.metricCard}><AppText variant="caption" muted>Sono médio</AppText><AppText variant="h2">{metric(report.checkIns.averageSleepHours, ' h')}</AppText></Surface>
          </View>

          <Surface style={styles.section}>
            <AppText variant="h2">Cobertura</AppText>
            <AppText muted>{report.dataCoverage.daysWithCheckIn} dia(s) com check-in e {report.dataCoverage.daysWithJournal} dia(s) com diário no período.</AppText>
            <AppText variant="caption" muted>Ausência de registro não significa ausência de sintomas, cuidado ou tratamento.</AppText>
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Escolha o que compartilhar</AppText>
            <CheckboxRow checked={privacy.includeMoodAndSymptoms} onChange={(value) => toggle('includeMoodAndSymptoms', value)} label="Humor e indicadores registrados" />
            <CheckboxRow checked={privacy.includeSleep} onChange={(value) => toggle('includeSleep', value)} label="Resumo do sono" />
            <CheckboxRow checked={privacy.includeJournalThemes} onChange={(value) => toggle('includeJournalThemes', value)} label="Temas do diário" description="Inclui somente emoções, gatilhos e estratégias — nunca o texto." />
            <CheckboxRow checked={privacy.includeCareAdherence} onChange={(value) => toggle('includeCareAdherence', value)} label="Adesão a medicamentos e práticas" />
            <CheckboxRow checked={privacy.includeMedicationNames} onChange={(value) => toggle('includeMedicationNames', value)} label="Incluir nomes e doses dos medicamentos" description="Ative apenas quando quiser compartilhar essa informação sensível." />
            <CheckboxRow checked={privacy.includeTreatmentNames} onChange={(value) => toggle('includeTreatmentNames', value)} label="Incluir tratamentos e consultas" />
          </Surface>

          <Surface style={styles.notice}>
            <AppText variant="bodyStrong">Antes de enviar</AppText>
            <AppText muted>Revise o texto na janela de compartilhamento e confirme o destinatário. O BemMeCuida não envia relatórios automaticamente.</AppText>
          </Surface>

          <PrimaryButton testID="reports-share" label="Revisar e compartilhar relatório" onPress={() => void shareReport()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl },
  intro: { marginTop: spacing.sm, marginBottom: spacing.xl },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  metricCard: { width: '47%', minWidth: 140, gap: spacing.xs },
  section: { gap: spacing.md, marginBottom: spacing.md },
  notice: { gap: spacing.sm, backgroundColor: colors.sand, borderRadius: radius.md, marginBottom: spacing.md },
});
