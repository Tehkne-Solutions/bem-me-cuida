import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const manifestPath = process.env.RC011_BOOTSTRAP_PATH ?? 'release/rc-0.11.0/external-bootstrap.json';
const outputDir = process.env.RC011_BOOTSTRAP_OUTPUT_DIR ?? 'artifacts/rc011-bootstrap';
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

if (!['structure', 'bundle'].includes(mode)) fail(`modo inválido: ${mode}`);
if (!existsSync(join(root, manifestPath))) fail(`manifesto ausente: ${manifestPath}`);

let manifest;
if (!failures.length) {
  manifest = readJson(manifestPath);
  if (manifest.schemaVersion !== 1) fail('schemaVersion do bootstrap deve ser 1.');
  if (manifest.release !== '0.11.0-rc.1') fail('release do bootstrap divergente.');
  if (manifest.repository !== 'Tehkne-Solutions/bem-me-cuida') fail('repositório divergente.');
  if (!['pending', 'ready', 'blocked'].includes(manifest.status)) fail('status global inválido.');
  if (manifest.generatedBy !== 'Tehkné Solutions') fail('assinatura Tehkné Solutions ausente.');
  if (manifest.privacy?.containsPersonalData !== false) fail('declaração de dados pessoais ausente.');
  if (manifest.privacy?.containsClinicalData !== false) fail('declaração de dados clínicos ausente.');
  if (manifest.privacy?.containsSecrets !== false) fail('declaração de secrets ausente.');

  const environments = new Map((manifest.environments ?? []).map((item) => [item.name, item]));
  for (const name of ['rc-011-build', 'rc-011-homologation']) {
    const environment = environments.get(name);
    if (!environment) {
      fail(`environment ausente: ${name}`);
      continue;
    }
    if (!environment.secrets?.includes('EXPO_TOKEN')) fail(`${name} sem EXPO_TOKEN declarado.`);
    if (!environment.protectionRequired || !environment.reviewersRequired) {
      fail(`${name} precisa exigir proteção e revisores.`);
    }
    if (!Array.isArray(environment.variables) || environment.variables.length < 10) {
      fail(`${name} possui lista insuficiente de variables.`);
    }
    if (!['pending', 'ready', 'blocked'].includes(environment.status)) fail(`status inválido em ${name}.`);
  }

  const callbacks = manifest.externalServices?.supabase?.callbacks ?? [];
  for (const callback of [
    'bemmecuida-rc011://auth/callback',
    'bemmecuida-rc011://reset-password',
  ]) {
    if (!callbacks.includes(callback)) fail(`callback ausente: ${callback}`);
  }

  const serialized = JSON.stringify(manifest);
  if (/service[_-]?role/i.test(serialized)) fail('manifesto menciona service role.');
  if (/expo_[A-Za-z0-9_-]{20,}/.test(serialized)) fail('manifesto parece conter token Expo.');
  if (/sb_secret_[A-Za-z0-9_-]+/.test(serialized)) fail('manifesto parece conter secret Supabase.');
  ok('Manifesto de bootstrap validado.');
}

const requiredFiles = [
  'scripts/generate-rc011-bootstrap-bundle.mjs',
  'scripts/verify-rc011-bootstrap.mjs',
  '.github/workflows/rc-011-evidence-pr.yml',
  '.github/ISSUE_TEMPLATE/rc011-external-setup.yml',
  'docs/SPRINT-18.md',
  'docs/ADR-022-bootstrap-externo-e-pr-de-evidencias.md',
  'docs/RC-0.11.0-EXTERNAL-BOOTSTRAP-RUNBOOK.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);
}

if (existsSync(join(root, '.github/workflows/rc-011-evidence-pr.yml'))) {
  const workflow = read('.github/workflows/rc-011-evidence-pr.yml');
  for (const marker of [
    'workflow_dispatch',
    'actions: write',
    'contents: write',
    'pull-requests: write',
    'gh run download',
    'rc011:infrastructure:external',
    'gh pr create',
  ]) {
    if (!workflow.includes(marker)) fail(`workflow de evidências sem marcador: ${marker}`);
  }
  if (/service[_-]?role/i.test(workflow)) fail('workflow de evidências menciona service role.');
}

if (mode === 'bundle') {
  for (const name of ['bootstrap.sh', 'bootstrap.ps1', 'CHECKLIST.md', 'bundle.json']) {
    const path = join(outputDir, name);
    if (!existsSync(join(root, path))) fail(`arquivo do pacote ausente: ${path}`);
  }

  if (!failures.length) {
    const shell = read(join(outputDir, 'bootstrap.sh'));
    const powershell = read(join(outputDir, 'bootstrap.ps1'));
    const checklist = read(join(outputDir, 'CHECKLIST.md'));
    const bundle = readJson(join(outputDir, 'bundle.json'));

    for (const text of [shell, powershell, checklist]) {
      if (/service[_-]?role/i.test(text)) fail('pacote menciona service role.');
      if (/expo_[A-Za-z0-9_-]{20,}/.test(text)) fail('pacote parece conter token Expo.');
      if (/sb_secret_[A-Za-z0-9_-]+/.test(text)) fail('pacote parece conter secret Supabase.');
    }
    if (shell.includes('--body "$EXPO_TOKEN"') || powershell.includes('--body $env:EXPO_TOKEN')) {
      fail('pacote não deve transportar EXPO_TOKEN por argumento de linha de comando.');
    }
    if (!shell.includes('gh secret set EXPO_TOKEN --env rc-011-build')) fail('bootstrap shell não cadastra secret de build por entrada segura.');
    if (!powershell.includes('gh secret set EXPO_TOKEN --env rc-011-homologation')) fail('bootstrap PowerShell não cadastra secret de homologação por entrada segura.');
    if (bundle.secretValuesIncluded !== false) fail('bundle não declara ausência de valores secretos.');
    if (bundle.generatedBy !== 'Tehkné Solutions') fail('bundle sem assinatura Tehkné Solutions.');
    ok('Pacote gerado sem valores de secrets.');
  }
}

if (failures.length) {
  console.error(`Bootstrap RC 0.11 reprovado (${mode}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Bootstrap RC 0.11 aprovado (${mode}):`);
for (const notice of notices) console.log(`- ${notice}`);
console.log('- A execução externa continua dependente de operador autorizado.');
console.log('- Tehkné Solutions');
