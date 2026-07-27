import fs from 'node:fs';

const required = [
  'release/cycle-0.12.0/pr-administrative-package-validation-policy.json',
  'scripts/lib/cycle012-pr-administrative-package-validation.mjs',
  'scripts/test-cycle012-pr-administrative-package-validation.mjs',
  'docs/SPRINT-48.md',
  'docs/ADR-052-validacao-de-pacotes-administrativos-de-pr.md',
  '.github/workflows/sprint48.yml'
];
for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`missing:${path}`);
}
const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
const controls = policy.controls;
if (controls.humanReviewRequired !== true) throw new Error('human-review-required');
for (const key of ['humanReviewAllowed','functionalBranchCreationAllowed','pullRequestOpeningAllowed','patchGenerationAllowed','sourceMutationAllowed','executionAllowed','correctionAuthorized','mergeAllowed','activationAllowed']) {
  if (controls[key] !== false) throw new Error(`unsafe-control:${key}`);
}
if (!policy.validClassifications.includes('forbidden-operational-content')) throw new Error('missing-operational-content-classification');
console.log('Sprint 48 readiness verified.');
