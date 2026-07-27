import fs from 'node:fs';

const required = [
  'release/cycle-0.12.0/correction-plan-policy.json',
  'scripts/lib/cycle012-correction-plan.mjs',
  'scripts/test-cycle012-correction-plan.mjs',
  '.github/workflows/sprint43.yml',
  'docs/SPRINT-43.md',
  'docs/ADR-047-planos-de-correcao-sem-mutacao.md'
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`missing:${file}`);
}

const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
if (policy.controls.executionAllowed !== false) throw new Error('execution-must-remain-blocked');
if (policy.controls.correctionAuthorized !== false) throw new Error('correction-must-remain-unauthorized');
if (policy.controls.activationAllowed !== false) throw new Error('activation-must-remain-blocked');
if (policy.plan.sourceMutationForbidden !== true) throw new Error('source-mutation-must-be-forbidden');
if (policy.eligibleDecisionClassification !== 'current-and-compatible') throw new Error('invalid-eligibility');
console.log('Sprint 43 readiness verified.');
