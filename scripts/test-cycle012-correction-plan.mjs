import assert from 'node:assert/strict';
import { buildCorrectionPlan, assertCorrectionPlanSafe } from './lib/cycle012-correction-plan.mjs';
import policy from '../release/cycle-0.12.0/correction-plan-policy.json' with { type: 'json' };

const proposal = { proposalId: 'rp-1', recordId: 'rec-1', target: 'queue-update-record', requestedAction: 'propose-refresh-against-current-source' };
const decision = { decisionId: 'dec-1', proposalId: 'rp-1', decision: 'accept-for-future-correction', validationCommit: 'a'.repeat(40) };
const validation = { decisionId: 'dec-1', classification: 'current-and-compatible', sourceCommit: 'b'.repeat(40) };

const plan = buildCorrectionPlan({ decision, decisionValidation: validation, proposal, policy });
assert.equal(assertCorrectionPlanSafe(plan), true);
assert.equal(plan.executionAllowed, false);
assert.equal(plan.correctionAuthorized, false);
assert.deepEqual(plan.allowedRoots, ['release/cycle-0.12.0/queue-updates']);
assert.throws(() => buildCorrectionPlan({ decision, decisionValidation: { ...validation, classification: 'stale-proposal-validation' }, proposal, policy }), /decision-not-current/);
assert.throws(() => buildCorrectionPlan({ decision: { ...decision, decision: 'reject-proposal' }, decisionValidation: validation, proposal, policy }), /decision-not-accepted/);
assert.throws(() => buildCorrectionPlan({ decision, decisionValidation: validation, proposal: { ...proposal, proposalId: 'rp-2' }, policy }), /proposal-reference-mismatch/);
console.log('Sprint 43 correction plan tests passed.');
