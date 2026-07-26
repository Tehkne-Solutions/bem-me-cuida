import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');

const requiredFiles = [
  '.github/workflows/rc-011-admin-bootstrap.yml',
  'release/rc-0.11.0/admin-bootstrap-config.example.json',
  'scripts/lib/rc011-admin-bootstrap.mjs',
  'scripts/execute-rc011-admin-bootstrap.mjs',
  'scripts/test-rc011-admin-bootstrap.mjs',
  'docs/SPRINT-21.md',
  'docs/ADR-025-bootstrap-administrativo-idempotente.md',
  'docs/RC-0.11.0-ADMIN-BOOTSTRAP-RUNBOOK.md',
];
for (const path of requiredFiles) if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);

if (existsSync(join(root, '.github/workflows/rc-011-admin-bootstrap.yml'))) {
  const workflow = read('.github/workflows/rc-011-admin-bootstrap.yml');
  for (const marker of [
    'workflow_dispatch:',
    'RC011_ADMIN_TOKEN: ${{ secrets.RC011_ADMIN_TOKEN }}',
    'RC011_EXPO_TOKEN: ${{ secrets.RC011_EXPO_TOKEN }}',
    'Require repository administrator',
    'Generate bootstrap plan',
    'Apply administrative bootstrap',
    'Dispatch audit and protected capture',
    'rc-011-external-audit.yml',
    'rc-011-infrastructure-readiness.yml',
    'tracking_issue',
  ]) {
    if (!workflow.includes(marker)) fail(`workflow administrativo sem marcador: ${marker}`);
  }
  if (workflow.includes('echo "$RC011_ADMIN_TOKEN"') || workflow.includes('echo "$RC011_EXPO_TOKEN"')) {
    fail('workflow não pode imprimir secrets temporários.');
  }
  ok('Workflow separa plano, apply, relatório e captura protegida.');
}

if (existsSync(join(root, 'scripts/lib/rc011-admin-bootstrap.mjs'))) {
  const core = read('scripts/lib/rc011-admin-bootstrap.mjs');
  for (const marker of [
    'prevent_self_review',
    'ready-to-apply',
    'containsSecretValues: false',
    'containsVariableValues: false',
    'O revisor obrigatório deve ser diferente',
    'authCallbacksConfigured',
  ]) {
    if (!core.includes(marker)) fail(`política do bootstrap sem controle: ${marker}`);
  }
  ok('Política exige callbacks, gates e segregação entre executor e revisor.');
}

if (existsSync(join(root, 'scripts/execute-rc011-admin-bootstrap.mjs'))) {
  const executor = read('scripts/execute-rc011-admin-bootstrap.mjs');
  for (const marker of [
    "spawnSync('gh'",
    "['secret', 'set', 'EXPO_TOKEN'",
    "['variable', 'set'",
    "prevent_self_review: true",
    "custom_branch_policies: true",
    "JSON.stringify({ name: 'main' })",
    'RC011_ADMIN_TOKEN ausente',
    'RC011_EXPO_TOKEN ausente',
  ]) {
    if (!executor.includes(marker)) fail(`executor administrativo sem controle: ${marker}`);
  }
  if (executor.includes('shell: true')) fail('executor não pode habilitar shell para comandos administrativos.');
  if (executor.includes('console.log(rawConfig)') || executor.includes('console.log(expoToken)') || executor.includes('console.log(adminToken)')) {
    fail('executor não pode registrar valores de configuração ou tokens.');
  }
  if (executor.includes('result.stderr') || executor.includes('result.stdout')) {
    fail('erros administrativos não podem incluir stdout ou stderr brutos.');
  }
  ok('Executor usa argumentos separados, falha fechada e relatório sanitizado.');
}

if (existsSync(join(root, 'release/rc-0.11.0/admin-bootstrap-config.example.json'))) {
  const example = JSON.parse(read('release/rc-0.11.0/admin-bootstrap-config.example.json'));
  if (Object.keys(example).some((key) => /token|secret|password/i.test(key))) fail('exemplo público não pode conter campos de secret.');
  if (example.authCallbacksConfigured !== true) fail('exemplo deve explicitar confirmação dos callbacks.');
}

if (existsSync(join(root, 'package.json'))) {
  const packageJson = JSON.parse(read('package.json'));
  for (const script of ['rc011:admin-bootstrap:test', 'sprint21:check']) {
    if (!packageJson.scripts?.[script]) fail(`script npm ausente: ${script}`);
  }
  if (!packageJson.scripts?.['release:check']?.includes('verify-sprint21-readiness.mjs')) {
    fail('release:check não inclui Sprint 21.');
  }
}

if (failures.length) {
  console.error('Sprint 21 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 21 aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- O bootstrap ainda exige dois secrets cadastrados externamente.');
console.log('- Apply não aprova gates, não promove release e não inicia build.');
console.log('- Tehkné Solutions');
