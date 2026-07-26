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
  'docs/SPRINT-16.md',
  'docs/ADR-020-homologacao-rastreavel-rc011.md',
  'docs/RC-0.11.0-HOMOLOGATION-RUNBOOK.md',
  'docs/RC-0.11.0-EVIDENCE-POLICY.md',
  '.github/workflows/rc-011-homologation.yml',
  'release/rc-0.11.0/builds.json',
  'release/rc-0.11.0/ota-validation.json',
  'scripts/collect-eas-build-metadata.mjs',
  'scripts/collect-eas-update-metadata.mjs',
  'scripts/apply-rc011-capture.mjs',
  'scripts/record-rc011-evidence.mjs',
  'scripts/verify-rc011-homologation.mjs',
  'scripts/generate-rc011-decision-package.mjs',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 16 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 16 encontrados.`);

const packageJson = readJson('package.json');
for (const script of [
  'sprint16:check',
  'rc011:homologation:structure',
  'rc011:homologation:capture',
  'rc011:homologation:promotion',
  'rc011:decision:package',
  'rc011:evidence:record',
  'rc011:capture:apply',
]) {
  if (!packageJson.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}
if (!packageJson.scripts?.['release:check']?.includes('verify-sprint16-readiness')) {
  fail('release:check não inclui o Sprint 16.');
}

const workflow = read('.github/workflows/rc-011-homologation.yml');
for (const marker of [
  'workflow_dispatch',
  'rc-011-homologation',
  'eas build:view',
  'eas build:download',
  'eas update --channel rc-0-11',
  'eas update:rollback',
  'EXPO_TOKEN',
]) {
  if (!workflow.includes(marker)) fail(`Workflow de homologação sem marcador: ${marker}`);
}
if (/service[_-]?role/i.test(workflow)) fail('Workflow de homologação contém referência a service role.');

const builds = readJson('release/rc-0.11.0/builds.json');
const ota = readJson('release/rc-0.11.0/ota-validation.json');
for (const [name, document] of Object.entries({ builds, ota })) {
  if (document.release !== '0.11.0-rc.1') fail(`${name} não referencia a candidata correta.`);
  if (document.generatedBy !== 'Tehkné Solutions') fail(`${name} sem assinatura Tehkné Solutions.`);
  if (document.privacy?.containsPersonalData !== false || document.privacy?.containsClinicalData !== false) {
    fail(`${name} sem declaração de privacidade mínima.`);
  }
}
if (builds.platforms?.android?.status !== 'pending' || builds.platforms?.ios?.status !== 'pending') {
  fail('O registro inicial de builds deve permanecer pending até captura real.');
}
if (ota.publish?.status !== 'pending' || ota.rollback?.status !== 'pending') {
  fail('O registro inicial de OTA deve permanecer pending até execução real.');
}

const collector = read('scripts/collect-eas-build-metadata.mjs');
for (const marker of ['sha256', '0.11.0-rc.1', 'containsClinicalData: false']) {
  if (!collector.includes(marker)) fail(`Coletor de build sem controle: ${marker}`);
}

if (failures.length) {
  console.error('Sprint 16 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 16 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Captura de builds, OTA, evidências e pacote de decisão estão versionados.');
console.log('- Resultados físicos permanecem pending até execução comprovada.');
console.log('- Tehkné Solutions');
