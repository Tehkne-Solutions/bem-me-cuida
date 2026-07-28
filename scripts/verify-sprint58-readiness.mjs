import fs from 'node:fs';

const requiredFiles = [
  'governance/cycle-0.12/human-review-session-execution-record-validation-policy.json',
  'scripts/validate-cycle012-human-review-session-execution-record.mjs',
  'scripts/test-cycle012-human-review-session-execution-record-validation.mjs',
  'docs/sprint-58-human-review-session-execution-record-validation.md',
  'docs/adr/ADR-062-human-review-session-execution-record-validation.md',
  '.github/workflows/sprint58.yml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing Sprint 58 file: ${file}`);
}

const policy = JSON.parse(fs.readFileSync(requiredFiles[0], 'utf8'));
if (policy.allowedClassifications.length !== 10) throw new Error('Sprint 58 must define ten controlled classifications.');
if (policy.controls.executionAllowed !== false) throw new Error('Operational execution must remain blocked.');
if (policy.controls.humanReviewRequired !== true) throw new Error('Human review must remain required.');

console.log('Sprint 58 readiness verified.');
