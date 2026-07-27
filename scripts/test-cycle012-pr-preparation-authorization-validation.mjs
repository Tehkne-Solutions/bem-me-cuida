import assert from 'node:assert/strict';
import { validatePrPreparationAuthorizations } from './lib/cycle012-pr-preparation-authorization-validation.mjs';

const plan = {
  planId: 'plan-001',
  validationCommit: 'commit-plan-current',
  classification: 'current-and-compatible'
};

const baseAuthorization = {
  authorizationId: 'authorization-001',
  planId: plan.planId,
  planValidationCommit: plan.validationCommit,
  decision: 'authorize-pr-preparation',
  controls: {
    pullRequestPreparationAllowed: false,
    patchGenerationAllowed: false,
    sourceMutationAllowed: false,
    executionAllowed: false,
    correctionAuthorized: false,
    mergeAllowed: false,
    activationAllowed: false,
    humanReviewRequired: true
  }
};

function classification(authorizations, plans = [plan], index = 0) {
  return validatePrPreparationAuthorizations({ authorizations, plans })[index].classification;
}

assert.equal(classification([baseAuthorization]), 'current-and-compatible');
assert.equal(classification([{ ...baseAuthorization, planValidationCommit: 'old-commit' }]), 'stale-plan-validation');
assert.equal(classification([baseAuthorization, { ...baseAuthorization, authorizationId: 'authorization-002' }]), 'duplicate-authorization');
assert.equal(classification([
  baseAuthorization,
  { ...baseAuthorization, authorizationId: 'authorization-002', decision: 'revoke-pr-preparation' }
]), 'conflicting-authorization');
assert.equal(classification([baseAuthorization], []), 'source-authorization-missing');
assert.equal(classification([{ ...baseAuthorization, decision: 'revoke-pr-preparation' }]), 'authorization-classification-mismatch');
assert.equal(classification([{ ...baseAuthorization, planId: '' }]), 'invalid-authorization-reference');

const incompatiblePlan = { ...plan, classification: 'stale-plan-validation' };
assert.equal(classification([baseAuthorization], [incompatiblePlan]), 'authorization-classification-mismatch');

const openControls = {
  ...baseAuthorization,
  controls: { ...baseAuthorization.controls, patchGenerationAllowed: true }
};
assert.equal(classification([openControls]), 'authorization-classification-mismatch');

for (const result of validatePrPreparationAuthorizations({ authorizations: [baseAuthorization], plans: [plan] })) {
  assert.equal(result.controls.pullRequestPreparationAllowed, false);
  assert.equal(result.controls.patchGenerationAllowed, false);
  assert.equal(result.controls.sourceMutationAllowed, false);
  assert.equal(result.controls.executionAllowed, false);
  assert.equal(result.controls.correctionAuthorized, false);
  assert.equal(result.controls.mergeAllowed, false);
  assert.equal(result.controls.activationAllowed, false);
  assert.equal(result.controls.humanReviewRequired, true);
}

console.log('Sprint 46 authorization validation scenarios passed.');
