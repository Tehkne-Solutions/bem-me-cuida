import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  '.github/workflows/rc-011-ota-final-validation.yml',
  'release/rc-0.11.0/ota-device-validation.json',
  'release/rc-0.11.0/ota-session.template.json',
  'scripts/lib/rc011-ota-final-validation.mjs',
  'scripts/capture-rc011-ota-device-session.mjs',
  'scripts/apply-rc011-ota-device-session.mjs',
  'scripts/apply-rc011-ota-final-capture.mjs',
  'scripts/generate-rc011-final-decision-package.mjs',
  'scripts/test-rc011-ota-final-validation.mjs',
  'scripts/verify-rc011-ota-final-validation.mjs',
  'docs/SPRINT-26.md',
  'docs/ADR-030-ota-final-e-decisao-rc.md',
  'docs/RC-0.11.0-OTA-FINAL-RUNBOOK.md',
];
const failures = [];
for (const path of requiredFiles) if (!existsSync(path)) failures.push(`Arquivo ausente: ${path}`);
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const workflow = read('.github/workflows/rc-011-ota-final-validation.yml');
const commandCenter = read('.github/workflows/rc-011-command-center.yml');
const packageJson = read('package.json');
for (const marker of ['publish-validation', 'open-publish-pr', 'capture-device-session', 'open-session-pr', 'rollback-validation', 'open-rollback-pr', 'package-final-decision', 'rc-011-homologation']) {
  if (!workflow.includes(marker)) failures.push(`Workflow OTA final sem marcador: ${marker}.`);
}
for (const marker of ['ota-publish', 'ota-publish-pr', 'ota-session', 'ota-session-pr', 'ota-rollback', 'ota-rollback-pr', 'rc-final-review']) {
  if (!commandCenter.includes(marker)) failures.push(`Command Center sem comando: ${marker}.`);
}
for (const marker of ['sprint26:check', 'rc011:ota-final:test', 'rc011:ota-final:structure', 'rc011:final:decision']) {
  if (!packageJson.includes(marker)) failures.push(`package.json sem script: ${marker}.`);
}
if (workflow.includes('gh pr merge') || workflow.includes('gh release create')) failures.push('Sprint 26 não pode mesclar ou publicar release automaticamente.');
if (failures.length) {
  console.error('Sprint 26 reprovado:'); failures.forEach((item) => console.error(`- ${item}`)); process.exit(1);
}
console.log('Sprint 26 estruturalmente aprovado.');
console.log('Tehkné Solutions');
