import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
if (!['structure', 'capture'].includes(mode)) throw new Error('Modo inválido. Use structure ou capture.');
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');

const requiredFiles = [
  '.github/workflows/rc-011-android-physical-validation.yml',
  'release/rc-0.11.0/android-session.template.json',
  'scripts/lib/rc011-android-physical-validation.mjs',
  'scripts/capture-rc011-android-session.mjs',
  'scripts/apply-rc011-android-session.mjs',
  'scripts/test-rc011-android-physical-validation.mjs',
  'docs/SPRINT-24.md',
  'docs/ADR-028-sessoes-fisicas-android.md',
  'docs/RC-0.11.0-ANDROID-PHYSICAL-VALIDATION-RUNBOOK.md',
];
for (const path of requiredFiles) if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);

if (existsSync(join(root, '.github/workflows/rc-011-android-physical-validation.yml'))) {
  const workflow = read('.github/workflows/rc-011-android-physical-validation.yml');
  for (const marker of [
    'capture-session', 'open-session-pr', 'package-android-review', 'environment: rc-011-homologation',
    'Capture sanitized physical session', 'Apply session to reviewable records', 'Create or reuse session pull request',
    'android-homologation-plan.json', 'android-gate-proposal.json', 'automaticApproval',
  ]) {
    if (!workflow.includes(marker)) fail(`workflow de homologação física sem marcador: ${marker}`);
  }
  if (workflow.includes('gh pr merge')) fail('workflow não pode mesclar PR de sessão automaticamente.');
  ok('Workflow separa captura, PR humano e pacote de revisão Android.');
}

if (existsSync(join(root, 'scripts/lib/rc011-android-physical-validation.mjs'))) {
  const core = read('scripts/lib/rc011-android-physical-validation.mjs');
  for (const marker of [
    'containsDeviceIdentifiers', 'usesSyntheticAccounts', 'automaticApproval: false', 'retest-required',
    'ready-for-review', 'globalGatesRemainAuthoritative', "['android', 'ios']", 'platformResults.android',
  ]) {
    if (!core.includes(marker)) fail(`política física Android sem controle: ${marker}`);
  }
  ok('Política mantém privacidade, retestes e autoridade dos gates globais.');
}

if (existsSync(join(root, 'package.json'))) {
  const packageJson = JSON.parse(read('package.json'));
  for (const script of ['rc011:android-physical:test', 'rc011:android-physical:structure', 'sprint24:check']) {
    if (!packageJson.scripts?.[script]) fail(`script npm ausente: ${script}`);
  }
  if (!packageJson.scripts?.['release:check']?.includes('verify-sprint24-readiness.mjs')) {
    fail('release:check não inclui Sprint 24.');
  }
}

if (existsSync(join(root, 'scripts/parse-rc011-issue-command.mjs'))) {
  const parser = read('scripts/parse-rc011-issue-command.mjs');
  for (const marker of ['android-session', 'android-session-pr', 'android-review', 'suiteResults', 'profileId']) {
    if (!parser.includes(marker)) fail(`parser não contém comando ou campo: ${marker}`);
  }
}

if (mode === 'capture') {
  const planPath = join(root, 'release/rc-0.11.0/android-homologation-plan.json');
  if (!existsSync(planPath)) fail('plano Android capturado ainda não existe.');
  else {
    const plan = JSON.parse(read('release/rc-0.11.0/android-homologation-plan.json'));
    if (!plan.build?.buildId || !/^[a-f0-9]{64}$/i.test(plan.build?.artifactSha256 ?? '')) {
      fail('plano Android não está vinculado a build ID e SHA-256 válidos.');
    }
  }
}

if (failures.length) {
  console.error(`Homologação física Android reprovada no modo ${mode}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Homologação física Android aprovada no modo ${mode}:`);
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Nenhuma sessão, suíte ou gate é aprovado sem evidência e PR revisado.');
console.log('- Tehkné Solutions');
