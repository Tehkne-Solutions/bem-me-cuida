import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

const requiredFiles = [
  'docs/SPRINT-18.md',
  'docs/ADR-022-bootstrap-externo-e-pr-de-evidencias.md',
  'docs/RC-0.11.0-EXTERNAL-BOOTSTRAP-RUNBOOK.md',
  'release/rc-0.11.0/external-bootstrap.json',
  'scripts/generate-rc011-bootstrap-bundle.mjs',
  'scripts/verify-rc011-bootstrap.mjs',
  'scripts/verify-sprint18-readiness.mjs',
  '.github/workflows/rc-011-evidence-pr.yml',
  '.github/ISSUE_TEMPLATE/rc011-external-setup.yml',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 18 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 18 encontrados.`);

const packageJson = readJson('package.json');
for (const script of [
  'sprint18:check',
  'rc011:bootstrap:bundle',
  'rc011:bootstrap:check',
  'rc011:bootstrap:structure',
]) {
  if (!packageJson.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}
if (!packageJson.scripts?.['release:check']?.includes('verify-sprint18-readiness')) {
  fail('release:check não inclui o Sprint 18.');
}

const manifest = readJson('release/rc-0.11.0/external-bootstrap.json');
if (manifest.release !== '0.11.0-rc.1') fail('Manifesto de bootstrap referencia candidata incorreta.');
if (manifest.status !== 'pending') fail('Bootstrap inicial deve permanecer pending até configuração externa.');
if (manifest.generatedBy !== 'Tehkné Solutions') fail('Manifesto sem assinatura Tehkné Solutions.');
if (manifest.privacy?.containsSecrets !== false) fail('Manifesto sem declaração de ausência de secrets.');

const generator = read('scripts/generate-rc011-bootstrap-bundle.mjs');
for (const marker of [
  'gh secret set EXPO_TOKEN --env',
  'gh variable set',
  'bootstrap.sh',
  'bootstrap.ps1',
  'secretValuesIncluded: false',
]) {
  if (!generator.includes(marker)) fail(`Gerador de bootstrap sem controle: ${marker}`);
}
if (generator.includes('--body "$EXPO_TOKEN"') || generator.includes('--body $env:EXPO_TOKEN')) {
  fail('Gerador transporta EXPO_TOKEN por argumento de linha de comando.');
}

const workflow = read('.github/workflows/rc-011-evidence-pr.yml');
for (const marker of [
  'workflow_dispatch',
  'actions: write',
  'contents: write',
  'pull-requests: write',
  'gh run download',
  'rc011:infrastructure:external',
  'gh pr create',
  'gh workflow run ci.yml',
]) {
  if (!workflow.includes(marker)) fail(`Workflow de PR de evidências sem marcador: ${marker}`);
}
if (/service[_-]?role/i.test(workflow)) fail('Workflow de evidências menciona service role.');
if (workflow.includes('EXPO_TOKEN')) fail('Workflow de PR de evidências não deve acessar EXPO_TOKEN.');

const issueTemplate = read('.github/ISSUE_TEMPLATE/rc011-external-setup.yml');
for (const marker of [
  'rc-011-build',
  'rc-011-homologation',
  'EXPO_TOKEN',
  'bemmecuida-rc011://auth/callback',
  'Nenhum valor de secret foi incluído',
]) {
  if (!issueTemplate.includes(marker)) fail(`Formulário operacional sem marcador: ${marker}`);
}

const serializedFiles = requiredFiles.map((path) => read(path)).join('\n');
if (/expo_[A-Za-z0-9_-]{20,}/.test(serializedFiles)) fail('Sprint 18 parece conter token Expo real.');
if (/sb_secret_[A-Za-z0-9_-]+/.test(serializedFiles)) fail('Sprint 18 parece conter secret Supabase real.');

if (failures.length) {
  console.error('Sprint 18 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 18 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Bootstrap, issue operacional e PR automático de evidências estão versionados.');
console.log('- Nenhum secret, build ou evidência externa foi fabricado.');
console.log('- Tehkné Solutions');
