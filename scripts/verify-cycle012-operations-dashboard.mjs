import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildOperationsSnapshot } from './lib/cycle012-operations-dashboard.mjs';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const configPath = 'release/cycle-0.12.0/operations-dashboard-config.json';
if (!existsSync(join(root, configPath))) failures.push(`arquivo obrigatório ausente: ${configPath}`);
const config = failures.length ? {} : readJson(configPath);
const expectedCommands = ['blockers', 'gates', 'reviews', 'status'];
if ([...(config.commands?.allowed ?? [])].sort().join(',') !== expectedCommands.join(',')) failures.push('lista de comandos permitidos inválida.');
if (config.commands?.prefix !== '/cycle012' || config.commands?.exactMatchRequired !== true || config.commands?.freeTextAllowed !== false) failures.push('comandos não estão em modo estrito.');
if ([...(config.authorization?.allowedAuthorAssociations ?? [])].sort().join(',') !== ['COLLABORATOR', 'MEMBER', 'OWNER'].join(',')) failures.push('associações autorizadas inválidas.');
if (config.authorization?.pullRequestCommentsAllowed !== false || config.authorization?.anonymousExecutionAllowed !== false) failures.push('restrições de autorização ausentes.');
for (const control of ['readOnly', 'doesNotActivateCycle', 'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'doesNotMergePullRequests', 'doesNotPublishBuilds', 'doesNotDeleteEnvironments']) {
  if (config.controls?.[control] !== true) failures.push(`controle ausente: ${control}.`);
}
for (const flag of ['containsPersonalData', 'containsClinicalData', 'containsRawFeedback', 'containsJournalContent', 'containsSecrets', 'containsRawIdentity']) {
  if (config.privacy?.[flag] !== false) failures.push(`flag de privacidade inválida: ${flag}.`);
}

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}
if (!['structure', 'report'].includes(mode)) failures.push(`modo inválido: ${mode}`);

let snapshot = null;
if (!failures.length && mode === 'report') {
  const reviewsDir = join(root, 'release/cycle-0.12.0/reviews');
  const records = existsSync(reviewsDir)
    ? readdirSync(reviewsDir).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(`release/cycle-0.12.0/reviews/${name}`))
    : [];
  snapshot = buildOperationsSnapshot({
    sourceCommit: '0'.repeat(40),
    records,
    config,
    sourceClosure: readJson('release/rc-0.11.0/cycle-closure.json'),
    cleanup: readJson('release/cycle-0.12.0/environment-cleanup.json'),
    feedback: readJson('release/cycle-0.12.0/feedback-summary.json'),
    scope: readJson('release/cycle-0.12.0/scope.json'),
    migrationPlan: readJson('release/cycle-0.12.0/migration-plan.json'),
    generatedAt: 'verification',
  });
}

if (failures.length) {
  console.error('Painel operacional 0.12.0 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
if (snapshot) {
  console.log(JSON.stringify({
    cycleVersion: snapshot.cycleVersion,
    status: snapshot.status,
    recommendation: snapshot.recommendation,
    blockerCount: snapshot.summary.blockerCount,
    passingTrackCount: snapshot.summary.passingTrackCount,
    externalGatesComplete: snapshot.summary.externalGatesComplete,
    activationAllowed: snapshot.activationAllowed,
  }, null, 2));
}
console.log('Painel operacional 0.12.0 aprovado em modo somente leitura.');
console.log('Tehkné Solutions');
