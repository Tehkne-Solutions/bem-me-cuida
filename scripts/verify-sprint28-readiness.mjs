import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/rc-011-post-release-operations.yml',
  'scripts/lib/rc011-post-release-observability.mjs',
  'scripts/test-rc011-post-release-observability.mjs',
  'scripts/verify-rc011-post-release-observability.mjs',
  'docs/SPRINT-28.md',
  'docs/ADR-032-observabilidade-pos-release-e-encerramento.md',
  'docs/POST-RELEASE-0.11-RUNBOOK.md',
  'release/rc-0.11.0/post-release-health.json',
  'release/rc-0.11.0/post-release-incidents.json',
  'release/rc-0.11.0/cycle-closure.json',
  'release/rc-0.11.0/next-cycle-backlog.json',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const script of ['rc011:post-release:test', 'rc011:post-release:structure', 'rc011:post-release:report', 'sprint28:check']) {
  if (!packageJson.scripts?.[script]) failures.push(`script npm ausente: ${script}`);
}
if (!packageJson.scripts?.['release:check']?.includes('verify-sprint28-readiness.mjs')) failures.push('release:check não inclui Sprint 28.');
const workflow = existsSync(join(root, '.github/workflows/rc-011-post-release-operations.yml')) ? readFileSync(join(root, '.github/workflows/rc-011-post-release-operations.yml'), 'utf8') : '';
for (const marker of ['capture-health', 'capture-incident', 'open-evidence-pr', 'package-report', 'propose-cycle-closure', 'production-observability']) {
  if (!workflow.includes(marker)) failures.push(`workflow sem marcador: ${marker}`);
}
const health = JSON.parse(readFileSync(join(root, 'release/rc-0.11.0/post-release-health.json'), 'utf8'));
if (health.privacy?.containsPersonalData !== false || health.privacy?.containsClinicalData !== false || health.privacy?.containsJournalContent !== false) {
  failures.push('registro de saúde não declara ausência de dados pessoais, clínicos e do Diário.');
}
const allowedThresholds = new Set(['minimumCrashFreePct', 'minimumSyncSuccessPct', 'minimumAuthSuccessPct', 'minimumNotificationSuccessPct', 'minimumSampleSize', 'criticalIncidentsAllowed', 'openSev2Allowed', 'blockingSupportReportsAllowed', 'maximumSnapshotAgeHours']);
for (const key of Object.keys(health.thresholds ?? {})) if (!allowedThresholds.has(key)) failures.push(`threshold não permitido: ${key}`);
if (failures.length) {
  console.error('Sprint 28 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 28 aprovado: observabilidade agregada, incidentes sanitizados e encerramento fail-closed.');
console.log('Tehkné Solutions');
