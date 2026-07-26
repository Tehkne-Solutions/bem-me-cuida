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
  'docs/SPRINT-17.md',
  'docs/ADR-021-infraestrutura-externa-verificavel.md',
  'docs/RC-0.11.0-INFRASTRUCTURE-RUNBOOK.md',
  '.github/workflows/rc-011-infrastructure-readiness.yml',
  'release/rc-0.11.0/infrastructure-readiness.json',
  'scripts/capture-rc011-infrastructure.mjs',
  'scripts/apply-rc011-infrastructure-capture.mjs',
  'scripts/verify-rc011-infrastructure.mjs',
  'scripts/generate-rc011-infrastructure-report.mjs',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 17 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 17 encontrados.`);

const packageJson = readJson('package.json');
for (const script of [
  'sprint17:check',
  'rc011:infrastructure:structure',
  'rc011:infrastructure:external',
  'rc011:infrastructure:report',
  'rc011:infrastructure:capture:apply',
]) {
  if (!packageJson.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}
if (!packageJson.scripts?.['release:check']?.includes('verify-sprint17-readiness')) {
  fail('release:check não inclui o Sprint 17.');
}

const workflow = read('.github/workflows/rc-011-infrastructure-readiness.yml');
for (const marker of [
  'workflow_dispatch',
  'environment: rc-011-build',
  'environment: rc-011-homologation',
  "secrets.EXPO_TOKEN != ''",
  'capture-rc011-infrastructure.mjs',
  'apply-rc011-infrastructure-capture.mjs',
  'actions/download-artifact@v4',
  'RC011_AUTH_CALLBACKS',
]) {
  if (!workflow.includes(marker)) fail(`Workflow de infraestrutura sem marcador: ${marker}`);
}
if (/service[_-]?role/i.test(workflow)) fail('Workflow contém referência a service role.');
if (/echo\s+.*EXPO_TOKEN/i.test(workflow)) fail('Workflow pode imprimir referência direta ao EXPO_TOKEN.');

const registry = readJson('release/rc-0.11.0/infrastructure-readiness.json');
if (registry.release !== '0.11.0-rc.1') fail('Registro de infraestrutura não referencia 0.11.0-rc.1.');
if (registry.generatedBy !== 'Tehkné Solutions') fail('Registro sem assinatura Tehkné Solutions.');
if (registry.privacy?.containsSecrets !== false) fail('Registro sem declaração de ausência de secrets.');
for (const key of ['buildEnvironment', 'homologationEnvironment', 'services']) {
  if (!registry.scopes?.[key]?.required) fail(`Escopo obrigatório ausente no registro: ${key}.`);
}
const callbacks = registry.scopes?.services?.expectedCallbacks ?? [];
for (const callback of ['bemmecuida-rc011://auth/callback', 'bemmecuida-rc011://reset-password']) {
  if (!callbacks.includes(callback)) fail(`Callback da RC ausente no registro: ${callback}.`);
}

const capture = read('scripts/capture-rc011-infrastructure.mjs');
for (const marker of ['EXPO_TOKEN_PRESENT', 'containsSecrets: false', "status: ready ? 'ready' : 'blocked'"]) {
  if (!capture.includes(marker)) fail(`Captura de infraestrutura sem controle: ${marker}`);
}
if (capture.includes('process.env.EXPO_TOKEN')) fail('Captura tenta ler o valor do EXPO_TOKEN.');

if (failures.length) {
  console.error('Sprint 17 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 17 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Environments, serviços, callbacks e decisão externa estão versionados.');
console.log('- Secrets são verificados apenas por presença e nunca persistidos.');
console.log('- Tehkné Solutions');
