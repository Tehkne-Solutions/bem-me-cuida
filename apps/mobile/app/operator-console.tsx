import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { getAppMetadata } from '@/config/app-metadata';
import {
  createReleaseCandidate,
  isReleaseOperator,
  listBetaTesters,
  listOperatorAuditLog,
  listOperatorFeedback,
  listReleaseBuilds,
  listReleaseCandidates,
  listReleaseGates,
  promoteReleaseCandidate,
  registerReleaseBuild,
  revokeReleaseBuild,
  setBetaTesterStatus,
  setReleaseGate,
  setReleaseStatus,
  updateOperatorFeedback,
  type BetaTester,
  type OperatorAuditEntry,
  type OperatorFeedback,
  type OperatorFeedbackPriority,
  type OperatorFeedbackStatus,
  type ReleaseBuild,
  type ReleaseBuildAudience,
  type ReleaseCandidate,
  type ReleaseGate,
  type ReleaseGateStatus,
  type ReleasePlatform,
} from '@/data/release-operations-repository';
import { evaluateReleasePromotion } from '@/services/release-promotion-policy';
import { colors, spacing } from '@/theme/tokens';

const gateStatuses: Array<{ value: ReleaseGateStatus; label: string }> = [
  { value: 'passed', label: 'Passou' },
  { value: 'failed', label: 'Falhou' },
  { value: 'pending', label: 'Pendente' },
];

