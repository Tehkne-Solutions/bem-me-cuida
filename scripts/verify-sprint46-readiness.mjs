import fs from 'node:fs';

const requiredFiles = [
  'release/cycle-0.12.0/pr-preparation-authorization-validation-policy.json',
  'scripts/lib/cycle012-pr-preparation-authorization-validation.mjs',
  'scripts/test-cycle012-pr-preparation-authorization-validation.mjs',
  'docs/SPRINT-46.md',
  'docs/ADR-050-validacao-das-autorizacoes-de-preparacao-de-pr.md',
  '.github/workflows/sprint46.yml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Sprint 46 missing required file: ${file}`);
}

const policy = JSON.parse(fs.readFileSync(requiredFiles[0], 'utf8'));
const controls = policy.controls ?? {};
const closed = [
  'pullRequestPreparationAllowed',
  'patchGenerationAllowed',
  'sourceMutationAllowed',
  'executionAllowed',
  'correctionAuthorized',
  'mergeAllowed',
  'activationAllowed'
];
for (const key of closed) {
  if (controls[key] !== false) throw new Error(`Sprint 46 must keep ${key}=false`);
}
if (controls.humanReviewRequired !== true) throw new Error('Sprint 46 requires human review.');
if (policy.requiredPlanClassification !== 'current-and-compatible') {
  throw new Error('Sprint 46 only accepts current-and-compatible plans.');
}

console.log('Sprint 46 readiness verified in fail-closed mode.');
