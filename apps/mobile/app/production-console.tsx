import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import {
  advanceProductionRollout,
  listHealthSnapshots,
  listProductionIncidents,
  listProductionRollouts,
  listStoreSubmissions,
  openProductionIncident,
  pauseProductionRollout,
  recordHealthSnapshot,
  registerStoreSubmission,
  rollbackProductionRollout,
  startProductionRollout,
  updateProductionIncident,
  updateStoreSubmission,
  type IncidentSeverity,
  type IncidentStatus,
  type ProductionHealthSnapshot,
  type ProductionIncident,
  type ProductionRollout,
  type StoreName,
  type StoreSubmission,
  type StoreSubmissionStatus,
  type StoreTrack,
} from '@/data/production-operations-repository';
import {
  isReleaseOperator,
  listReleaseBuilds,
  listReleaseCandidates,
  type ReleaseBuild,
  type ReleaseCandidate,
} from '@/data/release-operations-repository';
import {
  evaluateProductionRollout,
  type ProductionRolloutStep,
} from '@/services/production-rollout-policy';
import { colors, spacing } from '@/theme/tokens';

const rolloutSteps: ProductionRolloutStep[] = [5, 10, 25, 50, 100];
const submissionStatuses: StoreSubmissionStatus[] = ['draft', 'uploaded', 'in_review', 'approved', 'published', 'rejected', 'withdrawn'];
const severities: IncidentSeverity[] = ['sev1', 'sev2', 'sev3', 'sev4'];

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function numeric(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ProductionConsoleScreen() {
  const { session } = useAuth();
  const authorized = isReleaseOperator(session);
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [builds, setBuilds] = useState<ReleaseBuild[]>([]);
  const [submissions, setSubmissions] = useState<StoreSubmission[]>([]);
  const [rollouts, setRollouts] = useState<ProductionRollout[]>([]);
  const [selectedRolloutId, setSelectedRolloutId] = useState<string | null>(null);
  const [health, setHealth] = useState<ProductionHealthSnapshot[]>([]);
  const [incidents, setIncidents] = useState<ProductionIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [store, setStore] = useState<StoreName>('google_play');
  const [track, setTrack] = useState<StoreTrack>('production');
  const [submissionStatus, setSubmissionStatus] = useState<StoreSubmissionStatus>('uploaded');
  const [selectedBuildId, setSelectedBuildId] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [operationNotes, setOperationNotes] = useState('Registro operacional sem dados pessoais ou emocionais.');
  const [targetPercent, setTargetPercent] = useState<ProductionRolloutStep>(5);

  const [crashFree, setCrashFree] = useState('99.5');
  const [syncSuccess, setSyncSuccess] = useState('98');
  const [authSuccess, setAuthSuccess] = useState('99');
  const [notificationSuccess, setNotificationSuccess] = useState('98');
  const [supportTickets, setSupportTickets] = useState('0');
  const [blockers, setBlockers] = useState('0');
  const [sampledSessions, setSampledSessions] = useState('0');

  const [incidentSeverity, setIncidentSeverity] = useState<IncidentSeverity>('sev3');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentSummary, setIncidentSummary] = useState('');
  const [incidentImpact, setIncidentImpact] = useState('');
  const [incidentUpdate, setIncidentUpdate] = useState('Situação revisada pela operação.');

  const selectedCandidate = candidates.find((item) => item.id === selectedCandidateId) ?? null;
  const selectedRollout = rollouts.find((item) => item.id === selectedRolloutId) ?? null;
  const latestHealth = health[0] ?? null;
  const storeBuilds = builds.filter((item) => item.status === 'available' && item.audience === 'store');
  const approvedSubmissions = submissions.filter((item) => item.status === 'approved' || item.status === 'published');

  const rolloutEvaluation = useMemo(() => {
    if (!selectedRollout) return null;
    return evaluateProductionRollout({
      rollout: selectedRollout,
      targetPercent,
      latestHealth,
      incidents: incidents.filter((item) => item.candidateId === selectedRollout.candidateId),
    });
  }, [incidents, latestHealth, selectedRollout, targetPercent]);

  const loadCandidateData = useCallback(async (candidateId: string) => {
    const [nextBuilds, nextSubmissions, nextRollouts, nextIncidents] = await Promise.all([
      listReleaseBuilds(candidateId),
      listStoreSubmissions(candidateId),
      listProductionRollouts(candidateId),
      listProductionIncidents(candidateId),
    ]);
    setBuilds(nextBuilds);
    setSubmissions(nextSubmissions);
    setRollouts(nextRollouts);
    setIncidents(nextIncidents);
    setSelectedBuildId((current) => current || nextBuilds.find((item) => item.status === 'available' && item.audience === 'store')?.id || '');
    setSelectedRolloutId((current) => current && nextRollouts.some((item) => item.id === current) ? current : nextRollouts[0]?.id ?? null);
  }, []);

  const load = useCallback(async () => {
    if (!authorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextCandidates = await listReleaseCandidates();
      setCandidates(nextCandidates);
      const candidateId = selectedCandidateId ?? nextCandidates.find((item) => item.status === 'promoted')?.id ?? nextCandidates[0]?.id ?? null;
      setSelectedCandidateId(candidateId);
      if (candidateId) await loadCandidateData(candidateId);
    } finally {
      setLoading(false);
    }
  }, [authorized, loadCandidateData, selectedCandidateId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    if (!selectedCandidateId || !authorized) return;
    void loadCandidateData(selectedCandidateId);
  }, [authorized, loadCandidateData, selectedCandidateId]);

  useEffect(() => {
    if (!selectedRolloutId) {
      setHealth([]);
      return;
    }
    void listHealthSnapshots(selectedRolloutId).then(setHealth).catch(() => setHealth([]));
  }, [selectedRolloutId]);

  async function runAction(action: () => Promise<void>, successMessage: string) {
    setWorking(true);
    try {
      await action();
      await load();
      Alert.alert('Operação registrada', successMessage);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'operation_failed';
      Alert.alert('Operação bloqueada', `A regra do servidor não permitiu a ação. Código: ${detail}`);
    } finally {
      setWorking(false);
    }
  }

  async function saveSubmission() {
    if (!selectedCandidate || !selectedBuildId) return;
    await runAction(async () => {
      await registerStoreSubmission({
        candidateId: selectedCandidate.id,
        buildId: selectedBuildId,
        store,
        track,
        status: submissionStatus,
        externalReference: externalReference.trim() || null,
        notes: operationNotes.trim() || null,
      });
    }, 'A submissão foi registrada ou atualizada.');
  }

  async function changeSubmissionStatus(submission: StoreSubmission, status: StoreSubmissionStatus) {
    await runAction(async () => {
      await updateStoreSubmission({
        submissionId: submission.id,
        status,
        externalReference: externalReference.trim() || null,
        notes: operationNotes.trim() || null,
      });
    }, `A submissão foi atualizada para ${status}.`);
  }

  async function startRollout() {
    if (!selectedCandidate) return;
    const submission = approvedSubmissions.find((item) => item.store === store) ?? approvedSubmissions[0];
    if (!submission) {
      Alert.alert('Submissão necessária', 'Registre uma submissão aprovada ou publicada antes de iniciar o rollout.');
      return;
    }
    const rolloutTrack: ProductionRollout['track'] = track === 'internal' ? 'closed' : track;
    await runAction(async () => {
      await startProductionRollout({
        candidateId: selectedCandidate.id,
        submissionId: submission.id,
        store: submission.store,
        track: rolloutTrack,
        notes: operationNotes.trim() || null,
      });
    }, 'O rollout foi iniciado em 1%.');
  }

  async function saveHealthSnapshot() {
    if (!selectedRollout) return;
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    await runAction(async () => {
      await recordHealthSnapshot({
        rolloutId: selectedRollout.id,
        windowStart: start.toISOString(),
        windowEnd: end.toISOString(),
        crashFreeSessionsPct: numeric(crashFree),
        syncSuccessPct: numeric(syncSuccess),
        authSuccessPct: numeric(authSuccess),
        notificationSuccessPct: notificationSuccess.trim() ? numeric(notificationSuccess) : null,
        supportTicketCount: Math.max(0, Math.trunc(numeric(supportTickets))),
        blockerCount: Math.max(0, Math.trunc(numeric(blockers))),
        sampledSessions: Math.max(0, Math.trunc(numeric(sampledSessions))),
        source: 'aggregated',
      });
    }, 'A leitura agregada foi registrada sem conteúdo pessoal.');
  }

  async function advanceRollout() {
    if (!selectedRollout) return;
    await runAction(async () => {
      await advanceProductionRollout(selectedRollout.id, targetPercent as 5 | 10 | 25 | 50 | 100);
    }, `O rollout avançou para ${targetPercent}%.`);
  }

  function confirmRollback() {
    if (!selectedRollout) return;
    Alert.alert('Reverter rollout?', 'A candidata será marcada como revertida. Use uma justificativa técnica com pelo menos 10 caracteres.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reverter',
        style: 'destructive',
        onPress: () => void runAction(
          () => rollbackProductionRollout(selectedRollout.id, operationNotes),
          'O rollout e a candidata foram marcados como revertidos.',
        ),
      },
    ]);
  }

  async function openIncident() {
    if (!selectedCandidate) return;
    await runAction(async () => {
      await openProductionIncident({
        candidateId: selectedCandidate.id,
        rolloutId: selectedRollout?.id ?? null,
        severity: incidentSeverity,
        title: incidentTitle,
        summary: incidentSummary,
        technicalImpact: incidentImpact.trim() || null,
      });
      setIncidentTitle('');
      setIncidentSummary('');
      setIncidentImpact('');
    }, 'O incidente foi aberto e o evento entrou na auditoria.');
  }

  async function updateIncident(incident: ProductionIncident, status: IncidentStatus) {
    await runAction(
      () => updateProductionIncident(incident.id, status, incidentUpdate),
      `O incidente foi atualizado para ${status}.`,
    );
  }

  if (!authorized) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityRole="button"><AppText variant="bodyStrong">← Voltar</AppText></Pressable>
        <Surface style={styles.section}>
          <AppText variant="h1">Acesso restrito</AppText>
          <AppText muted>Este console exige papel operacional assinado no app_metadata da sessão.</AppText>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable testID="production-console-back" onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>
      <AppText variant="caption" muted style={styles.eyebrow}>PRODUÇÃO E INCIDENTES</AppText>
      <AppText variant="h1" testID="production-console-title">Operação pós-publicação</AppText>
      <AppText muted>Gerencie submissões, rollout gradual, saúde agregada e incidentes. O servidor revalida cada avanço.</AppText>

      {loading ? <Surface><AppText muted>Carregando operação…</AppText></Surface> : null}

      <Surface style={styles.section}>
        <AppText variant="h2">Candidata promovida</AppText>
        <View style={styles.chips}>
          {candidates.map((candidate) => (
            <ChoiceChip
              key={candidate.id}
              label={`${candidate.version} RC ${candidate.rcNumber} · ${candidate.status}`}
              selected={candidate.id === selectedCandidateId}
              onPress={() => setSelectedCandidateId(candidate.id)}
            />
          ))}
        </View>
        {selectedCandidate ? <AppText muted>{selectedCandidate.title}</AppText> : <AppText muted>Nenhuma candidata disponível.</AppText>}
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Submissão nas lojas</AppText>
        <View style={styles.chips}>
          <ChoiceChip label="Google Play" selected={store === 'google_play'} onPress={() => setStore('google_play')} />
          <ChoiceChip label="App Store" selected={store === 'app_store'} onPress={() => setStore('app_store')} />
        </View>
        <AppText variant="bodyStrong">Build de loja</AppText>
        <View style={styles.chips}>
          {storeBuilds.map((build) => (
            <ChoiceChip
              key={build.id}
              label={`${build.platform} #${build.buildNumber}`}
              selected={selectedBuildId === build.id}
              onPress={() => setSelectedBuildId(build.id)}
            />
          ))}
        </View>
        <AppText variant="bodyStrong">Trilha</AppText>
        <View style={styles.chips}>
          {(['internal','closed','open','production','testflight'] as StoreTrack[]).map((value) => (
            <ChoiceChip key={value} label={value} selected={track === value} onPress={() => setTrack(value)} />
          ))}
        </View>
        <AppText variant="bodyStrong">Estado</AppText>
        <View style={styles.chips}>
          {submissionStatuses.map((value) => (
            <ChoiceChip key={value} label={value} selected={submissionStatus === value} onPress={() => setSubmissionStatus(value)} />
          ))}
        </View>
        <TextField label="Referência externa" value={externalReference} onChangeText={setExternalReference} maxLength={240} />
        <TextField label="Notas operacionais" value={operationNotes} onChangeText={setOperationNotes} maxLength={2000} multiline />
        <PrimaryButton testID="production-register-submission" label="Registrar submissão" loading={working} disabled={!selectedBuildId || !selectedCandidate} onPress={() => void saveSubmission()} />
        {submissions.map((submission) => (
          <View key={submission.id} style={styles.item}>
            <AppText variant="bodyStrong">{submission.store} · {submission.track}</AppText>
            <AppText muted>{submission.status} · atualizado em {formattedDate(submission.updatedAt)}</AppText>
            <View style={styles.chips}>
              <ChoiceChip label="Aprovada" selected={submission.status === 'approved'} onPress={() => void changeSubmissionStatus(submission, 'approved')} />
              <ChoiceChip label="Publicada" selected={submission.status === 'published'} onPress={() => void changeSubmissionStatus(submission, 'published')} />
              <ChoiceChip label="Retirada" selected={submission.status === 'withdrawn'} onPress={() => void changeSubmissionStatus(submission, 'withdrawn')} />
            </View>
          </View>
        ))}
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Rollout gradual</AppText>
        <PrimaryButton testID="production-start-rollout" label="Iniciar em 1%" loading={working} disabled={!selectedCandidate || approvedSubmissions.length === 0} onPress={() => void startRollout()} />
        <View style={styles.chips}>
          {rollouts.map((rollout) => (
            <ChoiceChip
              key={rollout.id}
              label={`${rollout.store} · ${rollout.targetPercent}% · ${rollout.status}`}
              selected={rollout.id === selectedRolloutId}
              onPress={() => setSelectedRolloutId(rollout.id)}
            />
          ))}
        </View>
        {selectedRollout ? (
          <>
            <AppText muted>Iniciado em {formattedDate(selectedRollout.startedAt)} · trilha {selectedRollout.track}</AppText>
            <AppText variant="bodyStrong">Próxima onda</AppText>
            <View style={styles.chips}>
              {rolloutSteps.map((step) => (
                <ChoiceChip key={step} label={`${step}%`} selected={targetPercent === step} onPress={() => setTargetPercent(step)} />
              ))}
            </View>
            {rolloutEvaluation && !rolloutEvaluation.eligible ? (
              <View style={styles.warning}>
                <AppText variant="bodyStrong">Bloqueadores atuais</AppText>
                {rolloutEvaluation.blockers.map((item) => <AppText key={item} muted>• {item}</AppText>)}
              </View>
            ) : <AppText style={styles.success}>A leitura local indica que a próxima onda pode ser solicitada ao servidor.</AppText>}
            <PrimaryButton testID="production-advance-rollout" label={`Avançar para ${targetPercent}%`} loading={working} disabled={!rolloutEvaluation?.eligible} onPress={() => void advanceRollout()} />
            <View style={styles.buttonGroup}>
              <SecondaryButton label="Pausar rollout" disabled={selectedRollout.status !== 'active'} onPress={() => void runAction(() => pauseProductionRollout(selectedRollout.id, operationNotes), 'O rollout foi pausado.')} />
              <PrimaryButton tone="danger" label="Reverter rollout" disabled={selectedRollout.status === 'rolled_back'} onPress={confirmRollback} />
            </View>
          </>
        ) : <AppText muted>Nenhum rollout iniciado para esta candidata.</AppText>}
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Saúde agregada</AppText>
        <AppText muted>Use apenas percentuais e contagens técnicas agregadas. Não inclua textos de usuários, emoções ou dados clínicos.</AppText>
        <View style={styles.metricGrid}>
          <TextField label="Sessões sem falha %" value={crashFree} onChangeText={setCrashFree} keyboardType="decimal-pad" />
          <TextField label="Sync com sucesso %" value={syncSuccess} onChangeText={setSyncSuccess} keyboardType="decimal-pad" />
          <TextField label="Auth com sucesso %" value={authSuccess} onChangeText={setAuthSuccess} keyboardType="decimal-pad" />
          <TextField label="Notificações %" value={notificationSuccess} onChangeText={setNotificationSuccess} keyboardType="decimal-pad" />
          <TextField label="Chamados de suporte" value={supportTickets} onChangeText={setSupportTickets} keyboardType="number-pad" />
          <TextField label="Bloqueadores" value={blockers} onChangeText={setBlockers} keyboardType="number-pad" />
          <TextField label="Sessões amostradas" value={sampledSessions} onChangeText={setSampledSessions} keyboardType="number-pad" />
        </View>
        <PrimaryButton testID="production-record-health" label="Registrar janela de 1 hora" loading={working} disabled={!selectedRollout} onPress={() => void saveHealthSnapshot()} />
        {latestHealth ? (
          <AppText muted>Última leitura: crash-free {latestHealth.crashFreeSessionsPct}% · sync {latestHealth.syncSuccessPct}% · auth {latestHealth.authSuccessPct}% · {latestHealth.blockerCount} bloqueador(es).</AppText>
        ) : null}
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Incidentes</AppText>
        <View style={styles.chips}>
          {severities.map((value) => <ChoiceChip key={value} label={value.toUpperCase()} selected={incidentSeverity === value} onPress={() => setIncidentSeverity(value)} />)}
        </View>
        <TextField testID="production-incident-title" label="Título técnico" value={incidentTitle} onChangeText={setIncidentTitle} maxLength={160} />
        <TextField label="Resumo técnico" value={incidentSummary} onChangeText={setIncidentSummary} maxLength={2000} multiline />
        <TextField label="Impacto técnico" value={incidentImpact} onChangeText={setIncidentImpact} maxLength={2000} multiline />
        <PrimaryButton testID="production-open-incident" label="Abrir incidente" loading={working} disabled={!selectedCandidate || incidentTitle.trim().length < 5 || incidentSummary.trim().length < 10} onPress={() => void openIncident()} />
        <TextField label="Atualização da timeline" value={incidentUpdate} onChangeText={setIncidentUpdate} maxLength={2000} />
        {incidents.map((incident) => (
          <View key={incident.id} style={styles.item}>
            <AppText variant="bodyStrong">{incident.severity.toUpperCase()} · {incident.title}</AppText>
            <AppText muted>{incident.status} · aberto em {formattedDate(incident.startedAt)}</AppText>
            <AppText>{incident.summary}</AppText>
            <View style={styles.chips}>
              <ChoiceChip label="Monitorando" selected={incident.status === 'monitoring'} onPress={() => void updateIncident(incident, 'monitoring')} />
              <ChoiceChip label="Resolvido" selected={incident.status === 'resolved'} onPress={() => void updateIncident(incident, 'resolved')} />
            </View>
          </View>
        ))}
      </Surface>

      <AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl },
  section: { gap: spacing.lg, marginTop: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonGroup: { gap: spacing.sm },
  item: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  metricGrid: { gap: spacing.md },
  warning: { gap: spacing.xs, padding: spacing.md, backgroundColor: colors.warningSoft },
  success: { color: colors.primaryStrong },
  signature: { textAlign: 'center', marginVertical: spacing.xl },
});
