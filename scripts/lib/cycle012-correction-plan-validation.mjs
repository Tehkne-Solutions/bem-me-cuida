import crypto from 'node:crypto';

const REQUIRED = ['plan_id','decision_id','proposal_id','decision_validation_commit','target','impact_map','controls'];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function validateCorrectionPlans({ plans = [], currentDecisionValidationCommit, allowedRoots = [] }) {
  const seen = new Map();
  return plans.map((plan) => {
    let classification = 'current-and-compatible';
    if (!plan || REQUIRED.some((field) => !(field in plan))) classification = 'invalid-plan-reference';
    else if (plan.decision_validation_commit !== currentDecisionValidationCommit) classification = 'stale-decision-validation';
    else if (!Array.isArray(plan.impact_map) || plan.impact_map.some((entry) => !allowedRoots.some((root) => String(entry.path || '').startsWith(root)))) classification = 'scope-divergence';
    else if (plan.controls?.executionAllowed !== false || plan.controls?.mutationAllowed !== false) classification = 'invalid-plan-reference';

    const identity = plan?.plan_id;
    const semantic = plan ? digest({ decision_id: plan.decision_id, proposal_id: plan.proposal_id, target: plan.target, impact_map: plan.impact_map }) : null;
    if (identity && seen.has(identity)) classification = seen.get(identity) === semantic ? 'duplicate-plan' : 'conflicting-plan';
    if (identity) seen.set(identity, semantic);

    return {
      plan_id: identity ?? null,
      classification,
      executionAllowed: false,
      correctionAuthorized: false,
      pullRequestPreparationAllowed: false,
      activationAllowed: false,
      mutationAllowed: false
    };
  });
}
