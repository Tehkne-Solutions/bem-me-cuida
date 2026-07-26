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
import {
  addCycleKeyResult,
  createCycleObjective,
  createDeliveryMilestone,
  createProductExperiment,
  decideExperiment,
  decideScopeChange,
  getCycleExecutionBlockers,
  initializeCycleReleaseGates,
  listCycleBacklog,
  listCycleKeyResults,
  listCycleObjectives,
  listCycleReleaseGates,
  listDeliveryMilestones,
  listExperimentMeasurements,
  listProductExperiments,
  listScopeChanges,
  recordExperimentMeasurement,
  requestExperimentApproval,
  requestScopeChange,
  setCycleReleaseGate,
  updateCycleBacklogStatus,
  updateDeliveryMilestone,
  updateExperimentStatus,
  upsertCycleBacklogItem,
  type BacklogCategory,
  type BacklogStatus,
  type CycleBacklogItem,
  type CycleKeyResult,
  type CycleObjective,
  type CycleReleaseGate,
  type CycleScopeChange,
  type DeliveryMilestone,
  type ExperimentMeasurement,
  type MilestoneKind,
  type ProductExperiment,
} from '@/data/cycle-execution-repository';
import { isReleaseAdmin } from '@/data/maintenance-operations-repository';
import { isReleaseOperator } from '@/data/release-operations-repository';
import { listProductCycles, updateProductCycleStatus, type ProductCycle } from '@/data/product-governance-repository';
import { calculateBacklogPriority, evaluateCycleExecution, evaluateExperiment } from '@/services/cycle-execution-policy';
import { colors, spacing } from '@/theme/tokens';

const categories: BacklogCategory[] = ['reliability', 'accessibility', 'value', 'security', 'operations'];
const milestoneKinds: MilestoneKind[] = ['planning', 'design', 'development', 'qa', 'rc', 'freeze', 'release'];
const backlogStatuses: BacklogStatus[] = ['proposed', 'committed', 'in_progress', 'blocked', 'done', 'removed'];

function numberValue(value: string, fallback = 0): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha operacional não identificada.';
}

function blockerLabel(value: string): string {
  const labels: Record<string, string> = {
    scope_changes_pending: 'Mudanças de escopo pendentes', experiments_open: 'Experimentos ainda abertos', backlog_blocked: 'Backlog bloqueado',
    required_gates_pending: 'Gates obrigatórios pendentes', rc_milestone_pending: 'Marco de RC pendente', critical_incidents_open: 'Incidentes críticos abertos',
    corrective_actions_blocking: 'Ações corretivas bloqueando', security_dependencies_open: 'Dependências de segurança pendentes',
    committed_backlog_incomplete: 'Itens comprometidos incompletos', release_milestone_pending: 'Marco de lançamento pendente',
  };
  return labels[value] ?? value;
}

