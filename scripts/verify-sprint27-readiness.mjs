import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  '.github/workflows/rc-011-production-activation.yml',
  'release/rc-0.11.0/final-attestations.json',
  'release/rc-0.11.0/production-environment.json',
  'release/rc-0.11.0/production-artifacts.json',
  'release/rc-0.11.0/store-submission-readiness.json',
  'release/rc-0.11.0/production-rollout.json',
  'release/rc-0.11.0/release-publication.json',
  'scripts/lib/rc011-production-rollout.mjs',
  'scripts/capture-rc011-final-attestation.mjs',
  'scripts/apply-rc011-final-attestation.mjs',
  'scripts/collect-production-build-metadata.mjs',
  'scripts/apply-production-build-capture.mjs',
  'scripts/capture-rc011-rollout-observation.mjs',
  'scripts/apply-rc011-rollout-observation.mjs',
  'scripts/generate-rc011-production-activation-package.mjs',
  'scripts/test-rc011-production-rollout.mjs',
  'scripts/verify-rc011-production-rollout.mjs',
  'docs/SPRINT-27.md',
  'docs/ADR-031-ativacao-producao-e-rollout-gradual.md',
  'docs/RC-0.11.0-PRODUCTION-ACTIVATION-RUNBOOK.md',
];
const failures = [];
for (const path of requiredFiles) if (!existsSync(path)) failures.push(`Arquivo ausente: ${path}`);
const text = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const workflow = text('.github/workflows/rc-011-production-activation.yml');
const commandCenter = text('.github/workflows/rc-011-command-center.yml');
const packageJson = text('package.json');
for (const marker of ['capture-attestation', 'create-draft-release', 'build-production-android', 'build-production-ios', 'capture-rollout-observation', 'production-release']) {
  if (!workflow.includes(marker)) failures.push(`Workflow de produção sem marcador: ${marker}`);
}
for (const marker of ['production-package', 'final-attestation', 'production-build-android', 'production-build-ios', 'rollout-observation']) {
  if (!commandCenter.includes(marker)) failures.push(`Command Center sem comando: ${marker}`);
}
for (const marker of ['sprint27:check', 'rc011:production:test', 'rc011:production:structure', 'rc011:production:package']) {
  if (!packageJson.includes(marker)) failures.push(`package.json sem script: ${marker}`);
}
if (workflow.includes('gh release create') && !workflow.includes('--draft')) failures.push('Workflow não pode criar release publicada diretamente.');
if (!workflow.includes('Nenhuma release, submissão ou etapa de rollout foi aprovada automaticamente')) failures.push('PR de evidência sem declaração de não promoção.');
if (failures.length) {
  console.error('Sprint 27 reprovado:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('Sprint 27 estruturalmente aprovado.');
console.log('Tehkné Solutions');
