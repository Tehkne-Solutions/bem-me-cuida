import fs from 'node:fs';

const requiredFiles = [
  'governance/cycle-0.12/post-review-follow-up-package-validation-policy.json',
  'scripts/validate-cycle012-post-review-follow-up-package.mjs',
  'scripts/test-cycle012-post-review-follow-up-package-validation.mjs',
  'docs/governance/sprint-60-post-review-follow-up-package-validation.md',
  'docs/adr/064-post-review-follow-up-package-validation.md',
  '.github/workflows/sprint60-post-review-follow-up-package-validation.yml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing Sprint 60 artifact: ${file}`);
}

const policy = JSON.parse(fs.readFileSync(requiredFiles[0], 'utf8'));
if (policy.controls.functionalBranchCreationAllowed !== false) throw new Error('Functional branches must remain blocked.');
if (policy.controls.patchGenerationAllowed !== false) throw new Error('Patch generation must remain blocked.');
if (policy.controls.humanReviewRequired !== true) throw new Error('Human review must remain required.');

console.log('Sprint 60 readiness verified.');
