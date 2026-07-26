import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const manifestPath = process.env.RC011_BOOTSTRAP_PATH ?? 'release/rc-0.11.0/external-bootstrap.json';
const outputDir = process.env.RC011_BOOTSTRAP_OUTPUT_DIR ?? 'artifacts/rc011-bootstrap';
const manifest = JSON.parse(readFileSync(join(root, manifestPath), 'utf8'));

const fail = (message) => {
  console.error(`Bootstrap RC 0.11 inválido: ${message}`);
  process.exit(1);
};

if (manifest.release !== '0.11.0-rc.1') fail('release divergente.');
if (manifest.repository !== 'Tehkne-Solutions/bem-me-cuida') fail('repositório divergente.');
if (!Array.isArray(manifest.repositoryVariables) || manifest.repositoryVariables.length === 0) {
  fail('repositoryVariables são obrigatórias para os jobs públicos de validação.');
}
if (!Array.isArray(manifest.environments) || manifest.environments.length !== 2) {
  fail('dois environments são obrigatórios.');
}
if (manifest.privacy?.containsSecrets !== false) fail('manifesto não declara ausência de secrets.');
if (manifest.generatedBy !== 'Tehkné Solutions') fail('assinatura ausente.');

const requiredNames = new Set(['rc-011-build', 'rc-011-homologation']);
for (const environment of manifest.environments) {
  if (!requiredNames.has(environment.name)) fail(`environment inesperado: ${environment.name}`);
  if (!environment.secrets?.includes('EXPO_TOKEN')) fail(`${environment.name} sem EXPO_TOKEN.`);
  if (!Array.isArray(environment.variables) || environment.variables.length === 0) {
    fail(`${environment.name} sem variables.`);
  }
}

for (const requiredVariable of [
  'EAS_PROJECT_ID',
  'RC011_SUPABASE_URL',
  'RC011_SUPABASE_PUBLISHABLE_KEY',
  'RC011_CYCLE_STATUS',
  'RC011_MILESTONE_DONE',
  'RC011_BLOCKER_COUNT',
  'RC011_FREEZE_READY',
  'RC011_BACKLOG_BLOCKED',
  'RC011_SCOPE_PENDING',
  'RC011_EXPERIMENTS_RUNNING',
  'RC011_REQUIRED_GATES',
  'RC011_PASSED_GATES',
  'RC011_CYCLE_EVIDENCE_URL',
]) {
  if (!manifest.repositoryVariables.includes(requiredVariable)) fail(`repositoryVariable ausente: ${requiredVariable}`);
}

const quoteShell = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
const shell = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  '# Pacote gerado sem valores de secrets. Exige gh autenticado com administração do repositório.',
  `REPOSITORY=${quoteShell(manifest.repository)}`,
  'gh auth status',
  '',
  '# Variables públicas no escopo do repositório para jobs de validação sem environment.',
];

const powershell = [
  '#requires -Version 7.0',
  "$ErrorActionPreference = 'Stop'",
  '',
  '# Pacote gerado sem valores de secrets. Exige gh autenticado com administração do repositório.',
  `$Repository = '${manifest.repository}'`,
  'gh auth status',
  '',
  '# Variables públicas no escopo do repositório para jobs de validação sem environment.',
];

for (const variable of manifest.repositoryVariables) {
  shell.push(`: "\${${variable}:?Defina ${variable} no ambiente local antes de executar}"`);
  shell.push(`gh variable set ${variable} --body "\${${variable}}"`);
  powershell.push(`if (-not $env:${variable}) { throw 'Defina ${variable} antes de executar.' }`);
  powershell.push(`gh variable set ${variable} --body $env:${variable}`);
}
shell.push('');
powershell.push('');

for (const environment of manifest.environments) {
  shell.push(`# Environment: ${environment.name}`);
  shell.push(`gh api --method PUT "repos/$REPOSITORY/environments/${environment.name}" >/dev/null`);
  shell.push(`echo 'Cadastre revisores e regras de proteção no environment ${environment.name}.'`);
  shell.push(`echo 'Informe EXPO_TOKEN sem gravá-lo em arquivo:'`);
  shell.push(`gh secret set EXPO_TOKEN --env ${environment.name}`);
  for (const variable of environment.variables) {
    shell.push(`: "\${${variable}:?Defina ${variable} no ambiente local antes de executar}"`);
    shell.push(`gh variable set ${variable} --env ${environment.name} --body "\${${variable}}"`);
  }
  shell.push('');

  powershell.push(`# Environment: ${environment.name}`);
  powershell.push(`gh api --method PUT "repos/$Repository/environments/${environment.name}" | Out-Null`);
  powershell.push(`Write-Host 'Cadastre revisores e regras de proteção no environment ${environment.name}.'`);
  powershell.push(`Write-Host 'Informe EXPO_TOKEN sem gravá-lo em arquivo:'`);
  powershell.push(`gh secret set EXPO_TOKEN --env ${environment.name}`);
  for (const variable of environment.variables) {
    powershell.push(`if (-not $env:${variable}) { throw 'Defina ${variable} antes de executar.' }`);
    powershell.push(`gh variable set ${variable} --env ${environment.name} --body $env:${variable}`);
  }
  powershell.push('');
}

