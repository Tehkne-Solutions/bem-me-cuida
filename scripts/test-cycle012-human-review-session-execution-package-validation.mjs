import assert from 'node:assert/strict';
import { validateHumanReviewSessionExecutionPackage as validate } from './cycle012-human-review-session-execution-package-validation.mjs';

const basePackage = {
  type: 'human-review-session-execution-package',
  packageId: 'session-execution-package-001',
  sessionIdentity: {},
  participants: [],
  agenda: [],
  reviewQuestions: [],
  reviewChecklist: [],
  evidenceFields: [],
  decisionFields: [],
  closureFields: [],
  riskNotes: [],
  references: {
    authorizationId: 'authorization-001',
    authorizationValidationCommit: 'commit-001'
  }
};

const context = {
  currentAuthorizationId: 'authorization-001',
  currentAuthorizationValidationCommit: 'commit-001',
  currentAuthorizationClassification: 'current-and-compatible'
};

const check = (expected, input = {}) => {
  const output = validate({ packageRecord: structuredClone(basePackage), ...context, ...input });
  assert.equal(output.classification, expected);
  assert.equal(output.controls.reviewSessionExecutionAllowed, false);
  assert.equal(output.controls.sourceMutationAllowed, false);
  assert.equal(output.controls.humanReviewRequired, true);
};

check('current-and-compatible');
check('source-package-missing', { packageRecord: null });
check('stale-authorization-validation', { currentAuthorizationValidationCommit: 'commit-002' });
check('stale-authorization-validation', { currentAuthorizationClassification: 'stale' });

const invalidReference = structuredClone(basePackage);
delete invalidReference.references.authorizationId;
check('invalid-package-reference', { packageRecord: invalidReference });

const divergent = structuredClone(basePackage);
delete divergent.agenda;
check('structure-divergence', { packageRecord: divergent });

check('duplicate-package', { peerPackages: [structuredClone(basePackage)] });
const conflict = structuredClone(basePackage);
conflict.agenda = ['different'];
check('conflicting-package', { peerPackages: [conflict] });

const forbidden = structuredClone(basePackage);
forbidden.riskNotes = ['diff --git a/app b/app'];
check('forbidden-operational-content', { packageRecord: forbidden });

assert.deepEqual(
  validate({ packageRecord: structuredClone(basePackage), ...context }),
  validate({ packageRecord: structuredClone(basePackage), ...context })
);

console.log('Sprint 56 execution package validation tests passed.');
