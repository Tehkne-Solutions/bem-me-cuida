import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');

const requiredFiles = [
  '.github/workflows/rc-011-android-artifact.yml',
  'scripts/lib/rc011-android-artifact.mjs',
  'scripts/select-eas-android-build.mjs',
  'scripts/generate-rc011-android-homologation-plan.mjs',
  'scripts/verify-rc011-android-artifact.mjs',
  'scripts/test-rc011-android-artifact.mjs',
  'release/rc-0.11.0/android-homologation-plan.template.json',
  'docs/SPRINT-23.md',
  'docs/ADR-027-custodia-do-build-android.md',
  'docs/RC-0.11.0-ANDROID-ARTIFACT-RUNBOOK.md',
];
for (const path of requiredFiles) if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);

if (existsSync(join(root, '.github/workflows/rc-011-android-artifact.yml'))) {
  const workflow = read('.github/workflows/rc-011-android-artifact.yml');
  for (const marker of [
    'discover-android',
    'capture-android',
    'open-artifact-pr',
    '--build-profile rc011',
    '--status finished',
    '--app-version 0.11.0',
    '--git-commit-hash',
    'build:download',
    'collect-eas-build-metadata.mjs',
    'apply-rc011-capture.mjs',
    'generate-rc011-android-homologation-plan.mjs',
    'environment: rc-011-homologation',
    'Nenhum build, aparelho, suíte ou gate foi aprovado automaticamente.',
  ]) {
    if (!workflow.includes(marker)) fail(`workflow Android sem marcador: ${marker}`);
  }
  if (workflow.includes('gh pr merge')) fail('workflow Android não pode mesclar o PR automaticamente.');
  if (workflow.includes('echo "$EXPO_TOKEN"')) fail('workflow Android não pode imprimir o token EAS.');
  ok('Workflow separa descoberta, captura e PR de artefatos.');
}

if (existsSync(join(root, 'scripts/lib/rc011-android-artifact.mjs'))) {
  const core = read('scripts/lib/rc011-android-artifact.mjs');
  for (const marker of [
    "build.platform !== 'android'",
    "build.status !== 'finished'",
    "build.appVersion !== '0.11.0'",
    "build.buildProfile !== 'rc011'",
    'Mais de um build corresponde aos filtros',
    "status: 'pending-physical-validation'",
    "status: 'pending'",
    "generatedBy: 'Tehkné Solutions'",
  ]) {
    if (!core.includes(marker)) fail(`política Android sem controle: ${marker}`);
  }
  ok('Política exige correspondência exata e inicia toda homologação como pendente.');
}

if (existsSync(join(root, 'scripts/parse-rc011-issue-command.mjs'))) {
  const parser = read('scripts/parse-rc011-issue-command.mjs');
  for (const command of ['discover-android', 'capture-android-latest', 'android-artifact-pr']) {
    if (!parser.includes(`'${command}'`)) fail(`parser sem comando: ${command}`);
  }
}

if (existsSync(join(root, 'package.json'))) {
  const packageJson = JSON.parse(read('package.json'));
  for (const script of [
    'rc011:android-artifact:test',
    'rc011:android-artifact:structure',
    'rc011:android-artifact:capture',
    'sprint23:check',
  ]) {
    if (!packageJson.scripts?.[script]) fail(`script npm ausente: ${script}`);
  }
  if (!packageJson.scripts?.['release:check']?.includes('verify-sprint23-readiness.mjs')) {
    fail('release:check não inclui Sprint 23.');
  }
}

if (failures.length) {
  console.error('Sprint 23 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 23 aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- A ausência de um build real mantém builds.json e a matriz física inalterados.');
console.log('- Tehkné Solutions');
