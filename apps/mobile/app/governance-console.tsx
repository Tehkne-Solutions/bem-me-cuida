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
import { isReleaseAdmin } from '@/data/maintenance-operations-repository';
import {
  createCorrectiveAction,
  createDependencyReview,
  createMaintenanceWindow,
  createPostmortem,
  createProductCycle,
  decideMaintenanceWindow,
  decidePostmortem,
  decideProductCycle,
  listCapacityCostSnapshots,
  listCorrectiveActions,
  listDependencyReviews,
  listMaintenanceWindows,
  listPostmortems,
  listProductCycles,
  listProductSlos,
  listSloMeasurements,
  recordCapacityCost,
  recordSloMeasurement,
  requestCycleApproval,
  requestMaintenanceApproval,
  requestPostmortemReview,
  updateCorrectiveAction,
  updateDependencyReview,
  updateProductCycleStatus,
  upsertProductSlo,
  type CapacityCostSnapshot,
  type CorrectiveAction,
  type CorrectivePriority,
  type DependencyReview,
  type DependencyRisk,
  type DependencyUpdateType,
  type MaintenanceImpact,
  type MaintenanceWindow,
  type PostmortemReport,
  type ProductCycle,
  type ProductSlo,
  type SloMeasurement,
} from '@/data/product-governance-repository';
import { listProductionIncidents, type ProductionIncident } from '@/data/production-operations-repository';
import { isReleaseOperator } from '@/data/release-operations-repository';
import { evaluateCost, evaluateCycleReadiness } from '@/services/product-governance-policy';
import { colors, spacing } from '@/theme/tokens';

const priorities: CorrectivePriority[] = ['critical', 'high', 'medium', 'low'];
const impacts: MaintenanceImpact[] = ['none', 'degraded', 'unavailable'];
const dependencyTypes: DependencyUpdateType[] = ['patch', 'minor', 'major', 'security'];
const dependencyRisks: DependencyRisk[] = ['critical', 'high', 'medium', 'low'];

function numberValue(value: string, fallback = 0): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateTimeLabel(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function currency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha operacional não identificada.';
}

