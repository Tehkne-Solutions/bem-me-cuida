import fs from 'node:fs';

const required = [
  'release/cycle-0.12.0/administrative-review-authorization-policy.json',
  'scripts/lib/cycle012-administrative-review-authorization.mjs',
  'scripts/test-cycle012-administrative-review-authorization.mjs',
  'docs/SPRINT-49.md',
  'docs/ADR-053-autorizacao-humana-para-revisao-administrativa.md',
  '.github/workflows/sprint49.yml'
];

for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`missing:${path}`);
}

const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
const controls = policy.controls;
if (controls.administrativeReviewAuthorizationRecordingAllowed !== true) {
  throw new Error('authorization-recording-not-allowed');
}
if (controls.humanReviewRequired !== true) throw new Error('human-review-required');
for (const key of [
  'humanReviewAllowed',
  'functionalBranchCreationAllowed',
  'pullRequestOpeningAllowed',
  'patchGenerationAllowed',
  'sourceMutationAllowed',
  'executionAllowed',
  'correctionAuthorized',
  'mergeAllowed',
  'activationAllowed'
]) {
  if (controls[key] !== false) throw new Error(`unsafe-control:${key}`);
}

console.log('Sprint 49 readiness verified.');
