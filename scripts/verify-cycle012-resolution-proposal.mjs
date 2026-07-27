import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { assertResolutionProposalSafe } from './lib/cycle012-resolution-proposal.mjs';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const policyPath = 'release/cycle-0.12.0/resolution-proposal-policy.json';
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
const allowedTargets = new Set(['none', 'queue-update-record', 'reconciliation-item-source', 'queue-catalog']);
for (const classification of expectedClassifications) {
  const actions = policy.actionsByClassification?.[classification];
  if (!Array.isArray(actions) || actions.length !== 1) failures.push(`${classification}: deve possuir exatamente uma ação controlada.`);
  if (!allowedTargets.has(policy.targetByClassification?.[classification])) failures.push(`${classification}: alvo controlado inválido.`);
}
if (Object.keys(policy.actionsByClassification ?? {}).length !== expectedClassifications.length) failures.push('catálogo de ações contém classificações inesperadas.');
if (policy.status !== 'human-resolution-proposal-ready-activation-blocked') failures.push('status da política inválido.');
if (policy.proposal?.autoApplyForbidden !== true || policy.proposal?.pullRequestRequired !== true || policy.proposal?.freeTextAllowed !== false) {
  failures.push('política de proposta não está fail-closed.');
}
for (const control of [
  'proposalOnly', 'requiresIndependentHumanReview', 'doesNotRewriteQueueUpdates', 'doesNotChangeQueueReadiness',
  'doesNotResolveDependencies', 'doesNotChangeReviews', 'doesNotChangeGates', 'doesNotActivateCycle',
  'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'doesNotMergePullRequests',
  'doesNotPublishBuilds', 'doesNotDeleteEnvironments',
]) {
  if (policy.controls?.[control] !== true) failures.push(`controle ausente: ${control}`);
}
for (const flag of ['containsPersonalData', 'containsClinicalData', 'containsRawFeedback', 'containsJournalContent', 'containsSecrets', 'containsRawIdentity']) {
  if (policy.privacy?.[flag] !== false) failures.push(`flag de privacidade inválida: ${flag}`);
}
if (policy.privacy?.containsPseudonymousProposerReference !== true) failures.push('referência pseudonimizada do proponente não foi declarada.');

const proposalDirectory = join(root, policy.proposal?.directory ?? 'release/cycle-0.12.0/resolution-proposals');
let proposalCount = 0;
if (existsSync(proposalDirectory)) {
  for (const name of readdirSync(proposalDirectory).filter((candidate) => candidate.endsWith('.json')).sort()) {
    try {
      assertResolutionProposalSafe(readJson(`${policy.proposal.directory}/${name}`), policy);
      proposalCount += 1;
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : 'proposta inválida'}`);
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
  console.error('Propostas humanas de resolução reprovadas:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
if (mode === 'report') {
  console.log(JSON.stringify({
    cycleVersion: policy.cycleVersion,
    status: policy.status,
    classificationCount: expectedClassifications.length,
    proposalCount,
    autoApplyAllowed: false,
    gateMutationAllowed: false,
    activationAllowed: false,
  }, null, 2));
}
console.log('Propostas humanas de resolução aprovadas em modo fail-closed.');
console.log('Tehkné Solutions');