export default function GovernanceConsoleScreen() {
  const { session } = useAuth();
  const authorized = isReleaseOperator(session);
  const adminAccess = isReleaseAdmin(session);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [slos, setSlos] = useState<ProductSlo[]>([]);
  const [measurements, setMeasurements] = useState<SloMeasurement[]>([]);
  const [incidents, setIncidents] = useState<ProductionIncident[]>([]);
  const [postmortems, setPostmortems] = useState<PostmortemReport[]>([]);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [costs, setCosts] = useState<CapacityCostSnapshot[]>([]);
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [dependencies, setDependencies] = useState<DependencyReview[]>([]);
  const [cycles, setCycles] = useState<ProductCycle[]>([]);

  const [selectedSloId, setSelectedSloId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedPostmortemId, setSelectedPostmortemId] = useState<string | null>(null);

  const [serviceKey, setServiceKey] = useState('sync_success');
  const [sloName, setSloName] = useState('Sincronização bem-sucedida');
  const [sloDescription, setSloDescription] = useState('Percentual agregado de operações de sincronização concluídas.');
  const [sloObjective, setSloObjective] = useState('97');
  const [sloWindowDays, setSloWindowDays] = useState('30');
  const [goodEvents, setGoodEvents] = useState('9700');
  const [totalEvents, setTotalEvents] = useState('10000');

  const [postmortemTitle, setPostmortemTitle] = useState('Análise pós-incidente');
  const [postmortemSummary, setPostmortemSummary] = useState('Resumo técnico do evento, sem dados pessoais ou clínicos.');
  const [rootCause, setRootCause] = useState('Causa técnica confirmada após análise dos sinais operacionais.');
  const [detection, setDetection] = useState('O incidente foi detectado pelos indicadores agregados de produção.');
  const [resolution, setResolution] = useState('A correção foi aplicada e validada pelo fluxo operacional.');

  const [actionTitle, setActionTitle] = useState('Eliminar recorrência da causa técnica');
  const [actionDescription, setActionDescription] = useState('Implementar e validar a ação corretiva com evidência técnica.');
  const [actionPriority, setActionPriority] = useState<CorrectivePriority>('high');
  const [actionDueAt, setActionDueAt] = useState('2026-08-15T18:00:00.000Z');

  const [periodStart, setPeriodStart] = useState('2026-07-01');
  const [periodEnd, setPeriodEnd] = useState('2026-07-31');
  const [activeAccounts, setActiveAccounts] = useState('0');
  const [syncOperations, setSyncOperations] = useState('0');
  const [storageMegabytes, setStorageMegabytes] = useState('0');
  const [notificationDeliveries, setNotificationDeliveries] = useState('0');
  const [estimatedCostBrl, setEstimatedCostBrl] = useState('0');
  const [budgetBrl, setBudgetBrl] = useState('0');

  const [maintenanceTitle, setMaintenanceTitle] = useState('Manutenção programada');
  const [maintenanceStartsAt, setMaintenanceStartsAt] = useState('2026-08-10T03:00:00.000Z');
  const [maintenanceEndsAt, setMaintenanceEndsAt] = useState('2026-08-10T04:00:00.000Z');
  const [maintenanceImpact, setMaintenanceImpact] = useState<MaintenanceImpact>('degraded');
  const [maintenanceNotes, setMaintenanceNotes] = useState('Janela técnica com plano de rollback preparado.');

  const [packageName, setPackageName] = useState('expo');
  const [currentVersion, setCurrentVersion] = useState('57.0.8');
  const [targetVersion, setTargetVersion] = useState('57.0.9');
  const [dependencyType, setDependencyType] = useState<DependencyUpdateType>('patch');
  const [dependencyRisk, setDependencyRisk] = useState<DependencyRisk>('medium');
  const [dependencyDueAt, setDependencyDueAt] = useState('2026-08-20');

  const [cycleVersion, setCycleVersion] = useState('0.11.0');
  const [cycleTitle, setCycleTitle] = useState('BemMeCuida 0.11.0');
  const [cycleGoals, setCycleGoals] = useState('Consolidar aprendizados da produção, melhorar confiabilidade, acessibilidade e valor de autocuidado sem ampliar escopo clínico.');
  const [cycleStartsAt, setCycleStartsAt] = useState('2026-08-01');
  const [cycleTargetAt, setCycleTargetAt] = useState('2026-09-15');

  const load = useCallback(async () => {
    if (!authorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextSlos, nextMeasurements, nextIncidents, nextPostmortems, nextActions, nextCosts, nextWindows, nextDependencies, nextCycles] = await Promise.all([
        listProductSlos(),
        listSloMeasurements(),
        listProductionIncidents(),
        listPostmortems(),
        listCorrectiveActions(),
        listCapacityCostSnapshots(),
        listMaintenanceWindows(),
        listDependencyReviews(),
        listProductCycles(),
      ]);
      setSlos(nextSlos);
      setMeasurements(nextMeasurements);
      setIncidents(nextIncidents);
      setPostmortems(nextPostmortems);
      setActions(nextActions);
      setCosts(nextCosts);
      setWindows(nextWindows);
      setDependencies(nextDependencies);
      setCycles(nextCycles);
      setSelectedSloId((current) => current && nextSlos.some((item) => item.id === current) ? current : nextSlos[0]?.id ?? null);
      setSelectedIncidentId((current) => current && nextIncidents.some((item) => item.id === current) ? current : nextIncidents[0]?.id ?? null);
      setSelectedPostmortemId((current) => current && nextPostmortems.some((item) => item.id === current) ? current : nextPostmortems[0]?.id ?? null);
    } catch (error) {
      Alert.alert('Não foi possível carregar a governança', errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

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

  const selectedSlo = slos.find((item) => item.id === selectedSloId) ?? null;
  const selectedMeasurement = measurements.find((item) => item.sloId === selectedSloId) ?? null;
  const latestCost = costs[0] ?? null;
  const costEvaluation = latestCost ? evaluateCost(latestCost.estimatedCostBrl, latestCost.budgetBrl) : null;
  const now = Date.now();
  const openCriticalActions = actions.filter((item) => item.status !== 'done' && item.status !== 'cancelled' && item.priority === 'critical').length;
  const highActionsOverdue = actions.filter((item) => item.status !== 'done' && item.status !== 'cancelled' && item.priority === 'high' && new Date(item.dueAt).getTime() < now).length;
  const criticalIncidentsOpen = incidents.filter((item) => item.status !== 'resolved' && (item.severity === 'sev1' || item.severity === 'sev2')).length;
  const criticalSlos = slos.filter((slo) => {
    const measurement = measurements.find((item) => item.sloId === slo.id);
    return measurement ? measurement.burnRate >= slo.criticalBurnRate : false;
  }).length;
  const securityDependenciesOpen = dependencies.filter((item) => item.updateType === 'security' && !['deployed','rejected'].includes(item.status)).length;
  const maintenanceUnapproved = windows.filter((item) => item.startsAt > new Date().toISOString() && !['approved','completed','cancelled'].includes(item.status)).length;
  const cycleReadiness = evaluateCycleReadiness({
    criticalIncidentsOpen,
    criticalActionsOpen: openCriticalActions,
    highActionsOverdue,
    securityDependenciesOpen,
    criticalSlos,
    maintenanceWindowsUnapproved: maintenanceUnapproved,
  });

  if (!authorized) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityRole="button"><AppText variant="bodyStrong">← Voltar</AppText></Pressable>
        <Surface style={styles.section}>
          <AppText variant="h1">Acesso restrito</AppText>
          <AppText muted>O console de governança exige papel operacional assinado no app_metadata.</AppText>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable testID="governance-back" onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>
      <AppText variant="caption" muted style={styles.eyebrow}>GOVERNANÇA PÓS-PRODUÇÃO</AppText>
      <AppText variant="h1" testID="governance-console-title">Saúde, SLOs e ciclo do produto</AppText>
      <AppText muted style={styles.intro}>Indicadores exclusivamente técnicos e agregados. Nenhum conteúdo emocional ou clínico participa destes cálculos.</AppText>

      {loading ? <Surface><AppText muted>Carregando governança…</AppText></Surface> : (
        <>
          <Surface style={styles.section}>
            <AppText variant="h2">Resumo executivo</AppText>
            <View style={styles.metricGrid}>
              <View style={styles.metric}><AppText variant="h2">{slos.length}</AppText><AppText muted>SLOs</AppText></View>
              <View style={styles.metric}><AppText variant="h2">{criticalSlos}</AppText><AppText muted>SLOs críticos</AppText></View>
              <View style={styles.metric}><AppText variant="h2">{criticalIncidentsOpen}</AppText><AppText muted>Incidentes críticos</AppText></View>
              <View style={styles.metric}><AppText variant="h2">{openCriticalActions + highActionsOverdue}</AppText><AppText muted>Ações prioritárias</AppText></View>
            </View>
            <AppText variant="bodyStrong">Ciclo 0.11.0: {cycleReadiness.ready ? 'pronto para aprovação' : 'bloqueado'}</AppText>
            {cycleReadiness.blockers.map((blocker) => <AppText key={blocker} muted>• {blocker}</AppText>)}
            {latestCost ? (
              <AppText>Último custo: {currency(latestCost.estimatedCostBrl)} de {currency(latestCost.budgetBrl)} — {costEvaluation?.status ?? 'sem avaliação'}</AppText>
            ) : <AppText muted>Nenhum snapshot de custo registrado.</AppText>}
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">SLOs e orçamento de erro</AppText>
            <TextField testID="governance-slo-service-key" label="Chave do serviço" value={serviceKey} onChangeText={setServiceKey} autoCapitalize="none" />
            <TextField label="Nome do SLO" value={sloName} onChangeText={setSloName} />
            <TextField label="Descrição técnica" value={sloDescription} onChangeText={setSloDescription} multiline />
            <View style={styles.row}>
              <View style={styles.flex}><TextField label="Objetivo (%)" value={sloObjective} onChangeText={setSloObjective} keyboardType="decimal-pad" /></View>
              <View style={styles.flex}><TextField label="Janela (dias)" value={sloWindowDays} onChangeText={setSloWindowDays} keyboardType="number-pad" /></View>
            </View>
            <PrimaryButton testID="governance-upsert-slo" label="Salvar SLO" loading={working} onPress={() => void perform(() => upsertProductSlo({
              serviceKey,
              name: sloName,
              description: sloDescription || null,
              objectivePct: numberValue(sloObjective, 97),
              evaluationWindowDays: numberValue(sloWindowDays, 30),
              warningBurnRate: 1,
              criticalBurnRate: 2,
              active: true,
            }), 'SLO salvo e auditado.')} />
            <View style={styles.chips}>{slos.map((item) => <ChoiceChip key={item.id} label={`${item.serviceKey} ${item.objectivePct}%`} selected={selectedSloId === item.id} onPress={() => setSelectedSloId(item.id)} />)}</View>
            {selectedSlo ? (
              <>
                <AppText variant="bodyStrong">Medição de {selectedSlo.name}</AppText>
                <View style={styles.row}>
                  <View style={styles.flex}><TextField testID="governance-good-events" label="Eventos bons" value={goodEvents} onChangeText={setGoodEvents} keyboardType="number-pad" /></View>
                  <View style={styles.flex}><TextField label="Eventos totais" value={totalEvents} onChangeText={setTotalEvents} keyboardType="number-pad" /></View>
                </View>
                <PrimaryButton testID="governance-record-slo" label="Registrar medição" loading={working} onPress={() => void perform(() => recordSloMeasurement({
                  sloId: selectedSlo.id,
                  windowStart: new Date(Date.now() - selectedSlo.evaluationWindowDays * 86400000).toISOString(),
                  windowEnd: new Date().toISOString(),
                  goodEvents: numberValue(goodEvents),
                  totalEvents: numberValue(totalEvents),
                  source: 'manual_review',
                }), 'Medição agregada registrada.')} />
                {selectedMeasurement ? <AppText muted>Observado {selectedMeasurement.observedPct}% · burn rate {selectedMeasurement.burnRate} · orçamento consumido {selectedMeasurement.errorBudgetConsumedPct}%</AppText> : null}
              </>
            ) : null}
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Pós-incidentes e ações corretivas</AppText>
            <View style={styles.chips}>{incidents.slice(0, 12).map((item) => <ChoiceChip key={item.id} label={`${item.severity.toUpperCase()} ${item.title}`} selected={selectedIncidentId === item.id} onPress={() => setSelectedIncidentId(item.id)} />)}</View>
            <TextField testID="governance-postmortem-title" label="Título" value={postmortemTitle} onChangeText={setPostmortemTitle} />
            <TextField label="Resumo" value={postmortemSummary} onChangeText={setPostmortemSummary} multiline />
            <TextField label="Causa raiz" value={rootCause} onChangeText={setRootCause} multiline />
            <TextField label="Detecção" value={detection} onChangeText={setDetection} multiline />
            <TextField label="Resolução" value={resolution} onChangeText={setResolution} multiline />
            <PrimaryButton testID="governance-create-postmortem" label="Criar pós-incidente" disabled={!selectedIncidentId} loading={working} onPress={() => {
              if (!selectedIncidentId) return;
              void perform(() => createPostmortem({ incidentId: selectedIncidentId, title: postmortemTitle, summary: postmortemSummary, rootCause, detection, resolution, customerImpact: null, lessons: null }), 'Pós-incidente criado.');
            }} />
            <View style={styles.chips}>{postmortems.map((item) => <ChoiceChip key={item.id} label={`${item.status}: ${item.title}`} selected={selectedPostmortemId === item.id} onPress={() => setSelectedPostmortemId(item.id)} />)}</View>
            {postmortems.filter((item) => item.id === selectedPostmortemId).map((item) => (
              <View key={item.id} style={styles.buttonGroup}>
                {item.status === 'draft' || item.status === 'rejected' ? <SecondaryButton testID="governance-request-postmortem" label="Solicitar revisão" onPress={() => void perform(() => requestPostmortemReview(item.id), 'Revisão solicitada.')} /> : null}
                {adminAccess && item.status === 'review' ? <>
                  <SecondaryButton label="Aprovar pós-incidente" onPress={() => void perform(() => decidePostmortem(item.id, 'approved'), 'Pós-incidente aprovado.')} />
                  <SecondaryButton label="Rejeitar pós-incidente" onPress={() => void perform(() => decidePostmortem(item.id, 'rejected'), 'Pós-incidente devolvido.')} />
                </> : null}
              </View>
            ))}
            <TextField testID="governance-action-title" label="Ação corretiva" value={actionTitle} onChangeText={setActionTitle} />
            <TextField label="Descrição da ação" value={actionDescription} onChangeText={setActionDescription} multiline />
            <View style={styles.chips}>{priorities.map((item) => <ChoiceChip key={item} label={item} selected={actionPriority === item} onPress={() => setActionPriority(item)} />)}</View>
            <TextField label="Prazo ISO" value={actionDueAt} onChangeText={setActionDueAt} autoCapitalize="none" />
            <PrimaryButton testID="governance-create-action" label="Criar ação corretiva" disabled={!selectedPostmortemId || !session} loading={working} onPress={() => {
              if (!selectedPostmortemId || !session) return;
              void perform(() => createCorrectiveAction({ postmortemId: selectedPostmortemId, title: actionTitle, description: actionDescription || null, priority: actionPriority, ownerUserId: session.user.id, dueAt: actionDueAt }), 'Ação corretiva criada.');
            }} />
            {actions.slice(0, 10).map((item) => <View key={item.id} style={styles.listItem}>
              <AppText variant="bodyStrong">{item.priority} · {item.title}</AppText><AppText muted>{item.status} · prazo {dateTimeLabel(item.dueAt)}</AppText>
              {item.status !== 'done' && item.status !== 'cancelled' ? <View style={styles.row}><View style={styles.flex}><SecondaryButton label="Em andamento" onPress={() => void perform(() => updateCorrectiveAction(item.id, 'in_progress', null), 'Ação atualizada.')} /></View><View style={styles.flex}><SecondaryButton label="Concluir" onPress={() => void perform(() => updateCorrectiveAction(item.id, 'done', 'Validação técnica registrada no console.'), 'Ação concluída.')} /></View></View> : null}
            </View>)}
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Capacidade e custo</AppText>
            <View style={styles.row}><View style={styles.flex}><TextField label="Início" value={periodStart} onChangeText={setPeriodStart} /></View><View style={styles.flex}><TextField label="Fim" value={periodEnd} onChangeText={setPeriodEnd} /></View></View>
            <View style={styles.row}><View style={styles.flex}><TextField label="Contas ativas" value={activeAccounts} onChangeText={setActiveAccounts} keyboardType="number-pad" /></View><View style={styles.flex}><TextField label="Sincronizações" value={syncOperations} onChangeText={setSyncOperations} keyboardType="number-pad" /></View></View>
            <View style={styles.row}><View style={styles.flex}><TextField label="Armazenamento MB" value={storageMegabytes} onChangeText={setStorageMegabytes} keyboardType="decimal-pad" /></View><View style={styles.flex}><TextField label="Notificações" value={notificationDeliveries} onChangeText={setNotificationDeliveries} keyboardType="number-pad" /></View></View>
            <View style={styles.row}><View style={styles.flex}><TextField testID="governance-estimated-cost" label="Custo estimado (R$)" value={estimatedCostBrl} onChangeText={setEstimatedCostBrl} keyboardType="decimal-pad" /></View><View style={styles.flex}><TextField label="Orçamento (R$)" value={budgetBrl} onChangeText={setBudgetBrl} keyboardType="decimal-pad" /></View></View>
            <PrimaryButton testID="governance-record-cost" label="Registrar capacidade e custo" loading={working} onPress={() => void perform(() => recordCapacityCost({
              periodStart, periodEnd,
              activeAccounts: numberValue(activeAccounts),
              syncOperations: numberValue(syncOperations),
              storageMegabytes: numberValue(storageMegabytes),
              notificationDeliveries: numberValue(notificationDeliveries),
              estimatedCostBrl: numberValue(estimatedCostBrl),
              budgetBrl: numberValue(budgetBrl),
              source: 'manual_review',
            }), 'Snapshot agregado de capacidade e custo registrado.')} />
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Calendário de manutenção</AppText>
            <TextField testID="governance-maintenance-title" label="Título" value={maintenanceTitle} onChangeText={setMaintenanceTitle} />
            <TextField label="Início ISO" value={maintenanceStartsAt} onChangeText={setMaintenanceStartsAt} />
            <TextField label="Fim ISO" value={maintenanceEndsAt} onChangeText={setMaintenanceEndsAt} />
            <View style={styles.chips}>{impacts.map((item) => <ChoiceChip key={item} label={item} selected={maintenanceImpact === item} onPress={() => setMaintenanceImpact(item)} />)}</View>
            <TextField label="Notas técnicas" value={maintenanceNotes} onChangeText={setMaintenanceNotes} multiline />
            <PrimaryButton testID="governance-create-maintenance" label="Agendar manutenção" loading={working} onPress={() => void perform(() => createMaintenanceWindow({ title: maintenanceTitle, startsAt: maintenanceStartsAt, endsAt: maintenanceEndsAt, customerImpact: maintenanceImpact, notes: maintenanceNotes || null }), 'Janela de manutenção criada.')} />
            {windows.slice(0, 8).map((item) => <View key={item.id} style={styles.listItem}>
              <AppText variant="bodyStrong">{item.title}</AppText><AppText muted>{item.status} · {dateTimeLabel(item.startsAt)} · impacto {item.customerImpact}</AppText>
              {item.status === 'planned' || item.status === 'rejected' ? <SecondaryButton testID="governance-request-maintenance" label="Solicitar aprovação" onPress={() => void perform(() => requestMaintenanceApproval(item.id), 'Aprovação solicitada.')} /> : null}
              {adminAccess && item.status === 'awaiting_approval' ? <View style={styles.row}><View style={styles.flex}><SecondaryButton label="Aprovar" onPress={() => void perform(() => decideMaintenanceWindow(item.id, 'approved'), 'Manutenção aprovada.')} /></View><View style={styles.flex}><SecondaryButton label="Rejeitar" onPress={() => void perform(() => decideMaintenanceWindow(item.id, 'rejected'), 'Manutenção rejeitada.')} /></View></View> : null}
            </View>)}
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Dependências</AppText>
            <TextField testID="governance-package-name" label="Pacote" value={packageName} onChangeText={setPackageName} autoCapitalize="none" />
            <View style={styles.row}><View style={styles.flex}><TextField label="Versão atual" value={currentVersion} onChangeText={setCurrentVersion} /></View><View style={styles.flex}><TextField label="Versão alvo" value={targetVersion} onChangeText={setTargetVersion} /></View></View>
            <View style={styles.chips}>{dependencyTypes.map((item) => <ChoiceChip key={item} label={item} selected={dependencyType === item} onPress={() => setDependencyType(item)} />)}</View>
            <View style={styles.chips}>{dependencyRisks.map((item) => <ChoiceChip key={item} label={item} selected={dependencyRisk === item} onPress={() => setDependencyRisk(item)} />)}</View>
            <TextField label="Prazo" value={dependencyDueAt} onChangeText={setDependencyDueAt} />
            <PrimaryButton testID="governance-create-dependency" label="Registrar revisão" loading={working} onPress={() => void perform(() => createDependencyReview({ packageName, currentVersion, targetVersion, updateType: dependencyType, riskLevel: dependencyRisk, dueAt: dependencyDueAt || null, notes: null }), 'Revisão de dependência registrada.')} />
            {dependencies.slice(0, 10).map((item) => <View key={item.id} style={styles.listItem}>
              <AppText variant="bodyStrong">{item.packageName}: {item.currentVersion} → {item.targetVersion}</AppText><AppText muted>{item.updateType} · risco {item.riskLevel} · {item.status}</AppText>
              {item.status === 'proposed' ? <SecondaryButton label="Aprovar avaliação" onPress={() => void perform(() => updateDependencyReview(item.id, 'approved', null), 'Dependência aprovada para execução.')} /> : null}
              {item.status === 'approved' ? <SecondaryButton label="Iniciar atualização" onPress={() => void perform(() => updateDependencyReview(item.id, 'in_progress', null), 'Atualização iniciada.')} /> : null}
              {item.status === 'in_progress' ? <SecondaryButton label="Marcar validada" onPress={() => void perform(() => updateDependencyReview(item.id, 'validated', 'Testes automatizados e homologação registrados.'), 'Dependência validada.')} /> : null}
            </View>)}
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Ciclo do produto</AppText>
            <TextField testID="governance-cycle-version" label="Versão" value={cycleVersion} onChangeText={setCycleVersion} />
            <TextField label="Título" value={cycleTitle} onChangeText={setCycleTitle} />
            <TextField label="Objetivos" value={cycleGoals} onChangeText={setCycleGoals} multiline />
            <View style={styles.row}><View style={styles.flex}><TextField label="Início" value={cycleStartsAt} onChangeText={setCycleStartsAt} /></View><View style={styles.flex}><TextField label="Entrega alvo" value={cycleTargetAt} onChangeText={setCycleTargetAt} /></View></View>
            <PrimaryButton testID="governance-create-cycle" label="Criar ciclo 0.11.0" loading={working} onPress={() => void perform(() => createProductCycle({ version: cycleVersion, title: cycleTitle, goals: cycleGoals, startsAt: cycleStartsAt || null, targetReleaseAt: cycleTargetAt || null }), 'Ciclo de produto criado.')} />
            {cycles.map((item) => <View key={item.id} style={styles.listItem}>
              <AppText variant="bodyStrong">{item.version} · {item.title}</AppText><AppText muted>{item.status} · alvo {item.targetReleaseAt ?? 'não definido'}</AppText>
              {item.status === 'planning' || item.status === 'rejected' ? <SecondaryButton testID="governance-request-cycle" label="Solicitar aprovação do ciclo" disabled={!cycleReadiness.ready} onPress={() => void perform(() => requestCycleApproval(item.id), 'Ciclo enviado para aprovação.')} /> : null}
              {adminAccess && item.status === 'awaiting_approval' ? <View style={styles.row}><View style={styles.flex}><SecondaryButton label="Aprovar ciclo" onPress={() => void perform(() => decideProductCycle(item.id, 'approved'), 'Ciclo aprovado.')} /></View><View style={styles.flex}><SecondaryButton label="Rejeitar ciclo" onPress={() => void perform(() => decideProductCycle(item.id, 'rejected'), 'Ciclo rejeitado.')} /></View></View> : null}
              {item.status === 'approved' ? <SecondaryButton label="Iniciar ciclo" onPress={() => void perform(() => updateProductCycleStatus(item.id, 'active'), 'Ciclo iniciado.')} /> : null}
              {item.status === 'active' ? <SecondaryButton label="Congelar escopo" onPress={() => void perform(() => updateProductCycleStatus(item.id, 'frozen'), 'Escopo congelado.')} /> : null}
              {item.status === 'frozen' ? <SecondaryButton label="Marcar lançado" onPress={() => void perform(() => updateProductCycleStatus(item.id, 'released'), 'Ciclo marcado como lançado.')} /> : null}
            </View>)}
          </Surface>

          <AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl },
  intro: { marginTop: spacing.sm, marginBottom: spacing.xl },
  section: { gap: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonGroup: { gap: spacing.sm },
  listItem: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { minWidth: '46%', flexGrow: 1, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  signature: { textAlign: 'center', marginVertical: spacing.xl },
});
