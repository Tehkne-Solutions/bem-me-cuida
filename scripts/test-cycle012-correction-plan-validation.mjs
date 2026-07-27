import assert from 'node:assert/strict';
import { validateCorrectionPlans } from './lib/cycle012-correction-plan-validation.mjs';

const controls = { executionAllowed: false, mutationAllowed: false };
const base = {
  plan_id: 'plan-1', decision_id: 'decision-1', proposal_id: 'proposal-1',
  decision_validation_commit: 'abc123', target: 'release/cycle-0.12.0',
  impact_map: [{ path: 'release/cycle-0.12.0/source.json' }], controls
};

const current = validateCorrectionPlans({ plans: [base], currentDecisionValidationCommit: 'abc123', allowedRoots: ['release/cycle-0.12.0/'] });
assert.equal(current[0].classification, 'current-and-compatible');
assert.equal(current[0].pullRequestPreparationAllowed, false);

const stale = validateCorrectionPlans({ plans: [base], currentDecisionValidationCommit: 'new456', allowedRoots: ['release/'] });
assert.equal(stale[0].classification, 'stale-decision-validation');

const duplicate = validateCorrectionPlans({ plans: [base, structuredClone(base)], currentDecisionValidationCommit: 'abc123', allowedRoots: ['release/'] });
assert.equal(duplicate[1].classification, 'duplicate-plan');

const conflictPlan = { ...structuredClone(base), target: 'docs', impact_map: [{ path: 'docs/file.md' }] };
const conflict = validateCorrectionPlans({ plans: [base, conflictPlan], currentDecisionValidationCommit: 'abc123', allowedRoots: ['release/', 'docs/'] });
assert.equal(conflict[1].classification, 'conflicting-plan');

const scope = validateCorrectionPlans({ plans: [{ ...base, plan_id: 'plan-2', impact_map: [{ path: 'apps/mobile/App.tsx' }] }], currentDecisionValidationCommit: 'abc123', allowedRoots: ['release/'] });
assert.equal(scope[0].classification, 'scope-divergence');

const invalid = validateCorrectionPlans({ plans: [{ plan_id: 'bad' }], currentDecisionValidationCommit: 'abc123', allowedRoots: ['release/'] });
assert.equal(invalid[0].classification, 'invalid-plan-reference');

console.log('Sprint 44 correction plan validation tests passed');
