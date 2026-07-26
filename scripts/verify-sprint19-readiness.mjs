import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');

const requiredFiles = [
  '.github/workflows/rc-011-command-center.yml',
  'scripts/parse-rc011-issue-command.mjs',
  'scripts/test-rc011-issue-command.mjs',
  'scripts/generate-rc011-issue-status.mjs',
  'docs/SPRINT-19.md',
  'docs/ADR-023-issue-como-console-operacional.md',
  'docs/RC-0.11.0-COMMAND-CENTER.md',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);
}

if (existsSync(join(root, '.github/workflows/rc-011-command-center.yml'))) {
  const workflow = read('.github/workflows/rc-011-command-center.yml');
  for (const marker of [
    'issue_comment:',
    'github.event.issue.number == 24',
    "startsWith(github.event.comment.body, '/rc011')",
    'actions: write',
    'contents: read',
    'issues: write',
    'collaborators/$RC011_ACTOR/permission',
    'rc-011-infrastructure-readiness.yml',
    'rc-011-evidence-pr.yml',
    'rc-011-build.yml',
    'rc-011-homologation.yml',
    'gh workflow run',
    'generate-rc011-issue-status.mjs',
  ]) {
    if (!workflow.includes(marker)) fail(`workflow da central sem marcador: ${marker}`);
  }
  if (workflow.includes('secrets.EXPO_TOKEN')) fail('central de comandos não pode acessar EXPO_TOKEN diretamente.');
  if (workflow.includes('service_role')) fail('central de comandos não pode mencionar credencial administrativa do Supabase.');
  if (!workflow.includes("[[ \"$REPOSITORY_PERMISSION\" == \"admin\" ]]")) fail('ações administrativas não estão protegidas por papel admin.');
  ok('Workflow de comandos possui autorização e dispatch controlado.');
}

if (existsSync(join(root, 'scripts/parse-rc011-issue-command.mjs'))) {
  const parser = read('scripts/parse-rc011-issue-command.mjs');
  for (const command of [
    'help',
    'status',
    'validate-infrastructure',
    'capture-infrastructure',
    'evidence-inspect',
    'evidence-pr',
    'validate-build',
    'build-android',
    'collect-android',
    'package-decision',
  ]) {
    if (!parser.includes(command)) fail(`parser sem comando: ${command}`);
  }
  for (const marker of ['SHA_PATTERN', 'HTTPS_PATTERN', 'SENSITIVE_PATTERN', 'EAS_BUILD_ID_PATTERN', 'Use exatamente uma linha']) {
    if (!parser.includes(marker)) fail(`parser sem controle: ${marker}`);
  }
  if (/child_process|execSync|spawnSync|\beval\s*\(/.test(parser)) fail('parser não pode executar comandos externos ou eval.');
  ok('Parser restringe argumentos, URLs e material sensível.');
}

if (existsSync(join(root, 'scripts/generate-rc011-issue-status.mjs'))) {
  const status = read('scripts/generate-rc011-issue-status.mjs');
  for (const path of [
    'infrastructure-readiness.json',
    'builds.json',
    'ota-validation.json',
    'device-matrix.json',
  ]) {
    if (!status.includes(path)) fail(`status factual não lê ${path}`);
  }
  if (!status.includes("recommendation = blockers.length === 0 ? 'ready-for-promotion-review' : 'hold'")) {
    fail('status não calcula recomendação determinística.');
  }
  if (!status.includes('Não consulta ou revela valores de secrets')) fail('status sem declaração de privacidade operacional.');
  ok('Status usa somente registros versionados da RC.');
}

if (existsSync(join(root, 'package.json'))) {
  const packageJson = JSON.parse(read('package.json'));
  for (const script of ['rc011:command:test', 'rc011:command:status', 'sprint19:check']) {
    if (!packageJson.scripts?.[script]) fail(`script npm ausente: ${script}`);
  }
  if (!packageJson.scripts?.['release:check']?.includes('verify-sprint19-readiness.mjs')) {
    fail('release:check não inclui Sprint 19.');
  }
}

if (failures.length) {
  console.error('Sprint 19 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 19 aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Issue #24 permanece como trilha operacional da RC 0.11.');
console.log('- A central não cria secrets nem aprova gates automaticamente.');
console.log('- Tehkné Solutions');