shell.push("echo 'Configure manualmente no Supabase Auth os callbacks:'");
for (const callback of manifest.externalServices.supabase.callbacks) shell.push(`echo '  - ${callback}'`);
shell.push("echo 'Depois execute o workflow RC 0.11 Infrastructure Readiness com action=capture.'");
shell.push("echo 'Tehkné Solutions'");

powershell.push("Write-Host 'Configure manualmente no Supabase Auth os callbacks:'");
for (const callback of manifest.externalServices.supabase.callbacks) powershell.push(`Write-Host '  - ${callback}'`);
powershell.push("Write-Host 'Depois execute o workflow RC 0.11 Infrastructure Readiness com action=capture.'");
powershell.push("Write-Host 'Tehkné Solutions'");

const checklist = [
  '# Bootstrap externo — BemMeCuida 0.11.0-rc.1',
  '',
  'Este pacote não contém tokens, senhas, chaves administrativas ou dados pessoais.',
  '',
  '## Ordem de execução',
  '',
  '1. Autenticar o GitHub CLI com permissão administrativa no repositório.',
  '2. Definir localmente as variables públicas listadas no manifesto.',
  '3. Executar `bootstrap.sh` ou `bootstrap.ps1`.',
  '4. Configurar revisores obrigatórios nos dois environments.',
  '5. Configurar os callbacks exatos no Supabase Auth.',
  '6. Executar `RC 0.11 Infrastructure Readiness` com `action=capture`.',
  '7. Revisar o artefato consolidado e abrir o PR de evidências.',
  '8. Somente após o registro oficial ficar `ready`, solicitar os builds.',
  '',
  '## Variables do repositório',
  '',
  'Estas variables públicas alimentam os jobs de validação que executam antes de entrar nos environments protegidos:',
  '',
  ...manifest.repositoryVariables.map((variable) => `- \`${variable}\``),
  '',
  '## Environments',
  '',
  ...manifest.environments.flatMap((environment) => [
    `### ${environment.name}`,
    '',
    `- Finalidade: ${environment.purpose}`,
    '- Secret obrigatório: `EXPO_TOKEN`',
    `- Variables: ${environment.variables.map((value) => `\`${value}\``).join(', ')}`,
    '- Proteção e revisão humana obrigatórias.',
    '',
  ]),
  '## Callbacks Supabase',
  '',
  ...manifest.externalServices.supabase.callbacks.map((callback) => `- \`${callback}\``),
  '',
  '## Segurança',
  '',
  '- Não cole `EXPO_TOKEN` em issues, PRs, logs ou arquivos.',
  '- Não use chaves administrativas privilegiadas no aplicativo ou nos workflows.',
  '- Evidências devem ser HTTPS e não podem conter dados pessoais ou clínicos.',
  '',
  '**Tehkné Solutions**',
  '',
].join('\n');

const bundle = {
  schemaVersion: 1,
  release: manifest.release,
  repository: manifest.repository,
  generatedAt: new Date().toISOString(),
  files: ['bootstrap.sh', 'bootstrap.ps1', 'CHECKLIST.md'],
  repositoryVariableCount: manifest.repositoryVariables.length,
  secretValuesIncluded: false,
  recommendation: 'operator_action_required',
  generatedBy: 'Tehkné Solutions',
};

const absoluteOutput = join(root, outputDir);
mkdirSync(absoluteOutput, { recursive: true });
const write = (name, content) => {
  const path = join(absoluteOutput, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
};
write('bootstrap.sh', `${shell.join('\n')}\n`);
write('bootstrap.ps1', `${powershell.join('\n')}\n`);
write('CHECKLIST.md', checklist);
write('bundle.json', `${JSON.stringify(bundle, null, 2)}\n`);

console.log(`Pacote de bootstrap gerado em ${outputDir}.`);
console.log(`- ${manifest.repositoryVariables.length} variables públicas também serão cadastradas no repositório.`);
console.log('- Nenhum valor de secret foi incorporado.');
console.log('- A execução exige revisão humana e gh autenticado.');
console.log('- Tehkné Solutions');
