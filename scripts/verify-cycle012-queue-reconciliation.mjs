import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const policyPath = 'release/cycle-0.12.0/queue-reconciliation-policy.json';
if (!existsSync(join(root, policyPath))) failures.push(`arquivo obrigatório ausente: ${policyPath}`);
const policy = failures.length ? {} : readJson(policyPath);

const expectedClassifications = [
  'aligned-open-item',
  'source-reflected-closed',
  'stale-source-commit',
  'evidence-awaiting-source-reflection',
  'dependency-report-not-reflected',
  'state-conflict',
  'invalid-item-reference',
];
for (const classification of expectedClassifications) {
  if (!policy.classifications?.includes(classification)) failures.push(`classificação ausente: ${classification}`);
  if (!['info', 'warning', 'critical'].includes(policy.severity?.[classification])) failures.push(`severidade inválida: ${classification}`);
}
if (new Set(policy.classifications ?? []).size !== (policy.classifications ?? []).length) failures.push('classificações duplicadas.');
if (policy.status !== 'reconciliation-ready-activation-blocked') failures.push('status da política de reconciliação inválido.');

for (const path of Object.values(policy.sourceTruth ?? {}).filter((value) => typeof value === 'string')) {
  if (!existsSync(join(root, path))) failures.push(`fonte de verdade ausente: ${path}`);
}
for (const control of [
  'readOnly', 'deterministic', 'doesNotRewriteUpdates', 'doesNotChangeQueueReadiness', 'doesNotResolveDependencies',
  'doesNotChangeReviews', 'doesNotChangeGates', 'doesNotActivateCycle', 'doesNotAuthorizeMigrations',
  'doesNotAuthorizeImplementation', 'doesNotMergePullRequests', 'doesNotPublishBuilds', 'doesNotDeleteEnvironments',
]) {
  if (policy.controls?.[control] !== true) failures.push(`controle ausente: ${control}`);
}
for (const flag of [
  'containsPersonalData', 'containsClinicalData', 'containsRawFeedback', 'containsJournalContent',
  'containsSecrets', 'containsRawIdentity', 'containsPseudonymousActorReference',
]) {
  if (policy.privacy?.[flag] !== false) failures.push(`flag de privacidade inválida: ${flag}`);
}

const updateDir = join(root, policy.sourceTruth?.queueUpdatesDirectory ?? 'release/cycle-0.12.0/queue-updates');
const updateCount = existsSync(updateDir) ? readdirSync(updateDir).filter((name) => name.endsWith('.json')).length : 0;
const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}
if (!['structure', 'report'].includes(mode)) failures.push(`modo inválido: ${mode}`);

if (failures.length) {
  console.error('Reconciliação da fila 0.12.0 reprovada:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
if (mode === 'report') {
  console.log(JSON.stringify({
    cycleVersion: policy.cycleVersion,
    status: policy.status,
    classificationCount: policy.classifications.length,
    updateCount,
    correctionAllowed: false,
    gateMutationAllowed: false,
    activationAllowed: false,
  }, null, 2));
}
console.log('Reconciliação da fila 0.12.0 aprovada em modo somente leitura.');
console.log('Tehkné Solutions');
