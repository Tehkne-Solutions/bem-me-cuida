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
  createMaintenanceHotfix,
  createOtaUpdatePlan,
  decideMaintenanceHotfix,
  decideOtaUpdatePlan,
  deployBinaryHotfix,
  isReleaseAdmin,
  listHotfixArtifacts,
  listMaintenanceHotfixes,
  listOperationApprovals,
  listOperationsRetentionRuns,
  listOtaUpdatePlans,
  recordOtaPublication,
  registerHotfixArtifact,
  requestMaintenanceHotfixApproval,
  rollbackMaintenanceHotfix,
  runOperationsRetention,
  type HotfixArtifact,
  type MaintenanceHotfix,
  type MaintenanceHotfixKind,
  type MaintenanceHotfixSeverity,
  type OperationApproval,
  type OperationsRetentionRun,
  type OtaUpdatePlan,
} from '@/data/maintenance-operations-repository';
import {
  listHealthSnapshots,
  listProductionIncidents,
  listProductionRollouts,
  type ProductionHealthSnapshot,
  type ProductionIncident,
  type ProductionRollout,
} from '@/data/production-operations-repository';
import { isReleaseOperator } from '@/data/release-operations-repository';
import {
  evaluateOtaCompatibility,
  evaluateRetentionExecution,
  retentionMinimumDays,
} from '@/services/maintenance-policy';
import { colors, radius, spacing } from '@/theme/tokens';

const kinds: Array<{ value: MaintenanceHotfixKind; label: string }> = [
  { value: 'ota', label: 'OTA' },
  { value: 'binary', label: 'Novo binário' },
];
const severities: Array<{ value: MaintenanceHotfixSeverity; label: string }> = [
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];
const rolloutOptions: OtaUpdatePlan['rolloutPercentage'][] = [1, 5, 10, 25, 50, 100];

const statusLabel: Record<MaintenanceHotfix['status'], string> = {
  draft: 'Rascunho',
  awaiting_approval: 'Aguardando aprovação',
  approved: 'Aprovado',
  building: 'Em build',
  ready: 'Pronto',
  deployed: 'Implantado',
  rolled_back: 'Revertido',
  cancelled: 'Cancelado',
};

function dateLabel(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function numberValue(value: string, fallback = 0): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha operacional não identificada.';
}

