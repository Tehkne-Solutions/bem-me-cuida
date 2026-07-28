import assert from 'node:assert/strict';
import { validateFollowUpPackage } from './validate-cycle012-post-review-follow-up-package.mjs';

const base = {
  artifactType: 'post-review-follow-up-package',
  packageIdentity: { packageId: 'follow-up-001' },
  decisionSummary: { outcome: 'approved-with-follow-up' },
  followUpItems: [{ itemId: 'item-1', title: 'Revisar requisito', owner: 'review-owner', priority: 'high', status: 'planned', completionCriterion: 'Critério documentado e aprovado.' }],
  completionCriteria: [{ itemId: 'item-1', completionCriterion: 'Critério documentado e aprovado.' }],
  riskNotes: [],
  references: { executionRecordId: 'record-001', executionRecordValidationCommit: 'validation-sha' }
};

const input = (candidate = base, packages = [candidate]) => ({
  package: candidate,
  packages,
  currentExecutionRecordId: 'record-001',
  currentExecutionRecordValidationCommit: 'validation-sha',
  executionRecordClassification: 'current-and-compatible'
});

assert.equal(validateFollowUpPackage(input()).classification, 'current-and-compatible');
assert.equal(validateFollowUpPackage(input(null)).classification, 'source-package-missing');
assert.equal(validateFollowUpPackage(input({ ...base, references: { ...base.references, executionRecordId: 'other' } })).classification, 'invalid-package-reference');
assert.equal(validateFollowUpPackage(input({ ...base, references: { ...base.references, executionRecordValidationCommit: 'old' } })).classification, 'stale-execution-record-validation');
assert.equal(validateFollowUpPackage(input({ ...base, riskNotes: undefined })).classification, 'incomplete-package');
assert.equal(validateFollowUpPackage(input({ ...base, followUpItems: [{ ...base.followUpItems[0], owner: '' }] })).classification, 'missing-owner');
assert.equal(validateFollowUpPackage(input({ ...base, followUpItems: [{ ...base.followUpItems[0], priority: 'urgent' }] })).classification, 'invalid-priority-or-status');
assert.equal(validateFollowUpPackage(input({ ...base, completionCriteria: [{ itemId: 'other', completionCriterion: 'x' }] })).classification, 'completion-criteria-divergence');
assert.equal(validateFollowUpPackage(input(base, [base, structuredClone(base)])).classification, 'duplicate-package');
assert.equal(validateFollowUpPackage(input(base, [base, { ...structuredClone(base), decisionSummary: { outcome: 'changes-required' } }])).classification, 'conflicting-package');
assert.equal(validateFollowUpPackage(input({ ...base, riskNotes: ['npm run deploy'] })).classification, 'forbidden-operational-content');
assert.equal(validateFollowUpPackage(input(base, [base])).controls.functionalBranchCreationAllowed, false);
assert.equal(validateFollowUpPackage(input(base, [base])).controls.humanReviewRequired, true);

console.log('Sprint 60 validation tests passed.');
