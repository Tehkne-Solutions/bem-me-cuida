import fs from 'node:fs';

const required = [
  'release/cycle-0.12.0/administrative-review-record-validation-policy.json',
  'scripts/lib/cycle012-administrative-review-record-validation.mjs',
  'scripts/test-cycle012-administrative-review-record-validation.mjs',
  'docs/SPRINT-50.md',
  'docs/ADR-054-validacao-de-registros-de-revisao-administrativa.md',
  '.github/workflows/sprint50.yml'
];
for (const path of required) if (!fs.existsSync(path)) throw new Error(`missing:${path}`);
const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
if (policy.reviewMustRemainManual !== true || policy.operationalActionsRemainBlocked !== true) throw new Error('unsafe-policy');
for (const value of ['current-and-compatible','stale-package-validation','duplicate-record','conflicting-record','source-record-missing','record-classification-mismatch','invalid-record-reference']) {
  if (!policy.validClassifications.includes(value)) throw new Error(`missing-classification:${value}`);
}
console.log('Sprint 50 readiness verified.');
