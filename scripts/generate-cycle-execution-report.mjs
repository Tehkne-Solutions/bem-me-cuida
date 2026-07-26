import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function number(name, fallback = 0) {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

const output = resolve(text('CYCLE_EXECUTION_REPORT_OUTPUT', 'artifacts/bemmecuida-cycle-0.11.0.json'));
const markdownOutput = resolve(text('CYCLE_EXECUTION_REPORT_MARKDOWN_OUTPUT', 'artifacts/bemmecuida-cycle-0.11.0.md'));
const requiredGates = number('CYCLE_REQUIRED_GATES');
const passedGates = number('CYCLE_PASSED_GATES');
const backlogCommitted = number('CYCLE_BACKLOG_COMMITTED');
const backlogDone = number('CYCLE_BACKLOG_DONE');
const sampleSize = number('CYCLE_EXPERIMENT_SAMPLE_SIZE');
const conversions = number('CYCLE_EXPERIMENT_CONVERSIONS');
const conversionPct = sampleSize > 0 ? Number(((conversions / sampleSize) * 100).toFixed(2)) : 0;

const report = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  product: 'BemMeCuida',
  signature: 'Tehkné Solutions',
  privacy: {
    containsPersonalData: false,
    containsClinicalData: false,
    aggregatedMetricsOnly: true,
  },
  locale: 'pt-BR',
  currency: 'BRL',
  cycle: {
    version: text('CYCLE_VERSION', '0.11.0'),
    releaseCandidate: text('CYCLE_RC_VERSION', '0.11.0-rc.1'),
    status: text('CYCLE_STATUS', 'planning'),
    targetDate: text('CYCLE_TARGET_DATE', ''),
  },
  backlog: {
    proposed: number('CYCLE_BACKLOG_PROPOSED'),
    committed: backlogCommitted,
    inProgress: number('CYCLE_BACKLOG_IN_PROGRESS'),
    blocked: number('CYCLE_BACKLOG_BLOCKED'),
    done: backlogDone,
    completionPct: backlogCommitted > 0 ? Number(((backlogDone / backlogCommitted) * 100).toFixed(2)) : 0,
  },
  objectives: {
    active: number('CYCLE_OBJECTIVES_ACTIVE'),
    keyResultsOnTrack: number('CYCLE_KEY_RESULTS_ON_TRACK'),
    keyResultsAtRisk: number('CYCLE_KEY_RESULTS_AT_RISK'),
    keyResultsAchieved: number('CYCLE_KEY_RESULTS_ACHIEVED'),
  },
  scope: { pendingChanges: number('CYCLE_SCOPE_CHANGES_PENDING') },
  experiments: {
    running: number('CYCLE_EXPERIMENTS_RUNNING'),
    concluded: number('CYCLE_EXPERIMENTS_CONCLUDED'),
    consentRequired: true,
    sampleSize,
    conversions,
    conversionPct,
    guardrailBreaches: number('CYCLE_EXPERIMENT_GUARDRAIL_BREACHES'),
  },
  delivery: {
    milestonesDone: number('CYCLE_MILESTONES_DONE'),
    milestonesBlocked: number('CYCLE_MILESTONES_BLOCKED'),
    requiredGates,
    passedGates,
    gatesCompletionPct: requiredGates > 0 ? Number(((passedGates / requiredGates) * 100).toFixed(2)) : 0,
  },
  readiness: {
    freezeReady: text('CYCLE_FREEZE_READY', 'false') === 'true',
    releaseReady: text('CYCLE_RELEASE_READY', 'false') === 'true',
    blockerCount: number('CYCLE_BLOCKER_COUNT'),
  },
};

const lines = [
  '# BemMeCuida — execução do ciclo 0.11.0',
  '',
  `- Gerado em: ${report.generatedAt}`,
  `- RC planejada: ${report.cycle.releaseCandidate}`,
  `- Estado: ${report.cycle.status}`,
  `- Backlog concluído: ${report.backlog.done}/${report.backlog.committed}`,
  `- Gates obrigatórios: ${report.delivery.passedGates}/${report.delivery.requiredGates}`,
  `- Experimentos em execução: ${report.experiments.running}`,
  `- Amostra agregada: ${report.experiments.sampleSize}`,
  `- Conversão agregada: ${report.experiments.conversionPct}%`,
  `- Pronto para congelar: ${report.readiness.freezeReady ? 'sim' : 'não'}`,
  `- Pronto para lançar: ${report.readiness.releaseReady ? 'sim' : 'não'}`,
  `- Bloqueadores: ${report.readiness.blockerCount}`,
  '',
  'O relatório usa somente métricas técnicas agregadas e não contém dados pessoais ou clínicos.',
  '',
  '**Tehkné Solutions**',
];

mkdirSync(dirname(output), { recursive: true });
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownOutput, `${lines.join('\n')}\n`, 'utf8');
console.log(`Relatório do ciclo gerado em ${output}`);
console.log(`Resumo Markdown gerado em ${markdownOutput}`);
