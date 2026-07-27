import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));
const required = [
  'release/rc-0.11.0/post-release-health.json',
  'release/rc-0.11.0/post-release-incidents.json',
  'release/rc-0.11.0/cycle-closure.json',
  'release/rc-0.11.0/next-cycle-backlog.json',
  'scripts/lib/rc011-post-release-observability.mjs',
  'scripts/capture-rc011-post-release-health.mjs',
  'scripts/apply-rc011-post-release-health.mjs',
  'scripts/capture-rc011-post-release-incident.mjs',
  'scripts/apply-rc011-post-release-incident.mjs',
  'scripts/generate-rc011-post-release-report.mjs',
  'scripts/propose-rc011-cycle-closure.mjs',
  '.github/workflows/rc-011-post-release-operations.yml',
  'docs/POST-RELEASE-0.11-RUNBOOK.md',
];
for (const path of required) if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);
if (existsSync(join(root, 'release/rc-0.11.0/post-release-health.json'))) {
  const health = readJson('release/rc-0.11.0/post-release-health.json');
  if (health.status !== 'blocked-awaiting-release') fail('saúde inicial não está bloqueada aguardando publicação.');
  for (const key of ['24h', '72h', '7d']) if (health.checkpoints?.[key]?.status !== 'pending') fail(`checkpoint ${key} não inicia pendente.`);
  if (health.privacy?.containsPersonalData !== false || health.privacy?.containsClinicalData !== false) fail('registro de saúde sem declaração de privacidade.');
}
if (existsSync(join(root, 'release/rc-0.11.0/post-release-incidents.json'))) {
  const incidents = readJson('release/rc-0.11.0/post-release-incidents.json');
  if (!Array.isArray(incidents.incidents) || incidents.incidents.length !== 0) fail('registro inicial de incidentes deve estar vazio.');
  if (incidents.privacy?.technicalClassificationOnly !== true) fail('incidentes não estão limitados a classificação técnica.');
}
if (existsSync(join(root, 'release/rc-0.11.0/cycle-closure.json'))) {
  const closure = readJson('release/rc-0.11.0/cycle-closure.json');
  if (closure.status !== 'blocked') fail('encerramento inicial não está bloqueado.');
  if (closure.controls?.doesNotCloseAutomatically !== true) fail('encerramento não declara proibição de fechamento automático.');
}
if (existsSync(join(root, '.github/workflows/rc-011-post-release-operations.yml'))) {
  const workflow = read('.github/workflows/rc-011-post-release-operations.yml');
  for (const marker of ['production-observability', 'capture-health', 'capture-incident', 'package-report', 'propose-cycle-closure', 'gh run download']) {
    if (!workflow.includes(marker)) fail(`workflow pós-release sem marcador: ${marker}`);
  }
  if (workflow.includes('contents: delete')) fail('workflow não pode possuir permissão de exclusão ampla.');
}
if (mode === 'report' && existsSync(join(root, 'artifacts/bemmecuida-0.11.0-post-release-current.json'))) {
  const report = readJson('artifacts/bemmecuida-0.11.0-post-release-current.json');
  if (report.recommendation !== 'await-release') fail('relatório inicial deve aguardar publicação real.');
  if (report.controls?.doesNotPauseRollbackOrCloseAutomatically !== true) fail('relatório pode executar ação automática indevida.');
}
if (failures.length) {
  console.error('Observabilidade pós-release reprovada:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Observabilidade pós-release aprovada no modo ${mode}.`);
console.log('Tehkné Solutions');
