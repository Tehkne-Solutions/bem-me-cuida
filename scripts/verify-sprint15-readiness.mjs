import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);

const requiredFiles = [
  'docs/SPRINT-15.md',
  'docs/ADR-019-rc-011-build-upgrade-ota.md',
  'docs/RC-0.11.0-BUILD-RUNBOOK.md',
  'docs/RC-0.11.0-UPGRADE-REGRESSION.md',
  'docs/RC-0.11.0-DEVICE-MATRIX.md',
  'release/rc-0.11.0/device-matrix.json',
  'release/rc-0.11.0/test-results.json',
  'release/rc-0.11.0/gate-map.json',
  'scripts/verify-rc011-readiness.mjs',
  'scripts/generate-rc011-manifest.mjs',
  'scripts/generate-rc011-validation-report.mjs',
  'scripts/generate-rc011-gate-payload.mjs',
  '.github/workflows/rc-011-build.yml',
  '.maestro/rc011-smoke.yml',
  '.maestro/upgrade-010-to-011.yml',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 15 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 15 encontrados.`);

const appConfig = read('apps/mobile/app.config.ts');
for (const marker of ['rc011', 'BemMeCuida 0.11 RC', 'bemmecuida-rc011', 'com.tehknesolutions.bemmecuida.rc011', 'EXPO_PUBLIC_APP_VERSION']) {
  if (!appConfig.includes(marker)) fail(`app.config.ts sem marcador da RC 0.11: ${marker}`);
}

const eas = readJson('apps/mobile/eas.json');
const profile = eas?.build?.rc011;
if (profile?.channel !== 'rc-0-11') fail('Perfil rc011 sem canal rc-0-11.');
if (profile?.distribution !== 'internal') fail('Perfil rc011 deve usar distribuição interna.');
if (profile?.env?.EXPO_PUBLIC_APP_VERSION !== '0.11.0') fail('Perfil rc011 sem versão 0.11.0.');
if (profile?.env?.EXPO_PUBLIC_RELEASE_CANDIDATE !== '1') fail('Perfil rc011 sem candidata 1.');

const rootPackage = readJson('package.json');
for (const script of [
  'sprint15:check', 'rc011:prebuild:check', 'rc011:artifacts:check', 'rc011:promotion:check',
  'rc011:manifest', 'rc011:validation:report', 'rc011:gates:payload', 'build:android:rc011', 'build:ios:rc011',
  'e2e:rc011', 'e2e:upgrade:rc011',
]) {
  if (!rootPackage.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}

const mobilePackage = readJson('apps/mobile/package.json');
if (!mobilePackage.scripts?.['build:android:rc011']) fail('Workspace mobile sem build Android rc011.');
if (!mobilePackage.scripts?.['build:ios:rc011']) fail('Workspace mobile sem build iOS rc011.');

const matrix = readJson('release/rc-0.11.0/device-matrix.json');
const profiles = matrix.profiles ?? [];
if (matrix.release !== '0.11.0-rc.1') fail('Matriz deve referenciar 0.11.0-rc.1.');
for (const requirement of [
  ['android', 'minimum-supported'], ['android', 'mainstream'], ['android', 'latest-supported'],
  ['ios', 'minimum-supported'], ['ios', 'mainstream'], ['ios', 'latest-supported'],
]) {
  if (!profiles.some((item) => item.platform === requirement[0] && item.class === requirement[1] && item.required)) {
    fail(`Matriz sem perfil obrigatório ${requirement.join('/')}.`);
  }
}

const testResults = readJson('release/rc-0.11.0/test-results.json');
const suites = new Set((testResults.suites ?? []).map((item) => item.id));
for (const id of ['fresh-install', 'upgrade-010-011', 'local-database-regression', 'offline-sync', 'accessibility', 'ota-compatibility', 'rollback', 'privacy']) {
  if (!suites.has(id)) fail(`Registro de homologação sem suíte: ${id}`);
}

const gateMap = readJson('release/rc-0.11.0/gate-map.json');
for (const gate of ['database', 'accessibility', 'privacy', 'rc_build', 'physical_device', 'ota_compatibility']) {
  if (!(gateMap.gates ?? []).some((item) => item.gateKey === gate && item.required)) fail(`Mapeamento sem gate obrigatório: ${gate}`);
}

const workflow = read('.github/workflows/rc-011-build.yml');
for (const marker of ['workflow_dispatch', 'rc-011-build', 'EXPO_TOKEN', 'cycle:rc:check', 'rc011:prebuild:check']) {
  if (!workflow.includes(marker)) fail(`Workflow protegido sem marcador: ${marker}`);
}
if (/service[_-]?role/i.test([appConfig, workflow, read('scripts/generate-rc011-manifest.mjs')].join('\n'))) {
  fail('Referência a service role detectada nos artefatos da RC.');
}

if (failures.length) {
  console.error('Sprint 15 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 15 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Variante nativa, build protegido, matriz, upgrade, banco local, OTA e gates estão versionados.');
console.log('- A promoção continua bloqueada enquanto evidências obrigatórias estiverem pendentes.');
console.log('- Tehkné Solutions');
