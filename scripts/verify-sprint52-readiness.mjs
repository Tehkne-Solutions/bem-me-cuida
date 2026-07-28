import fs from 'node:fs';

const required = [
  'release/cycle-0.12.0/human-review-session-package-validation-policy.json',
  'scripts/lib/cycle012-human-review-session-package-validation.mjs',
  'scripts/test-cycle012-human-review-session-package-validation.mjs',
  'docs/SPRINT-52.md',
  'docs/ADR-056-validacao-dos-pacotes-de-sessao-de-revisao-humana.md',
  '.github/workflows/sprint52.yml'
];
for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`missing:${path}`);
}
const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
if (!policy.validClassifications.includes('forbidden-operational-content')) throw new Error('missing-forbidden-classification');
if (policy.controls.humanReviewRequired !== true) throw new Error('human-review-required');
for (const [key, value] of Object.entries(policy.controls)) {
  if (key !== 'humanReviewRequired' && value !== false) throw new Error(`unsafe-control:${key}`);
}
console.log('Sprint 52 readiness verified.');