export default function CycleExecutionConsoleScreen() {
  const { session } = useAuth();
  const authorized = isReleaseOperator(session);
  const adminAccess = isReleaseAdmin(session);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [cycles, setCycles] = useState<ProductCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [backlog, setBacklog] = useState<CycleBacklogItem[]>([]);
  const [objectives, setObjectives] = useState<CycleObjective[]>([]);
  const [keyResults, setKeyResults] = useState<CycleKeyResult[]>([]);
  const [scopeChanges, setScopeChanges] = useState<CycleScopeChange[]>([]);
  const [experiments, setExperiments] = useState<ProductExperiment[]>([]);
  const [measurements, setMeasurements] = useState<ExperimentMeasurement[]>([]);
  const [milestones, setMilestones] = useState<DeliveryMilestone[]>([]);
  const [gates, setGates] = useState<CycleReleaseGate[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);

  const [backlogTitle, setBacklogTitle] = useState('Melhorar confiabilidade da sincronização');
  const [backlogDescription, setBacklogDescription] = useState('Reduzir falhas e tornar a recuperação mais clara sem ampliar o escopo clínico.');
  const [category, setCategory] = useState<BacklogCategory>('reliability');
  const [impact, setImpact] = useState('90');
  const [confidence, setConfidence] = useState('80');
  const [effort, setEffort] = useState('8');
  const [risk, setRisk] = useState('20');

  const [objectiveTitle, setObjectiveTitle] = useState('Aumentar confiabilidade percebida e técnica');
  const [objectiveDescription, setObjectiveDescription] = useState('Consolidar melhorias técnicas mensuráveis no ciclo 0.11.0.');
  const [keyResultTitle, setKeyResultTitle] = useState('Elevar sincronizações bem-sucedidas');
  const [keyResultBaseline, setKeyResultBaseline] = useState('97');
  const [keyResultTarget, setKeyResultTarget] = useState('99');

  const [scopeReason, setScopeReason] = useState('Mudança necessária para proteger o objetivo principal do ciclo.');
  const [scopeImpact, setScopeImpact] = useState('Impacto revisado em prazo, risco e capacidade da equipe.');

  const [experimentKey, setExperimentKey] = useState('onboarding_clarity_011');
  const [experimentTitle, setExperimentTitle] = useState('Clareza do onboarding de autocuidado');
  const [hypothesis, setHypothesis] = useState('Pessoas que consentirem e receberem uma explicação mais clara concluirão mais etapas sem aumento de falhas.');
  const [successMetric, setSuccessMetric] = useState('Conclusão agregada do onboarding');
  const [guardrailMetric, setGuardrailMetric] = useState('Falhas técnicas agregadas');
  const [audience, setAudience] = useState('Somente participantes que consentirem explicitamente com o experimento.');
  const [sampleSize, setSampleSize] = useState('200');
  const [conversions, setConversions] = useState('80');
  const [guardrailBreaches, setGuardrailBreaches] = useState('1');
  const [variant, setVariant] = useState<'control' | 'treatment'>('control');

  const [milestoneTitle, setMilestoneTitle] = useState('RC 0.11.0 disponível');
  const [milestoneKind, setMilestoneKind] = useState<MilestoneKind>('rc');
  const [milestoneDueAt, setMilestoneDueAt] = useState('2026-09-05T18:00:00.000Z');
  const [evidence, setEvidence] = useState('Evidência técnica validada e vinculada ao gate.');

  const selectedCycle = useMemo(() => cycles.find((item) => item.id === selectedCycleId) ?? null, [cycles, selectedCycleId]);
  const selectedExperiment = useMemo(() => experiments.find((item) => item.id === selectedExperimentId) ?? null, [experiments, selectedExperimentId]);
  const selectedObjective = objectives[0] ?? null;
  const priorityPreview = calculateBacklogPriority({
    impactScore: numberValue(impact), confidenceScore: numberValue(confidence), effortPoints: numberValue(effort, 1), riskScore: numberValue(risk),
  });
  const experimentEvaluation = evaluateExperiment(measurements);
  const localFreeze = evaluateCycleExecution({ targetStatus: 'frozen', backlog, scopeChanges, experiments, milestones, gates });
  const localRelease = evaluateCycleExecution({ targetStatus: 'released', backlog, scopeChanges, experiments, milestones, gates });

  const loadCycleData = useCallback(async (cycleId: string) => {
    const [nextBacklog, nextObjectives, nextScope, nextExperiments, nextMilestones, nextGates] = await Promise.all([
      listCycleBacklog(cycleId), listCycleObjectives(cycleId), listScopeChanges(cycleId), listProductExperiments(cycleId),
      listDeliveryMilestones(cycleId), listCycleReleaseGates(cycleId),
    ]);
    const nextKeyResults = await listCycleKeyResults(nextObjectives.map((item) => item.id));
    setBacklog(nextBacklog); setObjectives(nextObjectives); setKeyResults(nextKeyResults); setScopeChanges(nextScope);
    setExperiments(nextExperiments); setMilestones(nextMilestones); setGates(nextGates);
    const nextExperimentId = selectedExperimentId && nextExperiments.some((item) => item.id === selectedExperimentId)
      ? selectedExperimentId : nextExperiments[0]?.id ?? null;
    setSelectedExperimentId(nextExperimentId);
    setMeasurements(nextExperimentId ? await listExperimentMeasurements(nextExperimentId) : []);
  }, [selectedExperimentId]);

  const load = useCallback(async () => {
    if (!authorized) { setLoading(false); return; }
    setLoading(true);
    try {
      const nextCycles = await listProductCycles();
      setCycles(nextCycles);
      const preferred = selectedCycleId && nextCycles.some((item) => item.id === selectedCycleId)
        ? selectedCycleId : nextCycles.find((item) => item.version === '0.11.0')?.id ?? nextCycles[0]?.id ?? null;
      setSelectedCycleId(preferred);
      if (preferred) await loadCycleData(preferred);
    } catch (error) {
      Alert.alert('Não foi possível carregar o ciclo', errorMessage(error));
    } finally { setLoading(false); }
  }, [authorized, loadCycleData, selectedCycleId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function perform(action: () => Promise<unknown>, success: string) {
    setWorking(true);
    try { await action(); Alert.alert('Operação registrada', success); await load(); }
    catch (error) { Alert.alert('Operação bloqueada', errorMessage(error)); }
    finally { setWorking(false); }
  }

  async function chooseCycle(cycleId: string) {
    setSelectedCycleId(cycleId); setLoading(true);
    try { await loadCycleData(cycleId); } finally { setLoading(false); }
  }

  async function chooseExperiment(experimentId: string) {
    setSelectedExperimentId(experimentId);
    setMeasurements(await listExperimentMeasurements(experimentId));
  }

  if (!authorized) {
    return <Screen><Pressable onPress={() => router.back()}><AppText variant="bodyStrong">← Voltar</AppText></Pressable><Surface><AppText variant="h1">Acesso restrito</AppText><AppText muted>Este console exige papel operacional assinado.</AppText></Surface></Screen>;
  }

  return (
    <Screen>
      <Pressable testID="cycle-execution-back" onPress={() => router.back()} accessibilityRole="button"><AppText variant="bodyStrong">← Voltar</AppText></Pressable>
      <AppText variant="caption" muted style={styles.eyebrow}>CICLO 0.11.0</AppText>
      <AppText variant="h1" testID="cycle-execution-title">Execução, experimentos e gates</AppText>
      <AppText muted style={styles.intro}>Planeje entregas mensuráveis, preserve consentimento e só avance quando o servidor confirmar todos os controles.</AppText>

      {loading ? <Surface><AppText muted>Carregando execução…</AppText></Surface> : (
        <>
          <Surface style={styles.section}>
            <AppText variant="h2">Ciclo selecionado</AppText>
            <View style={styles.chips}>{cycles.map((cycle) => <ChoiceChip key={cycle.id} label={`${cycle.version} · ${cycle.status}`} selected={cycle.id === selectedCycleId} onPress={() => void chooseCycle(cycle.id)} />)}</View>
            {selectedCycle ? <AppText muted>{selectedCycle.title} — {selectedCycle.goals}</AppText> : <AppText muted>Crie e aprove o ciclo na central de governança antes de executar.</AppText>}
          </Surface>

          {selectedCycle ? (
            <>
              <Surface style={styles.section}>
                <AppText variant="h2">Backlog priorizado</AppText>
                <AppText testID="cycle-priority-preview" variant="bodyStrong">Prioridade calculada: {priorityPreview}</AppText>
                <TextField testID="cycle-backlog-title" label="Entrega" value={backlogTitle} onChangeText={setBacklogTitle} />
                <TextField label="Descrição" value={backlogDescription} onChangeText={setBacklogDescription} multiline />
                <View style={styles.chips}>{categories.map((item) => <ChoiceChip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}</View>
                <View style={styles.grid}><TextField label="Impacto" value={impact} onChangeText={setImpact} keyboardType="numeric" /><TextField label="Confiança" value={confidence} onChangeText={setConfidence} keyboardType="numeric" /><TextField label="Esforço" value={effort} onChangeText={setEffort} keyboardType="numeric" /><TextField label="Risco" value={risk} onChangeText={setRisk} keyboardType="numeric" /></View>
                <PrimaryButton testID="cycle-create-backlog" label="Adicionar ao backlog" loading={working} onPress={() => void perform(() => upsertCycleBacklogItem({ cycleId: selectedCycle.id, title: backlogTitle, description: backlogDescription, category, impactScore: numberValue(impact), confidenceScore: numberValue(confidence), effortPoints: numberValue(effort, 1), riskScore: numberValue(risk) }), 'Item priorizado no ciclo.')} />
                {backlog.map((item) => <View key={item.id} style={styles.row}><View style={styles.flex}><AppText variant="bodyStrong">{item.title}</AppText><AppText muted>{item.category} · prioridade {item.priorityScore.toFixed(1)} · {item.status}</AppText></View><View style={styles.chips}>{backlogStatuses.filter((status) => ['committed','in_progress','blocked','done','removed'].includes(status)).map((status) => <ChoiceChip key={status} label={status} selected={item.status === status} onPress={() => void perform(() => updateCycleBacklogStatus(item.id, status), 'Status do backlog atualizado.')} />)}</View></View>)}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Objetivos e resultados-chave</AppText>
                <TextField testID="cycle-objective-title" label="Objetivo" value={objectiveTitle} onChangeText={setObjectiveTitle} />
                <TextField label="Descrição" value={objectiveDescription} onChangeText={setObjectiveDescription} multiline />
                <PrimaryButton testID="cycle-create-objective" label="Criar objetivo" loading={working} onPress={() => void perform(() => createCycleObjective(selectedCycle.id, objectiveTitle, objectiveDescription), 'Objetivo criado.')} />
                {selectedObjective ? <><TextField label="Resultado-chave" value={keyResultTitle} onChangeText={setKeyResultTitle} /><View style={styles.grid}><TextField label="Base" value={keyResultBaseline} onChangeText={setKeyResultBaseline} keyboardType="numeric" /><TextField label="Meta" value={keyResultTarget} onChangeText={setKeyResultTarget} keyboardType="numeric" /></View><SecondaryButton testID="cycle-create-key-result" label="Adicionar resultado-chave" onPress={() => void perform(() => addCycleKeyResult({ objectiveId: selectedObjective.id, title: keyResultTitle, baseline: numberValue(keyResultBaseline), target: numberValue(keyResultTarget), unit: 'percentage' }), 'Resultado-chave adicionado.')} /></> : null}
                {objectives.map((objective) => <View key={objective.id} style={styles.item}><AppText variant="bodyStrong">{objective.title}</AppText>{keyResults.filter((kr) => kr.objectiveId === objective.id).map((kr) => <AppText key={kr.id} muted>{kr.title}: {kr.currentValue} → {kr.targetValue} {kr.unit}</AppText>)}</View>)}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Gestão de escopo</AppText>
                <TextField testID="cycle-scope-reason" label="Motivo" value={scopeReason} onChangeText={setScopeReason} multiline />
                <TextField label="Impacto" value={scopeImpact} onChangeText={setScopeImpact} multiline />
                <PrimaryButton testID="cycle-request-scope" label="Solicitar mudança de escopo" loading={working} onPress={() => void perform(() => requestScopeChange({ cycleId: selectedCycle.id, changeType: 'add', reason: scopeReason, impactSummary: scopeImpact }), 'Mudança enviada para revisão independente.')} />
                {scopeChanges.map((change) => <View key={change.id} style={styles.item}><AppText variant="bodyStrong">{change.changeType} · {change.status}</AppText><AppText muted>{change.reason}</AppText>{adminAccess && change.status === 'pending' ? <View style={styles.chips}><SecondaryButton label="Aprovar" onPress={() => void perform(() => decideScopeChange(change.id, 'approved'), 'Mudança aprovada.')} /><SecondaryButton label="Rejeitar" onPress={() => void perform(() => decideScopeChange(change.id, 'rejected'), 'Mudança rejeitada.')} /></View> : null}</View>)}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Experimentos consentidos</AppText>
                <AppText muted>Nenhum experimento usa emoções, diagnóstico, Diário ou segmentação clínica. A participação exige consentimento explícito.</AppText>
                <TextField testID="cycle-experiment-key" label="Chave" value={experimentKey} onChangeText={setExperimentKey} autoCapitalize="none" />
                <TextField label="Título" value={experimentTitle} onChangeText={setExperimentTitle} />
                <TextField label="Hipótese" value={hypothesis} onChangeText={setHypothesis} multiline />
                <TextField label="Métrica de sucesso" value={successMetric} onChangeText={setSuccessMetric} />
                <TextField label="Guardrail" value={guardrailMetric} onChangeText={setGuardrailMetric} />
                <TextField label="Público consentido" value={audience} onChangeText={setAudience} multiline />
                <PrimaryButton testID="cycle-create-experiment" label="Criar experimento" loading={working} onPress={() => void perform(() => createProductExperiment({ cycleId: selectedCycle.id, experimentKey, title: experimentTitle, hypothesis, successMetric, guardrailMetric, audienceDescription: audience }), 'Experimento criado em rascunho.')} />
                <View style={styles.chips}>{experiments.map((item) => <ChoiceChip key={item.id} label={`${item.title} · ${item.status}`} selected={item.id === selectedExperimentId} onPress={() => void chooseExperiment(item.id)} />)}</View>
                {selectedExperiment ? <View style={styles.item}><AppText variant="bodyStrong">{selectedExperiment.title}</AppText><AppText muted>Consentimento obrigatório: {selectedExperiment.consentRequired ? 'sim' : 'não'}</AppText><View style={styles.chips}>{selectedExperiment.status === 'draft' ? <SecondaryButton label="Solicitar aprovação" onPress={() => void perform(() => requestExperimentApproval(selectedExperiment.id), 'Aprovação solicitada.')} /> : null}{adminAccess && selectedExperiment.status === 'awaiting_approval' ? <SecondaryButton label="Aprovar experimento" onPress={() => void perform(() => decideExperiment(selectedExperiment.id, 'approved'), 'Experimento aprovado.')} /> : null}{selectedExperiment.status === 'approved' ? <SecondaryButton label="Iniciar" onPress={() => void perform(() => updateExperimentStatus(selectedExperiment.id, 'running'), 'Experimento iniciado.')} /> : null}{selectedExperiment.status === 'running' ? <SecondaryButton label="Concluir" onPress={() => void perform(() => updateExperimentStatus(selectedExperiment.id, 'concluded'), 'Experimento concluído.')} /> : null}</View><View style={styles.chips}><ChoiceChip label="Controle" selected={variant === 'control'} onPress={() => setVariant('control')} /><ChoiceChip label="Tratamento" selected={variant === 'treatment'} onPress={() => setVariant('treatment')} /></View><View style={styles.grid}><TextField label="Amostra" value={sampleSize} onChangeText={setSampleSize} keyboardType="numeric" /><TextField label="Conversões" value={conversions} onChangeText={setConversions} keyboardType="numeric" /><TextField label="Brechas guardrail" value={guardrailBreaches} onChangeText={setGuardrailBreaches} keyboardType="numeric" /></View><SecondaryButton testID="cycle-record-measurement" label="Registrar agregado" onPress={() => void perform(() => recordExperimentMeasurement({ experimentId: selectedExperiment.id, variant, periodStart: '2026-08-01T00:00:00.000Z', periodEnd: '2026-08-08T00:00:00.000Z', sampleSize: numberValue(sampleSize), conversions: numberValue(conversions), valueSum: numberValue(conversions), guardrailBreaches: numberValue(guardrailBreaches) }), 'Medição agregada registrada.')} /><AppText variant="bodyStrong">Leitura: {experimentEvaluation.status}</AppText><AppText muted>Controle {experimentEvaluation.controlConversionPct}% · Tratamento {experimentEvaluation.treatmentConversionPct}% · Uplift {experimentEvaluation.upliftPct}% · Guardrail {experimentEvaluation.treatmentGuardrailPct}%</AppText></View> : null}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Marcos e gates</AppText>
                <TextField testID="cycle-milestone-title" label="Marco" value={milestoneTitle} onChangeText={setMilestoneTitle} />
                <View style={styles.chips}>{milestoneKinds.map((item) => <ChoiceChip key={item} label={item} selected={milestoneKind === item} onPress={() => setMilestoneKind(item)} />)}</View>
                <TextField label="Prazo ISO" value={milestoneDueAt} onChangeText={setMilestoneDueAt} />
                <PrimaryButton testID="cycle-create-milestone" label="Criar marco" loading={working} onPress={() => void perform(() => createDeliveryMilestone({ cycleId: selectedCycle.id, title: milestoneTitle, kind: milestoneKind, dueAt: milestoneDueAt }), 'Marco criado.')} />
                <SecondaryButton testID="cycle-init-gates" label="Inicializar gates padrão" onPress={() => void perform(() => initializeCycleReleaseGates(selectedCycle.id), 'Gates inicializados.')} />
                {milestones.map((item) => <View key={item.id} style={styles.row}><View style={styles.flex}><AppText variant="bodyStrong">{item.milestoneKind} · {item.title}</AppText><AppText muted>{item.status}</AppText></View><SecondaryButton label="Marcar concluído" onPress={() => void perform(() => updateDeliveryMilestone(item.id, 'done', evidence), 'Marco concluído.')} /></View>)}
                <TextField label="Evidência" value={evidence} onChangeText={setEvidence} multiline />
                {gates.map((item) => <View key={item.id} style={styles.row}><View style={styles.flex}><AppText variant="bodyStrong">{item.label}</AppText><AppText muted>{item.required ? 'Obrigatório' : 'Opcional'} · {item.status}</AppText></View><View style={styles.chips}><SecondaryButton label="Passou" onPress={() => void perform(() => setCycleReleaseGate(item.id, 'passed', evidence), 'Gate aprovado.')} /><SecondaryButton label="Falhou" onPress={() => void perform(() => setCycleReleaseGate(item.id, 'failed', evidence), 'Gate marcado como falho.')} /></View></View>)}
              </Surface>

              <Surface style={styles.section}>
                <AppText variant="h2">Decisão do ciclo</AppText>
                <AppText testID="cycle-freeze-readiness" variant="bodyStrong">Congelamento local: {localFreeze.ready ? 'pronto' : 'bloqueado'}</AppText>
                {localFreeze.blockers.map((item) => <AppText key={item} muted>• {blockerLabel(item)}</AppText>)}
                <AppText variant="bodyStrong">Lançamento local: {localRelease.ready ? 'pronto' : 'bloqueado'}</AppText>
                {localRelease.blockers.map((item) => <AppText key={item} muted>• {blockerLabel(item)}</AppText>)}
                <View style={styles.buttonGroup}>
                  {selectedCycle.status === 'approved' ? <PrimaryButton label="Ativar ciclo" onPress={() => void perform(() => updateProductCycleStatus(selectedCycle.id, 'active'), 'Ciclo ativado.')} /> : null}
                  {selectedCycle.status === 'active' ? <PrimaryButton testID="cycle-freeze" label="Validar e congelar" onPress={() => void perform(async () => { const server = await getCycleExecutionBlockers(selectedCycle.id, 'frozen'); if (!server.ready) throw new Error(server.blockers.map(blockerLabel).join('\n')); await updateProductCycleStatus(selectedCycle.id, 'frozen'); }, 'Ciclo congelado pelo servidor.')} /> : null}
                  {selectedCycle.status === 'frozen' ? <PrimaryButton testID="cycle-release" label="Validar e lançar" onPress={() => void perform(async () => { const server = await getCycleExecutionBlockers(selectedCycle.id, 'released'); if (!server.ready) throw new Error(server.blockers.map(blockerLabel).join('\n')); await updateProductCycleStatus(selectedCycle.id, 'released'); }, 'Ciclo marcado como lançado pelo servidor.')} /> : null}
                </View>
              </Surface>
            </>
          ) : null}
          <AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl }, intro: { marginTop: spacing.sm, marginBottom: spacing.xl }, section: { gap: spacing.lg, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, grid: { gap: spacing.sm }, row: { gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  flex: { flex: 1, gap: spacing.xs }, item: { gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  buttonGroup: { gap: spacing.sm }, signature: { textAlign: 'center', marginVertical: spacing.xl },
});
