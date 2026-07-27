import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildOperationsQueue } from './lib/cycle012-operations-queue.mjs';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const configPath = 'release/cycle-0.12.0/operations-queue-config.json';
if (!existsSync(join(root, configPath))) failures.push(`arquivo ausente: ${configPath}`);
const config = failures.length ? {} : readJson(configPath);

if (!failures.length) {
  if (config.cycleVersion !== '0.12.0') failures.push('versão de ciclo inválida.');
  if (config.status !== 'queue-ready-activation-blocked') failures.push('fila não está bloqueada para ativação.');
  if (JSON.stringify(config.commands?.allowed) !== JSON.stringify(['queue', 'owners', 'next'])) failures.push('comandos da fila divergentes.');
  if (config.commands?.exactMatchRequired !== true || config.commands?.freeTextAllowed !== false) failures.push('comandos da fila não estão em modo estrito.');
  if (JSON.stringify(config.priorities) !== JSON.stringify(['critical', 'high', 'medium', 'low'])) failures.push('ordem de prioridades inválida.');
  for (const track of ['architecture', 'security', 'privacy', 'accessibility', 'database']) {
    if (!config.reviewTracks?.[track]) failures.push(`política de revisão ausente: ${track}.`);
  }
  for (const gate of ['source-cycle-closure', 'environment-cleanup', 'feedback-summary', 'scope-approval', 'migration-plan-approval']) {
    if (!config.externalGates?.[gate]) failures.push(`política de gate ausente: ${gate}.`);
  }
  for (const control of ['readOnly', 'roleBasedOnly', 'doesNotAssignPeople', 'doesNotExecuteNextSteps', 'doesNotActivateCycle', 'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'doesNotMergePullRequests', 'doesNotPublishBuilds', 'doesNotDeleteEnvironments']) {
    if (config.controls?.[control] !== true) failures.push(`controle ausente: ${control}.`);
  }

  const fixtureSnapshot = {
    cycleVersion: '0.12.0',
    sourceCommit: '0'.repeat(40),
    activationAllowed: false,
    reviews: {
      tracks: ['architecture', 'security', 'privacy', 'accessibility', 'database'].map((id) => ({ id, status: 'pending', residualRisk: false })),
      minimumDistinctReviewersPass: false,
      securityPrivacySeparationPass: false,
    },
    externalGates: [
      { id: 'source-cycle-closure', status: 'blocked', passed: false },
      { id: 'environment-cleanup', status: 'pending', passed: false },
      { id: 'feedback-summary', status: 'pending', passed: false },
      { id: 'scope-approval', status: 'pending', passed: false },
      { id: 'migration-plan-approval', status: 'pending', passed: false },
    ],
  };
  const queue = buildOperationsQueue({ snapshot: fixtureSnapshot, config, generatedAt: '2026-07-27T16:00:00.000Z' });
  if (queue.activationAllowed !== false || queue.executionAllowed !== false) failures.push('fixture da fila permitiu ativação ou execução.');
  if (!queue.items.length || !queue.nextItems.length) failures.push('fixture da fila não gerou pendências acionáveis.');
  if (mode === 'report') {
    console.log(JSON.stringify({
      cycleVersion: queue.cycleVersion,
      status: queue.status,
      totalItems: queue.summary.totalItems,
      readyItems: queue.summary.readyItems,
      waitingItems: queue.summary.waitingItems,
      ownerRoleCount: queue.summary.ownerRoleCount,
      activationAllowed: queue.activationAllowed,
      executionAllowed: queue.executionAllowed,
    }, null, 2));
  } else if (mode !== 'structure') {
    failures.push(`modo inválido: ${mode}`);
  }
}

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}

if (failures.length) {
  console.error('Fila operacional 0.12.0 reprovada:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Fila operacional 0.12.0 aprovada em modo somente leitura.');
console.log('Tehkné Solutions');
