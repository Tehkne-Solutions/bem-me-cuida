import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { assertQueueUpdateRecordSafe } from './lib/cycle012-queue-update.mjs';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const policyPath = 'release/cycle-0.12.0/queue-update-policy.json';
if (!existsSync(join(root, policyPath))) failures.push(`arquivo obrigatório ausente: ${policyPath}`);
const policy = failures.length ? {} : readJson(policyPath);

for (const state of ['not-started', 'in-progress', 'blocked', 'evidence-submitted', 'review-requested']) {
  if (!policy.progressStates?.includes(state)) failures.push(`progressState ausente: ${state}`);
}
for (const forbidden of ['completed', 'closed', 'resolved', 'approved', 'done']) {
  if (policy.progressStates?.includes(forbidden) || policy.dependencyStates?.includes(forbidden)) failures.push(`estado terminal proibido: ${forbidden}`);
}
for (const control of ['informationalOnly', 'doesNotCompleteItems', 'doesNotChangeQueueReadiness', 'doesNotResolveDependencies', 'doesNotChangeGates', 'doesNotActivateCycle', 'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'doesNotMergePullRequests', 'doesNotPublishBuilds', 'doesNotDeleteEnvironments']) {
  if (policy.controls?.[control] !== true) failures.push(`controle ausente: ${control}`);
}
if (policy.record?.freeTextAllowed !== false || policy.record?.pullRequestRequired !== true || policy.record?.immutableAfterMerge !== true) {
  failures.push('política de registro não exige PR imutável e sem texto livre.');
}
if (policy.authorization?.trustedBaseBranch !== 'main') failures.push('branch base confiável precisa ser main.');
const permissions = [...(policy.authorization?.allowedRepositoryPermissions ?? [])].sort();
if (permissions.length !== 3 || permissions.join(',') !== 'admin,maintain,write') failures.push('permissões autorizadas inválidas.');

const updateDir = join(root, policy.record?.directory ?? 'release/cycle-0.12.0/queue-updates');
let updateCount = 0;
if (existsSync(updateDir)) {
  const names = readdirSync(updateDir).filter((name) => name.endsWith('.json')).sort();
  updateCount = names.length;
  const recordIds = new Set();
  for (const name of names) {
    if (!/^queue-update-[a-f0-9]{20}\.json$/i.test(name)) failures.push(`nome de registro inválido: ${name}`);
    try {
      const record = readJson(`${policy.record.directory}/${name}`);
      assertQueueUpdateRecordSafe(record, policy);
      if (`${record.recordId}.json` !== name) failures.push(`recordId divergente do arquivo: ${name}`);
      if (recordIds.has(record.recordId)) failures.push(`recordId duplicado: ${record.recordId}`);
      recordIds.add(record.recordId);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  }
}

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}
if (!['structure', 'report'].includes(mode)) failures.push(`modo inválido: ${mode}`);

if (failures.length) {
  console.error('Atualizações protegidas da fila 0.12.0 reprovadas:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
if (mode === 'report') {
  console.log(JSON.stringify({
    cycleVersion: policy.cycleVersion,
    status: policy.status,
    progressStates: policy.progressStates.length,
    dependencyStates: policy.dependencyStates.length,
    updateCount,
    completionAllowed: false,
    gateMutationAllowed: false,
    activationAllowed: false,
  }, null, 2));
}
console.log('Atualizações protegidas da fila 0.12.0 aprovadas em modo informativo.');
console.log('Tehkné Solutions');
