import assert from 'node:assert/strict';
import { generateAdministrativeClosurePackage, loadPolicy } from './generate-cycle012-administrative-closure-package.mjs';

const policy = await loadPolicy();
const baseInput = {
  followUpRecordValidation: { classification: 'current-and-compatible' },
  sourceCommit: '778964b3db7c85a276369a53939d00dcffd42886',
  generatedAt: '2026-07-28T18:30:00Z',
  generatedBy: 'administrative-governance',
  validatedSources: [{ type: 'follow-up-record-validation', classification: 'current-and-compatible' }],
  decisionConsolidation: [{ decision: 'approved-with-follow-up' }],
  followUpConsolidation: [{ status: 'completed-administratively' }],
  remainingItems: [],
  acceptedRisks: [],
  transitionCriteria: [{ criterionId: 'C-01', description: 'Human approval recorded', status: 'pending', evidenceReference: 'human-review' }],
  closureSummary: 'Administrative cycle consolidation only.',
  references: { followUpRecordValidation: 'sprint-62' },
};

const first = generateAdministrativeClosurePackage(baseInput, policy);
const second = generateAdministrativeClosurePackage(baseInput, policy);
assert.deepEqual(first, second, 'generator must be deterministic');
assert.equal(first.closureStatement.state, 'closed-administratively');
assert.equal(first.closureStatement.implementationAuthorized, false);
assert.equal(first.controls.executionAllowed, false);
assert.equal(first.controls.activationAllowed, false);

const partial = generateAdministrativeClosurePackage({
  ...baseInput,
  remainingItems: [{ itemId: 'I-01', title: 'Accepted administrative risk', owner: 'governance', state: 'accepted-risk', rationale: 'Documented' }],
}, policy);
assert.equal(partial.closureStatement.state, 'partially-closed-administratively');

const open = generateAdministrativeClosurePackage({
  ...baseInput,
  remainingItems: [{ itemId: 'I-02', title: 'Pending evidence', owner: 'governance', state: 'blocked', rationale: 'Awaiting review' }],
}, policy);
assert.equal(open.closureStatement.state, 'open-administratively');

assert.throws(() => generateAdministrativeClosurePackage({
  ...baseInput,
  followUpRecordValidation: { classification: 'incomplete-record' },
}, policy), /follow-up-record-validation-not-current/);

assert.throws(() => generateAdministrativeClosurePackage({
  ...baseInput,
  closureSummary: 'Run npm run deploy now',
}, policy), /forbidden-operational-content/);

console.log('cycle 0.12 administrative closure package tests passed');
