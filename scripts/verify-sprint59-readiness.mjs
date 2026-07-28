import fs from 'node:fs';

const requiredFiles = [
  'governance/cycle-0.12/post-review-follow-up-package-policy.json',
  'scripts/generate-cycle012-post-review-follow-up-package.mjs',
  'scripts/test-cycle012-post-review-follow-up-package.mjs',
  'docs/cycle-0.12-post-review-follow-up-package.md',
  'docs/adr/063-cycle012-post-review-follow-up-package.md',
  '.github/workflows/sprint59.yml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing Sprint 59 file: ${file}`);
}
const policy = JSON.parse(fs.readFileSync(requiredFiles[0], 'utf8'));
if (policy.controls.followUpPackageGenerationAllowed !== true) throw new Error('follow-up package generation must be allowed');
for (const key of ['reviewSessionExecutionAllowed','functionalBranchCreationAllowed','pullRequestOpeningAllowed','patchGenerationAllowed','sourceMutationAllowed','executionAllowed','correctionAuthorized','mergeAllowed','activationAllowed']) {
  if (policy.controls[key] !== false) throw new Error(`${key} must remain false`);
}
if (policy.controls.humanReviewRequired !== true) throw new Error('human review must remain required');
console.log('Sprint 59 readiness verified.');
