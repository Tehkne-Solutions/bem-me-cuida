import assert from 'node:assert/strict';
import {
  expectedClosureState,
  validateAdministrativeClosurePackage,
} from './validate-cycle012-administrative-closure-package.mjs';

const sourceValidation = { classification: 'current-and-compatible', commit: 'abc123' };
const base = {
  packageIdentity: { packageId: 'cycle-0.12-closure-001' },
  validatedSources: [
    { sourceId: 'record-validation', validationCommit: 'abc123', classification: 'current-and-compatible' },
  ],
  decisionConsolidation: { decision: 'approved-with-follow-up', sourceDecisionId: 'decision-001' },
  followUpConsolidation: { items: [] },
  remainingItems: [],
  acceptedRisks: [],
  transitionCriteria: [
    { criterionId: 'criterion-001', description: 'Human approval is recorded.', status: 'pending' },
  ],
  closureStatement: { state: 'closed-administratively' },
  references: { sourceValidationCommit: 'abc123', policyVersion: '1.0.0' },
};

const clone = (value) => structuredClone(value);
const validate = (pkg, existingPackages = []) => validateAdministrativeClosurePackage({
  package: pkg,
  currentSourceValidation: sourceValidation,
  existingPackages,
});

assert.equal(validate(base).classification, 'current-and-compatible');
assert.equal(expectedClosureState(base), 'closed-administratively');

const stale = clone(base);
stale.references.sourceValidationCommit = 'old';
assert.equal(validate(stale).classification, 'stale-closure-package');

assert.equal(validate(base, [clone(base)]).classification, 'duplicate-closure-package');
const conflict = clone(base);
conflict.closureStatement.note = 'different';
assert.equal(validate(conflict, [clone(base)]).classification, 'conflicting-closure-package');

const incomplete = clone(base);
delete incomplete.transitionCriteria;
assert.equal(validate(incomplete).classification, 'incomplete-closure-package');

const sourceInvalid = clone(base);
sourceInvalid.validatedSources[0].classification = 'stale';
assert.equal(validate(sourceInvalid).classification, 'invalid-validated-source');

const decisionInvalid = clone(base);
delete decisionInvalid.decisionConsolidation.decision;
assert.equal(validate(decisionInvalid).classification, 'decision-consolidation-divergence');

const followUpInvalid = clone(base);
followUpInvalid.followUpConsolidation.items = null;
assert.equal(validate(followUpInvalid).classification, 'follow-up-consolidation-divergence');

const remainingInvalid = clone(base);
remainingInvalid.remainingItems = [{ itemId: 'x', owner: '', status: 'blocked', reason: 'pending' }];
remainingInvalid.closureStatement.state = 'open-administratively';
assert.equal(validate(remainingInvalid).classification, 'invalid-remaining-item');

const riskInvalid = clone(base);
riskInvalid.acceptedRisks = [{ riskId: 'r1', owner: 'owner', decision: 'unknown', rationale: 'x' }];
assert.equal(validate(riskInvalid).classification, 'invalid-accepted-risk');

const criteriaInvalid = clone(base);
criteriaInvalid.transitionCriteria = [];
assert.equal(validate(criteriaInvalid).classification, 'incomplete-transition-criteria');

const closureInvalid = clone(base);
closureInvalid.closureStatement.state = 'open-administratively';
assert.equal(validate(closureInvalid).classification, 'inconsistent-closure-state');

const referenceInvalid = clone(base);
referenceInvalid.references.policyVersion = '0.9.0';
assert.equal(validate(referenceInvalid).classification, 'invalid-closure-reference');

const forbidden = clone(base);
forbidden.closureStatement.note = 'npm run deploy';
assert.equal(validate(forbidden).classification, 'forbidden-operational-content');

const partiallyClosed = clone(base);
partiallyClosed.remainingItems = [{ itemId: 'r1', owner: 'owner', status: 'accepted-risk', reason: 'accepted' }];
partiallyClosed.closureStatement.state = 'partially-closed-administratively';
assert.equal(validate(partiallyClosed).classification, 'current-and-compatible');

const open = clone(base);
open.remainingItems = [{ itemId: 'r2', owner: 'owner', status: 'blocked', reason: 'dependency' }];
open.closureStatement.state = 'open-administratively';
assert.equal(validate(open).classification, 'current-and-compatible');

console.log('Sprint 64 administrative closure package validation tests passed.');
