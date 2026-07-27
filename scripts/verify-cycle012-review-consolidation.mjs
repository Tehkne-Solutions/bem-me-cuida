import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildConsolidationArtifact } from './lib/cycle012-review-consolidation.mjs';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const config = readJson('release/cycle-0.12.0/review-consolidation-config.json');
const approvalPolicy = readJson('release/cycle-0.12.0/approval-policy.json');
const captureConfig = readJson('release/cycle-0.12.0/review-capture-config.json');

if (config.status !== 'consolidation-ready-activation-blocked') failures.push('configuração não permanece bloqueada.');
if (JSON.stringify([...config.requiredTracks].sort()) !== JSON.stringify([...approvalPolicy.requiredTracks].sort())) failures.push('trilhas divergem da política de aprovação.');
if (JSON.stringify([...config.requiredTracks].sort()) !== JSON.stringify([...captureConfig.allowedTracks].sort())) failures.push('trilhas divergem da captura humana.');
if (config.minimumDistinctReviewers !== approvalPolicy.reviewerRules.minimumDistinctReviewers) failures.push('mínimo de revisores divergente.');
if (config.securityAndPrivacyReviewersMustDiffer !== true) failures.push('separação security/privacy ausente.');
for (const permission of ['automaticActivationAllowed', 'automaticMigrationAllowed', 'automaticImplementationAllowed']) {
  if (config.proposal?.[permission] !== false) failures.push(`permissão ${permission} precisa permanecer falsa.`);
}
if (config.proposal?.humanMergeRequired !== true) failures.push('merge humano obrigatório ausente.');
for (const flag of ['containsPersonalData', 'containsClinicalData', 'containsRawFeedback', 'containsJournalContent', 'containsSecrets']) {
  if (config.privacy?.[flag] !== false) failures.push(`flag de privacidade inválida: ${flag}.`);
}

const requiredFiles = [
  'scripts/lib/cycle012-review-consolidation.mjs',
  'scripts/consolidate-cycle012-reviews.mjs',
  'scripts/generate-cycle012-activation-proposal-from-consolidation.mjs',
  'scripts/test-cycle012-review-consolidation.mjs',
];
for (const path of requiredFiles) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}

const records = [];
const reviewsDir = join(root, config.reviewDirectory);
if (existsSync(reviewsDir)) {
  for (const name of readdirSync(reviewsDir).filter((entry) => entry.endsWith('.json')).sort()) {
    records.push(JSON.parse(readFileSync(join(reviewsDir, name), 'utf8')));
  }
}
const sourceCommit = records[0]?.sourceCommit ?? '0'.repeat(40);
const artifact = buildConsolidationArtifact({
  sourceCommit,
  records,
  config,
  sourceClosure: readJson('release/rc-0.11.0/cycle-closure.json'),
  cleanup: readJson('release/cycle-0.12.0/environment-cleanup.json'),
  feedback: readJson('release/cycle-0.12.0/feedback-summary.json'),
  scope: readJson('release/cycle-0.12.0/scope.json'),
  migrationPlan: readJson('release/cycle-0.12.0/migration-plan.json'),
  generatedAt: 'structural-verification',
});
if (artifact.activationAllowed !== false) failures.push('consolidação autorizou ativação indevidamente.');
if (artifact.controls?.doesNotActivateAutomatically !== true) failures.push('controle de não ativação ausente.');

if (!['structure', 'report'].includes(mode)) failures.push(`modo inválido: ${mode}`);
if (failures.length) {
  console.error('Consolidação de revisões 0.12.0 reprovada:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (mode === 'report') {
  console.log(JSON.stringify({
    cycleVersion: config.cycleVersion,
    status: config.status,
    reviewRecordCount: records.length,
    currentReviewStatus: artifact.status,
    currentRecommendation: artifact.recommendation,
    externalBlockers: artifact.external.blockers,
    activationAllowed: false,
  }, null, 2));
}
console.log('Consolidação de revisões 0.12.0 aprovada em modo fail-closed.');
console.log('Tehkné Solutions');