const priorities: Array<{ value: OperatorFeedbackPriority; label: string }> = [
  { value: 'low', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const statusLabel: Record<ReleaseCandidate['status'], string> = {
  draft: 'Rascunho',
  qa: 'Em QA',
  blocked: 'Bloqueada',
  approved: 'Aprovada',
  promoted: 'Promovida',
  rolled_back: 'Revertida',
};

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function OperatorConsoleScreen() {
  const { session } = useAuth();
  const metadata = useMemo(() => getAppMetadata(), []);
  const authorized = isReleaseOperator(session);

  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gates, setGates] = useState<ReleaseGate[]>([]);
  const [builds, setBuilds] = useState<ReleaseBuild[]>([]);
  const [feedback, setFeedback] = useState<OperatorFeedback[]>([]);
  const [testers, setTesters] = useState<BetaTester[]>([]);
  const [audit, setAudit] = useState<OperatorAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [candidateTitle, setCandidateTitle] = useState('BemMeCuida 0.10.0 RC 2');
  const [candidateNotes, setCandidateNotes] = useState('Candidata para homologação final e preparação das lojas.');
  const [candidateNumber, setCandidateNumber] = useState('2');
  const [releaseNotes, setReleaseNotes] = useState('Atualização registrada pelo console operacional.');

  const [buildNumber, setBuildNumber] = useState('');
  const [artifactUrl, setArtifactUrl] = useState('');
  const [artifactSha256, setArtifactSha256] = useState('');
  const [buildPlatform, setBuildPlatform] = useState<ReleasePlatform>('android');
  const [buildAudience, setBuildAudience] = useState<ReleaseBuildAudience>('internal');

  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedId) ?? null;
  const candidateFeedback = feedback.filter((item) => item.candidateId === selectedId);
  const readiness = selectedCandidate
    ? evaluateReleasePromotion({
        candidateStatus: selectedCandidate.status,
        gates,
        builds,
        feedback: candidateFeedback,
      })
    : null;

  const loadCandidateDetails = useCallback(async (candidateId: string | null) => {
    if (!candidateId) {
      setGates([]);
      setBuilds([]);
      return;
    }
    const [nextGates, nextBuilds] = await Promise.all([
      listReleaseGates(candidateId),
      listReleaseBuilds(candidateId),
    ]);
    setGates(nextGates);
    setBuilds(nextBuilds);
  }, []);

  const load = useCallback(async () => {
    if (!authorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextCandidates, nextFeedback, nextTesters, nextAudit] = await Promise.all([
        listReleaseCandidates(),
        listOperatorFeedback(),
        listBetaTesters(),
        listOperatorAuditLog(),
      ]);
      setCandidates(nextCandidates);
      setFeedback(nextFeedback);
      setTesters(nextTesters);
      setAudit(nextAudit);
      const nextSelected = selectedId && nextCandidates.some((item) => item.id === selectedId)
        ? selectedId
        : nextCandidates[0]?.id ?? null;
      setSelectedId(nextSelected);
      await loadCandidateDetails(nextSelected);
    } catch {
      Alert.alert('Não foi possível carregar', 'Confirme o papel de operador e a migration do Sprint 10.');
    } finally {
      setLoading(false);
    }
  }, [authorized, loadCandidateDetails, selectedId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function selectCandidate(candidateId: string) {
    setSelectedId(candidateId);
    setWorking(true);
    try {
      await loadCandidateDetails(candidateId);
    } finally {
      setWorking(false);
    }
  }

  async function createCandidate() {
    const rcNumber = Number(candidateNumber);
    if (!Number.isInteger(rcNumber) || rcNumber < 1) {
      Alert.alert('Número inválido', 'Informe um número inteiro de RC.');
      return;
    }
    if (candidateTitle.trim().length < 3) {
      Alert.alert('Título obrigatório', 'Descreva a candidata de release.');
      return;
    }
    setWorking(true);
    try {
      const id = await createReleaseCandidate({
        version: metadata.version,
        rcNumber,
        title: candidateTitle,
        notes: candidateNotes.trim() || null,
      });
      await load();
      await selectCandidate(id);
      Alert.alert('Candidata criada', `${metadata.version}-rc.${rcNumber} está pronta para os gates.`);
    } catch (error) {
      Alert.alert('Não foi possível criar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setWorking(false);
    }
  }

  async function updateGate(gate: ReleaseGate, status: ReleaseGateStatus) {
    if (!selectedCandidate) return;
    setWorking(true);
    try {
      await setReleaseGate({
        candidateId: selectedCandidate.id,
        gateKey: gate.gateKey,
        status,
        evidence: `Atualizado no console em ${new Date().toISOString()}`,
      });
      await loadCandidateDetails(selectedCandidate.id);
    } catch (error) {
      Alert.alert('Gate não atualizado', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setWorking(false);
    }
  }

  async function registerBuild() {
    if (!selectedCandidate) return;
    if (!buildNumber.trim() || !artifactUrl.trim().startsWith('https://')) {
      Alert.alert('Build incompleto', 'Informe o número e uma URL HTTPS do artefato.');
      return;
    }
    setWorking(true);
    try {
      await registerReleaseBuild({
        candidateId: selectedCandidate.id,
        platform: buildPlatform,
        buildProfile: 'rc',
        buildNumber,
        artifactUrl,
        artifactSha256: artifactSha256.trim() || null,
        audience: buildAudience,
      });
      setBuildNumber('');
      setArtifactUrl('');
      setArtifactSha256('');
      await loadCandidateDetails(selectedCandidate.id);
    } catch (error) {
      Alert.alert('Build não registrado', error instanceof Error ? error.message : 'Revise os dados.');
    } finally {
      setWorking(false);
    }
  }

  function confirmRevokeBuild(build: ReleaseBuild) {
    Alert.alert('Revogar este build?', 'O link continuará no histórico, mas não poderá ser distribuído.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revogar',
        style: 'destructive',
        onPress: () => {
          void revokeReleaseBuild(build.id, 'Revogado pelo console operacional após revisão.')
            .then(() => selectedCandidate && loadCandidateDetails(selectedCandidate.id))
            .catch(() => Alert.alert('Não foi possível revogar', 'Tente novamente.'));
        },
      },
    ]);
  }

  async function changeCandidateStatus(status: 'draft' | 'qa' | 'blocked' | 'approved' | 'rolled_back') {
    if (!selectedCandidate) return;
    setWorking(true);
    try {
      await setReleaseStatus(selectedCandidate.id, status, releaseNotes.trim() || null);
      await load();
    } catch (error) {
      Alert.alert('Status não alterado', error instanceof Error ? error.message : 'Revise os bloqueadores.');
    } finally {
      setWorking(false);
    }
  }

  function confirmPromotion() {
    if (!selectedCandidate) return;
    Alert.alert(
      'Promover candidata?',
      'A promoção será registrada em auditoria. O envio às lojas ainda depende das credenciais e consoles externos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Promover',
          onPress: () => {
            setWorking(true);
            void promoteReleaseCandidate(selectedCandidate.id)
              .then(load)
              .catch((error: unknown) => Alert.alert('Promoção bloqueada', error instanceof Error ? error.message : 'Revise os gates.'))
              .finally(() => setWorking(false));
          },
        },
      ],
    );
  }

  async function triageFeedback(
    item: OperatorFeedback,
    status: OperatorFeedbackStatus,
    priority: OperatorFeedbackPriority = item.priority,
  ) {
    setWorking(true);
    try {
      await updateOperatorFeedback({
        feedbackId: item.id,
        status,
        priority,
        operatorNotes: `Triagem atualizada em ${new Date().toISOString()}`,
        candidateId: selectedCandidate?.id ?? item.candidateId,
      });
      await load();
    } catch (error) {
      Alert.alert('Feedback não atualizado', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setWorking(false);
    }
  }

  async function toggleTester(item: BetaTester) {
    setWorking(true);
    try {
      await setBetaTesterStatus(item.userId, item.status === 'active' ? 'paused' : 'active');
      await load();
    } catch {
      Alert.alert('Tester não atualizado', 'Tente novamente.');
    } finally {
      setWorking(false);
    }
  }

  if (!authorized) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityRole="button"><AppText variant="bodyStrong">← Voltar</AppText></Pressable>
        <Surface style={styles.denied}>
          <AppText variant="h1" testID="operator-access-denied">Acesso restrito</AppText>
          <AppText muted>Esta área exige `app_metadata.role` igual a `release_operator` ou `release_admin`.</AppText>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable testID="operator-console-back" onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>

      <AppText variant="caption" muted style={styles.eyebrow}>OPERAÇÃO INTERNA</AppText>
      <AppText variant="h1" testID="operator-console-title">Release control</AppText>
      <AppText muted style={styles.intro}>Gates, builds, feedback e promoção com RLS, RPCs auditadas e nenhum segredo administrativo no cliente.</AppText>

      {loading ? <Surface><AppText muted>Carregando operação…</AppText></Surface> : null}

      {!loading ? (
        <>
          <Surface style={styles.section}>
            <AppText variant="h2">Criar candidata</AppText>
            <View style={styles.row}>
              <View style={styles.flex}><TextField label="Versão" value={metadata.version} editable={false} /></View>
              <View style={styles.small}><TextField testID="operator-rc-number" label="RC" value={candidateNumber} onChangeText={setCandidateNumber} keyboardType="number-pad" /></View>
            </View>
            <TextField testID="operator-candidate-title" label="Título" value={candidateTitle} onChangeText={setCandidateTitle} maxLength={160} />
            <TextField label="Notas" value={candidateNotes} onChangeText={setCandidateNotes} maxLength={2000} multiline style={styles.multiline} />
            <PrimaryButton testID="operator-create-candidate" label="Criar candidata e gates" loading={working} onPress={() => void createCandidate()} />
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Candidatas</AppText>
            <View style={styles.chips}>
              {candidates.map((candidate) => (
                <ChoiceChip
                  key={candidate.id}
                  label={`${candidate.version}-rc.${candidate.rcNumber} · ${statusLabel[candidate.status]}`}
                  selected={candidate.id === selectedId}
                  onPress={() => void selectCandidate(candidate.id)}
                />
              ))}
            </View>
            {!candidates.length ? <AppText muted>Nenhuma candidata registrada.</AppText> : null}
          </Surface>

          {selectedCandidate ? (
            <>
              <Surface style={styles.section}>
                <AppText variant="h2">{selectedCandidate.title}</AppText>
                <AppText variant="bodyStrong">{selectedCandidate.version}-rc.{selectedCandidate.rcNumber} · {statusLabel[selectedCandidate.status]}</AppText>
                <TextField label="Nota operacional" value={releaseNotes} onChangeText={setReleaseNotes} maxLength={2000} multiline style={styles.multiline} />
                <View style={styles.buttonGroup}>
                  <SecondaryButton testID="operator-status-qa" label="Mover para QA" disabled={working} onPress={() => void changeCandidateStatus('qa')} />
                  <SecondaryButton label="Bloquear candidata" disabled={working} onPress={() => void changeCandidateStatus('blocked')} />
                  <SecondaryButton testID="operator-status-approved" label="Aprovar após gates" disabled={working} onPress={() => void changeCandidateStatus('approved')} />
                  <SecondaryButton label="Registrar rollback" disabled={working} onPress={() => void changeCandidateStatus('rolled_back')} />
                </View>
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Prontidão para promoção</AppText>
                <AppText variant="bodyStrong" style={readiness?.ready ? styles.ready : styles.blocked}>
                  {readiness?.ready ? 'Pronta para promoção' : 'Promoção bloqueada'}
                </AppText>
                {readiness?.blockers.map((blocker) => <AppText key={blocker} muted>• {blocker}</AppText>)}
                <AppText variant="caption" muted>{readiness?.passedRequiredGateCount}/{readiness?.requiredGateCount} gates obrigatórios · {readiness?.availableAndroidBuilds} build(s) Android · {readiness?.openBlockingFeedback} bloqueador(es)</AppText>
                <PrimaryButton testID="operator-promote-release" label="Promover candidata" disabled={!readiness?.ready || working} onPress={confirmPromotion} />
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Gates de promoção</AppText>
                {gates.map((gate) => (
                  <View key={gate.id} style={styles.item}>
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">{gate.label}{gate.required ? ' *' : ''}</AppText>
                      <AppText variant="caption" muted>{gate.status}{gate.checkedAt ? ` · ${dateLabel(gate.checkedAt)}` : ''}</AppText>
                    </View>
                    <View style={styles.chips}>
                      {gateStatuses.map((option) => (
                        <ChoiceChip
                          key={option.value}
                          label={option.label}
                          selected={gate.status === option.value}
                          onPress={() => void updateGate(gate, option.value)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Registrar build</AppText>
                <View style={styles.chips}>
                  <ChoiceChip label="Android" selected={buildPlatform === 'android'} onPress={() => setBuildPlatform('android')} />
                  <ChoiceChip label="iOS" selected={buildPlatform === 'ios'} onPress={() => setBuildPlatform('ios')} />
                  <ChoiceChip label="Interno" selected={buildAudience === 'internal'} onPress={() => setBuildAudience('internal')} />
                  <ChoiceChip label="Beta fechada" selected={buildAudience === 'closed_beta'} onPress={() => setBuildAudience('closed_beta')} />
                  <ChoiceChip label="Loja" selected={buildAudience === 'store'} onPress={() => setBuildAudience('store')} />
                </View>
                <TextField testID="operator-build-number" label="Número do build" value={buildNumber} onChangeText={setBuildNumber} maxLength={80} />
                <TextField testID="operator-build-url" label="URL HTTPS do artefato" value={artifactUrl} onChangeText={setArtifactUrl} autoCapitalize="none" keyboardType="url" maxLength={1000} />
                <TextField label="SHA-256 opcional" value={artifactSha256} onChangeText={setArtifactSha256} autoCapitalize="none" maxLength={64} />
                <PrimaryButton testID="operator-register-build" label="Registrar build disponível" loading={working} onPress={() => void registerBuild()} />
                {builds.map((build) => (
                  <View key={build.id} style={styles.item}>
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">{build.platform} #{build.buildNumber} · {build.status}</AppText>
                      <AppText variant="caption" muted>{build.audience} · {dateLabel(build.createdAt)}</AppText>
                    </View>
                    {build.status !== 'revoked' ? <SecondaryButton label="Revogar" onPress={() => confirmRevokeBuild(build)} /> : null}
                  </View>
                ))}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Fila de feedback</AppText>
                <AppText muted>Ao triar, o relato é vinculado à candidata selecionada.</AppText>
                {feedback.slice(0, 20).map((item) => (
                  <View key={item.id} style={styles.feedback}>
                    <AppText variant="bodyStrong">{item.category} · {item.impact} · {item.status}</AppText>
                    <AppText>{item.message}</AppText>
                    <View style={styles.chips}>
                      {priorities.map((priority) => (
                        <ChoiceChip
                          key={priority.value}
                          label={priority.label}
                          selected={item.priority === priority.value}
                          onPress={() => void triageFeedback(item, item.status, priority.value)}
                        />
                      ))}
                    </View>
                    <View style={styles.buttonGroup}>
                      <SecondaryButton label="Triar" onPress={() => void triageFeedback(item, 'triaged')} />
                      <SecondaryButton label="Planejar" onPress={() => void triageFeedback(item, 'planned')} />
                      <SecondaryButton label="Resolver" onPress={() => void triageFeedback(item, 'resolved')} />
                    </View>
                  </View>
                ))}
                {!feedback.length ? <AppText muted>Nenhum feedback recebido.</AppText> : null}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Testers</AppText>
                {testers.map((tester) => (
                  <View key={tester.userId} style={styles.item}>
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">{tester.status} · {tester.appVersion}</AppText>
                      <AppText variant="caption" muted>{tester.appVariant} · {tester.platform} · {dateLabel(tester.updatedAt)}</AppText>
                    </View>
                    <SecondaryButton label={tester.status === 'active' ? 'Pausar' : 'Reativar'} onPress={() => void toggleTester(tester)} />
                  </View>
                ))}
                {!testers.length ? <AppText muted>Nenhum tester aderiu à beta.</AppText> : null}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Auditoria recente</AppText>
                {audit.slice(0, 20).map((entry) => (
                  <View key={entry.id} style={styles.auditRow}>
                    <AppText variant="bodyStrong">{entry.action}</AppText>
                    <AppText variant="caption" muted>{entry.entityType} · {dateLabel(entry.createdAt)}</AppText>
                  </View>
                ))}
              </Surface>
            </>
          ) : null}

          <AppText variant="caption" muted style={styles.signature}>Operação interna · Tehkné Solutions</AppText>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl },
  intro: { marginTop: spacing.sm, marginBottom: spacing.xl },
  section: { gap: spacing.lg, marginBottom: spacing.md },
  denied: { marginTop: spacing.xl, gap: spacing.md, borderColor: colors.danger },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  flex: { flex: 1, gap: spacing.xs },
  small: { width: 96 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonGroup: { gap: spacing.sm },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  item: { gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  feedback: { gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  auditRow: { gap: spacing.xs, paddingVertical: spacing.sm },
  ready: { color: colors.primaryStrong },
  blocked: { color: colors.danger },
  signature: { textAlign: 'center', marginVertical: spacing.xl },
});
