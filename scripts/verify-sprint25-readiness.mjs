import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  '.github/workflows/rc-011-ios-artifact.yml',
  '.github/workflows/rc-011-ios-physical-validation.yml',
  'release/rc-0.11.0/android-homologation-plan.json',
  'release/rc-0.11.0/ios-homologation-plan.json',
  'release/rc-0.11.0/ios-session.template.json',
  'scripts/lib/rc011-ios-artifact.mjs',
  'scripts/lib/rc011-ios-multiplatform-validation.mjs',
  'scripts/select-eas-ios-build.mjs',
  'scripts/generate-rc011-ios-homologation-plan.mjs',
  'scripts/capture-rc011-ios-session.mjs',
  'scripts/apply-rc011-ios-session.mjs',
  'scripts/generate-rc011-multiplatform-review-package.mjs',
  'scripts/test-rc011-ios-multiplatform-validation.mjs',
  'scripts/verify-rc011-ios-artifact.mjs',
  'scripts/verify-rc011-ios-multiplatform-validation.mjs',
  'docs/SPRINT-25.md',
  'docs/ADR-029-homologacao-multiplataforma.md',
  'docs/RC-0.11.0-IOS-MULTIPLATFORM-RUNBOOK.md',
];
const failures = [];
for (const path of requiredFiles) if (!existsSync(path)) failures.push(`Arquivo ausente: ${path}`);
const text = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const artifactWorkflow = text('.github/workflows/rc-011-ios-artifact.yml');
const physicalWorkflow = text('.github/workflows/rc-011-ios-physical-validation.yml');
const commandCenter = text('.github/workflows/rc-011-command-center.yml');
const packageJson = text('package.json');
for (const marker of ['discover-ios', 'capture-ios', 'open-artifact-pr', '--platform ios', 'rc011:ios-artifact:structure']) {
  if (!artifactWorkflow.includes(marker)) failures.push(`Workflow de artefato iOS sem marcador: ${marker}`);
}
for (const marker of ['capture-session', 'open-session-pr', 'package-multiplatform-review', 'rc-011-homologation', 'Nenhum gate foi aprovado automaticamente']) {
  if (!physicalWorkflow.includes(marker)) failures.push(`Workflow físico iOS sem marcador: ${marker}`);
}
for (const marker of ['build-ios', 'discover-ios', 'capture-ios-latest', 'ios-artifact-pr', 'ios-session', 'ios-session-pr', 'multiplatform-review']) {
  if (!commandCenter.includes(marker)) failures.push(`Command Center sem comando: ${marker}`);
}
for (const marker of ['sprint25:check', 'rc011:ios-artifact:test', 'rc011:ios-physical:test', 'rc011:multiplatform:review']) {
  if (!packageJson.includes(marker)) failures.push(`package.json sem script: ${marker}`);
}
if (failures.length) {
  console.error('Sprint 25 reprovado:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('Sprint 25 estruturalmente aprovado.');
console.log('Tehkné Solutions');
