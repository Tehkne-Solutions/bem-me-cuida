import fs from 'node:fs';

const required = [
  'governance/cycle-0.12/human-review-session-start-authorization.policy.json',
  'scripts/cycle012-human-review-session-start-authorization.mjs',
  'scripts/test-cycle012-human-review-session-start-authorization.mjs',
  'docs/sprint-53-human-review-session-start-authorization.md',
  'docs/adr/057-human-review-session-start-authorization.md',
  '.github/workflows/sprint53.yml'
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`missing-file:${file}`);
}
const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
if (policy.controls.reviewSessionExecutionAllowed !== false) throw new Error('session-execution-must-remain-blocked');
if (policy.controls.humanReviewRequired !== true) throw new Error('human-review-must-remain-required');
console.log('Sprint 53 readiness verified.');
