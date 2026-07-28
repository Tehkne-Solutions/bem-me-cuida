import { access, readFile } from 'node:fs/promises';

const required = [
  'governance/cycle-0.12/administrative-closure-package-validation-policy.json',
  'scripts/validate-cycle012-administrative-closure-package.mjs',
  'scripts/test-cycle012-administrative-closure-package-validation.mjs',
  'docs/governance/sprint-64-administrative-closure-package-validation.md',
  'docs/adr/068-cycle-012-administrative-closure-package-validation.md',
  '.github/workflows/sprint64.yml',
];

for (const path of required) await access(path);

const policy = JSON.parse(await readFile(required[0], 'utf8'));
if (policy.classifications.length !== 14) throw new Error('Sprint 64 must define 14 classifications.');
if (policy.requiredSections.length !== 9) throw new Error('Sprint 64 must require 9 package sections.');
if (policy.controls.validationAllowed !== true) throw new Error('Validation must be allowed.');
for (const key of [
  'functionalBranchCreationAllowed',
  'pullRequestOpeningAllowed',
  'patchGenerationAllowed',
  'sourceMutationAllowed',
  'executionAllowed',
  'correctionAuthorized',
  'mergeAllowed',
  'activationAllowed',
]) {
  if (policy.controls[key] !== false) throw new Error(`${key} must remain false.`);
}
if (policy.controls.humanReviewRequired !== true) throw new Error('Human review must remain required.');

console.log('Sprint 64 readiness verified.');
