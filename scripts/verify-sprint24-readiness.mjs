import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');

const requiredFiles = [
  '.github/workflows/rc-011-android-physical-validation.yml',
  'scripts/lib/rc011-android-physical-validation.mjs',
  'scripts/capture-rc011-android-session.mjs',
  'scripts/apply-rc011-android-session.mjs',
  'scripts/test-rc011-android-physical-validation.mjs',
  'scripts/verify-rc011-android-physical-validation.mjs',
  'release/rc-0.11.0/android-session.template.json',
  'docs/SPRINT-24.md',
  'docs/ADR-028-sessoes-fisicas-android.md',
  'docs/RC-0.11.0-ANDROID-PHYSICAL-VALIDATION-RUNBOOK.md',
];
for (const path of requiredFiles) if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);

if (existsSync(join(root, '.github/workflows/rc-011-android-physical-validation.yml'))) {
  const workflow = read('.github/workflows/rc-011-android-physical-validation.yml');
  for (const marker of [
    'capture-session', 'open-session-pr', 'package-android-review',
    'environment: rc-011-homologation', 'npm run rc011:infrastructure:external',
    'Capture sanitized physical session', 'Apply session to reviewable records',
    'gh pr create', 'android-sessions/', 'Nenhum gate global foi aprovado automaticamente',
  ]) {
    if (!workflow.includes(marker)) fail(`workflow do Sprint 24 sem marcador: ${marker}`);
  }
  if (workflow.includes('gh pr merge')) fail('Sprint 24 não pode mesclar PR automaticamente.');
  ok('Workflow protege captura, PR de sessão e pacote de revisão.');
}

if (existsSync(join(root, 'scripts/lib/rc011-android-physical-validation.mjs'))) {
  const core = read('scripts/lib/rc011-android-physical-validation.mjs');
  for (const marker of [
    'assertBuildAndPlan', 'artifactSha256', 'containsDeviceIdentifiers', 'usesSyntheticAccounts',
    'retest-required', 'ready-for-review', 'platformResults.android', "['android', 'ios']",
    'globalGatesRemainAuthoritative', 'automaticApproval: false',
  ]) {
    if (!core.includes(marker)) fail(`política do Sprint 24 sem controle: ${marker}`);
  }
  ok('Política vincula sessões ao build, preserva plataformas e exige revisão.');
}

if (existsSync(join(root, 'scripts/test-rc011-android-physical-validation.mjs'))) {
  const test = read('scripts/test-rc011-android-physical-validation.mjs');
  for (const marker of ['retest-required', 'ready-for-review', 'duplicate', 'platformResults.android', 'globalApprovalChanged']) {
    if (!test.includes(marker)) fail(`teste do Sprint 24 sem cenário: ${marker}`);
  }
}

if (existsSync(join(root, 'package.json'))) {
  const packageJson = JSON.parse(read('package.json'));
  for (const script of ['rc011:android-physical:test', 'rc011:android-physical:structure', 'sprint24:check']) {
    if (!packageJson.scripts?.[script]) fail(`script npm ausente: ${script}`);
  }
  if (!packageJson.scripts?.['release:check']?.endsWith('verify-sprint24-readiness.mjs')) {
    fail('release:check não termina na trava do Sprint 24.');
  }
}

if (failures.length) {
  console.error('Sprint 24 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 24 aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Sessões reais, evidências e aprovações continuam dependentes de execução externa e revisão humana.');
console.log('- Tehkné Solutions');
