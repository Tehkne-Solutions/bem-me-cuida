import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');

const requiredFiles = [
  '.github/workflows/rc-011-external-audit.yml',
  'scripts/lib/rc011-external-audit.mjs',
  'scripts/generate-rc011-external-audit.mjs',
  'scripts/test-rc011-external-audit.mjs',
  'docs/SPRINT-20.md',
  'docs/ADR-024-auditoria-externa-sem-valores.md',
  'docs/RC-0.11.0-EXTERNAL-AUDIT-RUNBOOK.md',
];
for (const path of requiredFiles) if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);

if (existsSync(join(root, '.github/workflows/rc-011-external-audit.yml'))) {
  const workflow = read('.github/workflows/rc-011-external-audit.yml');
  for (const marker of [
    'workflow_dispatch:',
    'push:',
    'actions: read',
    'deployments: read',
    'issues: write',
    'actions/variables',
    'environments/$environment/variables',
    'environments/$environment/secrets',
    'generate-rc011-external-audit.mjs',
    'gh issue comment',
    'actions/upload-artifact@v4',
  ]) {
    if (!workflow.includes(marker)) fail(`workflow de auditoria sem marcador: ${marker}`);
  }
  if (workflow.includes('secrets.EXPO_TOKEN')) fail('auditoria externa não pode acessar o valor de EXPO_TOKEN.');
  if (/service[_-]?role/i.test(workflow)) fail('workflow de auditoria menciona credencial administrativa do Supabase.');
  ok('Workflow audita somente metadados e publica relatório factual.');
}

if (existsSync(join(root, '.github/workflows/rc-011-command-center.yml'))) {
  const workflow = read('.github/workflows/rc-011-command-center.yml');
  for (const marker of ['workflow_dispatch:', 'inputs.command', 'audit-external', 'rc-011-external-audit.yml', "tracking_issue=27"]) {
    if (!workflow.includes(marker)) fail(`central sem fallback/auditoria: ${marker}`);
  }
  ok('Central possui fallback manual e comando de auditoria externa.');
}

if (existsSync(join(root, 'scripts/lib/rc011-external-audit.mjs'))) {
  const core = read('scripts/lib/rc011-external-audit.mjs');
  for (const marker of ['ready-for-capture', 'api_unavailable_or_unauthorized', 'containsSecretValues: false', 'containsVariableValues: false', 'valuesRead: false']) {
    if (!core.includes(marker)) fail(`núcleo de auditoria sem controle: ${marker}`);
  }
  if (core.includes('.value')) fail('núcleo de auditoria não deve acessar valores retornados pela API.');
  ok('Núcleo reduz respostas a nomes, contagens e flags.');
}

if (existsSync(join(root, 'release/rc-0.11.0/external-bootstrap.json'))) {
  const manifest = JSON.parse(read('release/rc-0.11.0/external-bootstrap.json'));
  if (!Array.isArray(manifest.repositoryVariables) || manifest.repositoryVariables.length < 10) fail('manifesto sem variables públicas do repositório.');
  for (const environment of manifest.environments ?? []) {
    if (!environment.secrets?.includes('EXPO_TOKEN')) fail(`${environment.name} sem nome do secret obrigatório.`);
    if (!environment.reviewersRequired) fail(`${environment.name} não exige revisores.`);
  }
}

if (existsSync(join(root, 'scripts/parse-rc011-issue-command.mjs'))) {
  const parser = read('scripts/parse-rc011-issue-command.mjs');
  if (!parser.includes("'audit-external': { privilege: 'admin', args: [] }")) fail('parser não protege audit-external como admin.');
}

if (existsSync(join(root, 'package.json'))) {
  const packageJson = JSON.parse(read('package.json'));
  for (const script of ['rc011:external-audit:test', 'sprint20:check']) {
    if (!packageJson.scripts?.[script]) fail(`script npm ausente: ${script}`);
  }
  if (!packageJson.scripts?.['release:check']?.includes('verify-sprint20-readiness.mjs')) fail('release:check não inclui Sprint 20.');
}

if (failures.length) {
  console.error('Sprint 20 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 20 aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Auditoria não cria ou altera infraestrutura externa.');
console.log('- Resultado ready-for-capture ainda exige captura protegida e evidências.');
console.log('- Tehkné Solutions');
