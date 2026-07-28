import fs from 'node:fs';

const requiredFiles = [
  'governance/cycle-0.12/post-review-follow-up-record-policy.json',
  'scripts/generate-cycle012-post-review-follow-up-record.mjs',
  'scripts/test-cycle012-post-review-follow-up-record.mjs',
  'docs/governance/sprint61-post-review-follow-up-record.md',
  'docs/adr/065-post-review-follow-up-record.md',
  '.github/workflows/sprint61.yml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`missing Sprint 61 file: ${file}`);
}

const policy = JSON.parse(fs.readFileSync(requiredFiles[0], 'utf8'));
if (policy.artifactType !== 'post-review-follow-up-record') throw new Error('invalid artifact type');
if (policy.controls.sourceMutationAllowed !== false) throw new Error('source mutation must remain blocked');
if (policy.controls.executionAllowed !== false) throw new Error('execution must remain blocked');
if (policy.controls.humanReviewRequired !== true) throw new Error('human review must remain required');

process.stdout.write('Sprint 61 readiness verified.\n');