export default function MaintenanceConsoleScreen() {
  const { session } = useAuth();
  const metadata = useMemo(() => getAppMetadata(), []);
  const authorized = isReleaseOperator(session);
  const adminAccess = isReleaseAdmin(session);

  const [hotfixes, setHotfixes] = useState<MaintenanceHotfix[]>([]);
  const [approvals, setApprovals] = useState<OperationApproval[]>([]);
  const [artifacts, setArtifacts] = useState<HotfixArtifact[]>([]);
  const [otaPlans, setOtaPlans] = useState<OtaUpdatePlan[]>([]);
  const [retentionRuns, setRetentionRuns] = useState<OperationsRetentionRun[]>([]);
  const [rollouts, setRollouts] = useState<ProductionRollout[]>([]);
  const [health, setHealth] = useState<ProductionHealthSnapshot[]>([]);
  const [incidents, setIncidents] = useState<ProductionIncident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [version, setVersion] = useState('0.10.1');
  const [kind, setKind] = useState<MaintenanceHotfixKind>('ota');
  const [severity, setSeverity] = useState<MaintenanceHotfixSeverity>('high');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [runtimeVersion, setRuntimeVersion] = useState(metadata.version);
  const [sourceCommit, setSourceCommit] = useState('');
  const [nativeChanges, setNativeChanges] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');

  const [artifactPlatform, setArtifactPlatform] = useState<HotfixArtifact['platform']>('android');
  const [artifactBuild, setArtifactBuild] = useState('');
  const [artifactUrl, setArtifactUrl] = useState('');
  const [artifactSha, setArtifactSha] = useState('');

  const [otaMessage, setOtaMessage] = useState('Correção operacional validada para produção.');
  const [otaFingerprint, setOtaFingerprint] = useState('');
  const [otaAssetCount, setOtaAssetCount] = useState('1');
  const [otaRollout, setOtaRollout] = useState<OtaUpdatePlan['rolloutPercentage']>(5);
  const [otaApprovalComment, setOtaApprovalComment] = useState('');
  const [updateGroupId, setUpdateGroupId] = useState('');
  const [rollbackReason, setRollbackReason] = useState('');
  const [retentionConfirmation, setRetentionConfirmation] = useState('');

  const load = useCallback(async () => {
    if (!authorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextHotfixes, nextApprovals, nextArtifacts, nextPlans, nextRetention, nextRollouts, nextIncidents] = await Promise.all([
        listMaintenanceHotfixes(),
        listOperationApprovals(),
        listHotfixArtifacts(),
        listOtaUpdatePlans(),
        listOperationsRetentionRuns(),
        listProductionRollouts(),
        listProductionIncidents(),
      ]);
      setHotfixes(nextHotfixes);
      setApprovals(nextApprovals);
      setArtifacts(nextArtifacts);
      setOtaPlans(nextPlans);
      setRetentionRuns(nextRetention);
      setRollouts(nextRollouts);
      setIncidents(nextIncidents);
      setSelectedId((current) => current && nextHotfixes.some((item) => item.id === current)
        ? current
        : nextHotfixes[0]?.id ?? null);
      setHealth(nextRollouts[0] ? await listHealthSnapshots(nextRollouts[0].id) : []);
    } catch (error) {
      Alert.alert('Não foi possível carregar a sustentação', errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const selectedHotfix = useMemo(
    () => hotfixes.find((item) => item.id === selectedId) ?? null,
    [hotfixes, selectedId],
  );
  const selectedApprovals = useMemo(
    () => approvals.filter((item) => item.entityId === selectedId),
    [approvals, selectedId],
  );
  const selectedArtifacts = useMemo(
    () => artifacts.filter((item) => item.hotfixId === selectedId),
    [artifacts, selectedId],
  );
  const selectedPlan = useMemo(
    () => otaPlans.find((item) => item.hotfixId === selectedId) ?? null,
    [otaPlans, selectedId],
  );
  const planApprovals = useMemo(
    () => selectedPlan ? approvals.filter((item) => item.entityId === selectedPlan.id && item.decision === 'approved') : [],
    [approvals, selectedPlan],
  );
  const latestHealth = health[0] ?? null;
  const latestRollout = rollouts[0] ?? null;
  const openCriticalIncidents = incidents.filter((item) => item.status !== 'resolved' && (item.severity === 'sev1' || item.severity === 'sev2'));
  const latestRetention = retentionRuns[0] ?? null;

  const otaEvaluation = selectedHotfix && selectedPlan
    ? evaluateOtaCompatibility({
        kind: selectedHotfix.kind,
        status: selectedHotfix.status,
        nativeChanges: selectedHotfix.nativeChanges,
        requiresBinary: selectedHotfix.requiresBinary,
        targetRuntimeVersion: selectedHotfix.targetRuntimeVersion,
        planRuntimeVersion: selectedPlan.runtimeVersion,
        targetChannel: selectedHotfix.targetChannel,
        planChannel: selectedPlan.channel,
        fingerprintSha256: selectedPlan.fingerprintSha256,
        assetCount: selectedPlan.assetCount,
        approvalCount: planApprovals.length,
        rolloutPercentage: selectedPlan.rolloutPercentage,
      })
    : null;

  async function perform(action: () => Promise<unknown>, success: string) {
    setWorking(true);
    try {
      await action();
      Alert.alert('Operação registrada', success);
      await load();
    } catch (error) {
      Alert.alert('Operação bloqueada', errorMessage(error));
    } finally {
      setWorking(false);
    }
  }

  function createHotfix() {
    void perform(async () => {
      await createMaintenanceHotfix({
        version,
        kind,
        severity,
        title,
        summary,
        targetRuntimeVersion: runtimeVersion,
        targetChannel: 'production',
        sourceCommit,
        nativeChanges,
      });
      setTitle('');
      setSummary('');
      setSourceCommit('');
      setNativeChanges(false);
    }, 'O hotfix foi criado como rascunho.');
  }

  if (!authorized) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityRole="button"><AppText variant="bodyStrong">← Voltar</AppText></Pressable>
        <Surface style={styles.section}>
          <AppText variant="h1">Acesso restrito</AppText>
          <AppText muted>O console de sustentação exige um papel operacional assinado no app_metadata.</AppText>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable testID="maintenance-back" onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>
      <AppText variant="caption" muted style={styles.eyebrow}>SUSTENTAÇÃO E HOTFIX</AppText>
      <AppText variant="h1" testID="maintenance-console-title">Saúde, correções e continuidade</AppText>
      <AppText muted style={styles.intro}>Versão instalada {metadata.releaseLabel}. Nenhuma ação externa é executada sem credenciais e confirmação operacional.</AppText>

      <Surface style={styles.section}>
        <AppText variant="h2">Visão consolidada</AppText>
        <View style={styles.metricGrid}>
          <View style={styles.metric}><AppText variant="caption" muted>Rollout</AppText><AppText variant="bodyStrong">{latestRollout ? `${latestRollout.targetPercent}% · ${latestRollout.status}` : 'Sem rollout'}</AppText></View>
          <View style={styles.metric}><AppText variant="caption" muted>Sessões sem falha</AppText><AppText variant="bodyStrong">{latestHealth ? `${latestHealth.crashFreeSessionsPct.toFixed(2)}%` : 'Sem leitura'}</AppText></View>
          <View style={styles.metric}><AppText variant="caption" muted>Sync</AppText><AppText variant="bodyStrong">{latestHealth ? `${latestHealth.syncSuccessPct.toFixed(2)}%` : 'Sem leitura'}</AppText></View>
          <View style={styles.metric}><AppText variant="caption" muted>SEV1/SEV2 abertos</AppText><AppText variant="bodyStrong">{openCriticalIncidents.length}</AppText></View>
          <View style={styles.metric}><AppText variant="caption" muted>Hotfixes ativos</AppText><AppText variant="bodyStrong">{hotfixes.filter((item) => !['rolled_back','cancelled'].includes(item.status)).length}</AppText></View>
          <View style={styles.metric}><AppText variant="caption" muted>Última retenção</AppText><AppText variant="bodyStrong">{latestRetention ? dateLabel(latestRetention.createdAt) : 'Nunca'}</AppText></View>
        </View>
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Novo hotfix</AppText>
        <View style={styles.chips}>{kinds.map((item) => <ChoiceChip key={item.value} label={item.label} selected={kind === item.value} onPress={() => { setKind(item.value); if (item.value === 'ota') setNativeChanges(false); }} />)}</View>
        <View style={styles.chips}>{severities.map((item) => <ChoiceChip key={item.value} label={item.label} selected={severity === item.value} onPress={() => setSeverity(item.value)} />)}</View>
        <TextField testID="maintenance-version" label="Versão do hotfix" value={version} onChangeText={setVersion} autoCapitalize="none" />
        <TextField testID="maintenance-title" label="Título operacional" value={title} onChangeText={setTitle} maxLength={160} />
        <TextField testID="maintenance-summary" label="Resumo técnico" value={summary} onChangeText={setSummary} multiline maxLength={2000} />
        <TextField testID="maintenance-runtime" label="Runtime alvo" value={runtimeVersion} onChangeText={setRuntimeVersion} autoCapitalize="none" />
        <TextField testID="maintenance-source-commit" label="Commit de origem" value={sourceCommit} onChangeText={setSourceCommit} autoCapitalize="none" maxLength={40} />
        <AppText variant="bodyStrong">Mudanças nativas?</AppText>
        <View style={styles.chips}>
          <ChoiceChip label="Não" selected={!nativeChanges} onPress={() => setNativeChanges(false)} />
          <ChoiceChip label="Sim — exige binário" selected={nativeChanges} onPress={() => { setNativeChanges(true); setKind('binary'); }} />
        </View>
        <PrimaryButton
          testID="maintenance-create-hotfix"
          label="Criar hotfix"
          loading={working}
          disabled={title.trim().length < 5 || summary.trim().length < 10 || sourceCommit.trim().length < 7}
          onPress={createHotfix}
        />
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Fila de hotfixes</AppText>
        {loading ? <AppText muted>Carregando…</AppText> : hotfixes.length === 0 ? <AppText muted>Nenhum hotfix registrado.</AppText> : hotfixes.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSelectedId(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: item.id === selectedId }}
            style={[styles.hotfixCard, item.id === selectedId && styles.selectedCard]}
          >
            <View style={styles.rowBetween}><AppText variant="bodyStrong">{item.version} · {item.kind.toUpperCase()}</AppText><AppText variant="caption">{statusLabel[item.status]}</AppText></View>
            <AppText>{item.title}</AppText>
            <AppText variant="caption" muted>{item.severity} · runtime {item.targetRuntimeVersion} · {item.sourceCommit.slice(0, 8)}</AppText>
          </Pressable>
        ))}
      </Surface>

      {selectedHotfix ? (
        <>
          <Surface style={styles.section}>
            <AppText variant="h2">Hotfix selecionado</AppText>
            <AppText variant="bodyStrong">{selectedHotfix.version} — {selectedHotfix.title}</AppText>
            <AppText>{selectedHotfix.summary}</AppText>
            <AppText variant="caption" muted>Estado: {statusLabel[selectedHotfix.status]} · criado em {dateLabel(selectedHotfix.createdAt)}</AppText>
            <AppText variant="caption" muted>Aprovações registradas: {selectedApprovals.length}</AppText>
            {selectedHotfix.status === 'draft' ? <PrimaryButton testID="maintenance-request-approval" label="Solicitar aprovação" loading={working} onPress={() => void perform(() => requestMaintenanceHotfixApproval(selectedHotfix.id), 'A aprovação independente foi solicitada.')} /> : null}
            {selectedHotfix.status === 'awaiting_approval' && adminAccess ? (
              <>
                <TextField label="Comentário da decisão" value={approvalComment} onChangeText={setApprovalComment} maxLength={2000} />
                <View style={styles.buttonGroup}>
                  <PrimaryButton testID="maintenance-approve-hotfix" label="Aprovar hotfix" loading={working} onPress={() => void perform(() => decideMaintenanceHotfix(selectedHotfix.id, 'approved', approvalComment || null), 'O hotfix foi aprovado por uma segunda pessoa.')} />
                  <PrimaryButton tone="danger" label="Rejeitar hotfix" loading={working} onPress={() => void perform(() => decideMaintenanceHotfix(selectedHotfix.id, 'rejected', approvalComment || null), 'O hotfix foi rejeitado e cancelado.')} />
                </View>
              </>
            ) : null}
          </Surface>

          {selectedHotfix.kind === 'binary' && ['approved','building','ready'].includes(selectedHotfix.status) ? (
            <Surface style={styles.section}>
              <AppText variant="h2">Artefato binário</AppText>
              <View style={styles.chips}>
                <ChoiceChip label="Android" selected={artifactPlatform === 'android'} onPress={() => setArtifactPlatform('android')} />
                <ChoiceChip label="iOS" selected={artifactPlatform === 'ios'} onPress={() => setArtifactPlatform('ios')} />
              </View>
              <TextField label="Número do build" value={artifactBuild} onChangeText={setArtifactBuild} />
              <TextField label="URL HTTPS do artefato" value={artifactUrl} onChangeText={setArtifactUrl} autoCapitalize="none" />
              <TextField label="SHA-256" value={artifactSha} onChangeText={setArtifactSha} autoCapitalize="none" maxLength={64} />
              <PrimaryButton testID="maintenance-register-artifact" label="Registrar artefato" loading={working} disabled={!artifactUrl.startsWith('https://') || artifactSha.length !== 64 || !artifactBuild.trim()} onPress={() => void perform(() => registerHotfixArtifact({ hotfixId: selectedHotfix.id, platform: artifactPlatform, buildNumber: artifactBuild, artifactUrl, artifactSha256: artifactSha }), 'O artefato foi validado e registrado.')} />
              {selectedArtifacts.map((item) => <AppText key={item.id} variant="caption" muted>{item.platform} · build {item.buildNumber} · {item.status}</AppText>)}
              {selectedHotfix.status === 'ready' ? <PrimaryButton label="Registrar implantação binária" loading={working} onPress={() => void perform(() => deployBinaryHotfix(selectedHotfix.id), 'A implantação binária foi registrada.')} /> : null}
            </Surface>
          ) : null}

          {selectedHotfix.kind === 'ota' && selectedHotfix.status === 'approved' && !selectedPlan ? (
            <Surface style={styles.section}>
              <AppText variant="h2">Plano OTA compatível</AppText>
              <AppText muted>O runtime deve permanecer {selectedHotfix.targetRuntimeVersion}. Mudanças nativas não podem ser entregues por OTA.</AppText>
              <TextField testID="maintenance-ota-message" label="Mensagem da atualização" value={otaMessage} onChangeText={setOtaMessage} maxLength={240} />
              <TextField testID="maintenance-ota-fingerprint" label="Fingerprint SHA-256" value={otaFingerprint} onChangeText={setOtaFingerprint} autoCapitalize="none" maxLength={64} />
              <TextField label="Quantidade de assets" value={otaAssetCount} onChangeText={setOtaAssetCount} keyboardType="numeric" />
              <AppText variant="bodyStrong">Onda inicial</AppText>
              <View style={styles.chips}>{rolloutOptions.map((value) => <ChoiceChip key={value} label={`${value}%`} selected={otaRollout === value} onPress={() => setOtaRollout(value)} />)}</View>
              <PrimaryButton testID="maintenance-create-ota" label="Criar plano OTA" loading={working} disabled={otaFingerprint.length !== 64 || otaMessage.trim().length < 5} onPress={() => void perform(() => createOtaUpdatePlan({ hotfixId: selectedHotfix.id, channel: selectedHotfix.targetChannel, runtimeVersion: selectedHotfix.targetRuntimeVersion, message: otaMessage, fingerprintSha256: otaFingerprint, assetCount: Math.trunc(numberValue(otaAssetCount, 1)), rolloutPercentage: otaRollout }), 'O plano OTA foi criado e aguarda aprovação independente.')} />
            </Surface>
          ) : null}

          {selectedPlan ? (
            <Surface style={styles.section}>
              <AppText variant="h2">Plano OTA</AppText>
              <AppText>{selectedPlan.message}</AppText>
              <AppText variant="caption" muted>{selectedPlan.status} · runtime {selectedPlan.runtimeVersion} · {selectedPlan.rolloutPercentage}% · {selectedPlan.assetCount} assets</AppText>
              {selectedPlan.status === 'draft' && adminAccess ? (
                <>
                  <TextField label="Comentário da aprovação OTA" value={otaApprovalComment} onChangeText={setOtaApprovalComment} maxLength={2000} />
                  <PrimaryButton testID="maintenance-approve-ota" label="Aprovar plano OTA" loading={working} onPress={() => void perform(() => decideOtaUpdatePlan(selectedPlan.id, 'approved', otaApprovalComment || null), 'O plano OTA foi aprovado por uma segunda pessoa.')} />
                  <PrimaryButton tone="danger" label="Rejeitar plano OTA" loading={working} onPress={() => void perform(() => decideOtaUpdatePlan(selectedPlan.id, 'rejected', otaApprovalComment || null), 'O plano OTA foi rejeitado.')} />
                </>
              ) : null}
              {otaEvaluation && !otaEvaluation.allowed ? otaEvaluation.blockers.map((blocker) => <AppText key={blocker} variant="caption" style={styles.warning}>• {blocker}</AppText>) : null}
              {selectedPlan.status === 'approved' && otaEvaluation?.allowed ? (
                <>
                  <AppText muted>Publique externamente com o comando protegido e registre aqui o group ID retornado pelo EAS.</AppText>
                  <TextField testID="maintenance-update-group" label="EAS update group ID" value={updateGroupId} onChangeText={setUpdateGroupId} autoCapitalize="none" />
                  <PrimaryButton testID="maintenance-record-ota" label="Registrar publicação OTA" loading={working} disabled={updateGroupId.trim().length < 8} onPress={() => void perform(() => recordOtaPublication(selectedPlan.id, updateGroupId), 'A publicação OTA foi vinculada ao hotfix.')} />
                </>
              ) : null}
            </Surface>
          ) : null}

          {['deployed','ready','building'].includes(selectedHotfix.status) ? (
            <Surface style={[styles.section, styles.dangerSection]}>
              <AppText variant="h2">Rollback do hotfix</AppText>
              <TextField testID="maintenance-rollback-reason" label="Motivo técnico" value={rollbackReason} onChangeText={setRollbackReason} multiline maxLength={2000} />
              <PrimaryButton tone="danger" label="Registrar rollback" loading={working} disabled={rollbackReason.trim().length < 10} onPress={() => void perform(() => rollbackMaintenanceHotfix(selectedHotfix.id, rollbackReason), 'O hotfix e seus artefatos foram marcados como revertidos.')} />
            </Surface>
          ) : null}
        </>
      ) : null}

      <Surface style={styles.section}>
        <AppText variant="h2">Retenção operacional</AppText>
        <AppText muted>Política mínima: saúde {retentionMinimumDays.healthSnapshots} dias, auditoria {retentionMinimumDays.operatorAudit} dias e timeline de incidentes {retentionMinimumDays.incidentUpdates} dias.</AppText>
        {latestRetention ? (
          <AppText variant="caption" muted>Última execução: {latestRetention.dryRun ? 'simulação' : 'efetiva'} · elegíveis {latestRetention.eligibleHealthCount + latestRetention.eligibleAuditCount + latestRetention.eligibleIncidentUpdateCount} · excluídos {latestRetention.deletedHealthCount + latestRetention.deletedAuditCount + latestRetention.deletedIncidentUpdateCount}</AppText>
        ) : null}
        {adminAccess ? (
          <>
            <SecondaryButton testID="maintenance-retention-dry-run" label="Simular retenção" onPress={() => void perform(() => runOperationsRetention(true), 'A simulação foi registrada sem excluir dados.')} />
            <TextField label="Confirmação para execução efetiva" value={retentionConfirmation} onChangeText={setRetentionConfirmation} hint="Digite: EXCLUIR DADOS OPERACIONAIS ELEGÍVEIS" />
            <PrimaryButton
              testID="maintenance-retention-execute"
              tone="danger"
              label="Executar retenção elegível"
              loading={working}
              disabled={!evaluateRetentionExecution({ isReleaseAdmin: adminAccess, dryRun: false, confirmation: retentionConfirmation }).allowed}
              onPress={() => void perform(() => runOperationsRetention(false), 'A retenção elegível foi executada e auditada.')}
            />
          </>
        ) : <AppText variant="caption" muted>A execução destrutiva exige release_admin.</AppText>}
      </Surface>

      <AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl },
  intro: { marginTop: spacing.sm, marginBottom: spacing.xl },
  section: { gap: spacing.lg, marginBottom: spacing.md },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, backgroundColor: colors.surfaceMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonGroup: { gap: spacing.sm },
  hotfixCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, backgroundColor: colors.surface },
  selectedCard: { borderWidth: 2, borderColor: colors.primaryStrong, backgroundColor: colors.primarySoft },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  warning: { color: colors.warning },
  dangerSection: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  signature: { textAlign: 'center', marginVertical: spacing.xl },
});
