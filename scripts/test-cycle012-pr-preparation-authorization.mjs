import assert from 'node:assert/strict';
import { authorizePrPreparation } from './lib/cycle012-pr-preparation-authorization.mjs';

const base = {
  correctionPlanId: 'cp-012-example',
  correctionPlanValidationCommit: 'a'.repeat(40),
  authorizerId: 'human:reviewer-01',
  authorizedAt: '2026-07-27T22:30:00.000Z',
  reason: 'Plano validado e escopo revisado.',
  decision: 'authorize-pr-preparation',
  planClassification: 'current-and-compatible',
  patchGenerationAllowed: false,
  sourceMutationAllowed: false,
  executionAllowed: false,
  correctionAuthorized: false,
  mergeAllowed: false,
  activationAllowed: false
};

const result = authorizePrPreparation(base);
assert.equal(result.pullRequestPreparationAllowed, true);
assert.equal(result.patchGenerationAllowed, false);
assert.equal(result.sourceMutationAllowed, false);
assert.equal(result.executionAllowed, false);
assert.equal(result.correctionAuthorized, false);
assert.equal(result.mergeAllowed, false);
assert.equal(result.activationAllowed, false);
assert.equal(result.humanReviewRequired, true);
assert.match(result.authorizationId, /^prpa-[a-f0-9]{16}$/);
assert.equal(authorizePrPreparation(base).authorizationId, result.authorizationId);

for (const field of ['correctionPlanId', 'correctionPlanValidationCommit', 'authorizerId', 'authorizedAt', 'reason']) {
  assert.throws(() => authorizePrPreparation({ ...base, [field]: '' }), new RegExp(`missing:${field}`));
}
assert.throws(() => authorizePrPreparation({ ...base, planClassification: 'stale-decision-validation' }), /plan-not-current/);
assert.throws(() => authorizePrPreparation({ ...base, decision: 'reject' }), /invalid-authorization/);
for (const field of ['sourceMutationAllowed', 'executionAllowed', 'correctionAuthorized', 'mergeAllowed', 'activationAllowed']) {
  assert.throws(() => authorizePrPreparation({ ...base, [field]: true }), /unsafe-authorization-controls/);
}
console.log('Sprint 45 authorization tests passed.');
