import fs from 'node:fs';

const requiredFiles = [
  'governance/cycle-0.12/post-review-follow-up-record-validation-policy.json',
  'scripts/validate-cycle012-post-review-follow-up-record.mjs',
  'scripts/test-cycle012-post-review-follow-up-record-validation.mjs',
  'docs/governance/cycle-0.12-sprint62-follow-up-record-validation.md',
  'docs/adr/066-cycle012-follow-up-record-validation.md',
  '.github/workflows/sprint62-follow-up-record-validation.yml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Sprint 62 required file missing: ${file}`);
}

const policy = JSON.parse(
  fs.readFileSync('governance/cycle-0.12/post-review-follow-up-record-validation-policy.json', 'utf8')
);

if (policy.classifications.length !== 12) {
  throw new Error('Sprint 62 must define exactly 12 controlled classifications.');
}
if (policy.controls.validationAllowed !== true) throw new Error('Validation must be allowed.');
for (const blocked of [
  'functionalBranchCreationAllowed',
  'pullRequestOpeningAllowed',
  'patchGenerationAllowed',
  'sourceMutationAllowed',
  'executionAllowed',
  'correctionAuthorized',
  'mergeAllowed',
  'activationAllowed'
]) {
  if (policy.controls[blocked] !== false) throw new Error(`${blocked} must remain false.`);
}
if (policy.controls.humanReviewRequired !== true) throw new Error('Human review must remain required.');

process.stdout.write('Sprint 62 readiness verified.\n');
