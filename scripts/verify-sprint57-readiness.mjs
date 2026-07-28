import fs from 'node:fs';

const required = [
  'governance/cycle-0.12/human-review-session-execution-record.policy.json',
  'scripts/cycle012-human-review-session-execution-record.mjs',
  'scripts/test-cycle012-human-review-session-execution-record.mjs',
  'docs/sprint-57-human-review-session-execution-record.md',
  'docs/adr/061-human-review-session-execution-record.md',
  '.github/workflows/sprint57.yml'
];

for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`Missing Sprint 57 artifact: ${path}`);
}

const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
if (policy.artifactType !== 'cycle012-human-review-session-execution-record-policy') throw new Error('Invalid policy artifact type');
if (policy.controls?.executionRecordGenerationAllowed !== true) throw new Error('Record generation must be allowed');
for (const blocked of ['reviewSessionExecutionAllowed','functionalBranchCreationAllowed','pullRequestOpeningAllowed','patchGenerationAllowed','sourceMutationAllowed','executionAllowed','correctionAuthorized','mergeAllowed','activationAllowed']) {
  if (policy.controls?.[blocked] !== false) throw new Error(`${blocked} must remain false`);
}
if (policy.controls?.humanReviewRequired !== true) throw new Error('Human review must remain required');

console.log('Sprint 57 readiness verified.');
