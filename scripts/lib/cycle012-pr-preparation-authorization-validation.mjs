const CONTROL_KEYS = [
  'pullRequestPreparationAllowed',
  'patchGenerationAllowed',
  'sourceMutationAllowed',
  'executionAllowed',
  'correctionAuthorized',
  'mergeAllowed',
  'activationAllowed'
];

function controlsRemainClosed(authorization) {
  const controls = authorization?.controls ?? {};
  return CONTROL_KEYS.every((key) => controls[key] === false) && controls.humanReviewRequired === true;
}

function semanticKey(authorization) {
  return [
    authorization?.planId,
    authorization?.planValidationCommit,
    authorization?.decision
  ].join(':');
}

export function validatePrPreparationAuthorizations({ authorizations = [], plans = [] }) {
  const plansById = new Map(plans.map((plan) => [plan.planId, plan]));
  const semanticCounts = new Map();
  const decisionsByPlan = new Map();

  for (const authorization of authorizations) {
    const key = semanticKey(authorization);
    semanticCounts.set(key, (semanticCounts.get(key) ?? 0) + 1);
    const decisions = decisionsByPlan.get(authorization?.planId) ?? new Set();
    decisions.add(authorization?.decision);
    decisionsByPlan.set(authorization?.planId, decisions);
  }

  return authorizations.map((authorization) => {
    const plan = plansById.get(authorization?.planId);
    let classification = 'current-and-compatible';
    const reasons = [];

    if (!authorization?.authorizationId || !authorization?.planId || !authorization?.planValidationCommit) {
      classification = 'invalid-authorization-reference';
      reasons.push('required authorization references are missing');
    } else if (!plan) {
      classification = 'source-authorization-missing';
      reasons.push('referenced validated plan was not found');
    } else if (authorization.planValidationCommit !== plan.validationCommit) {
      classification = 'stale-plan-validation';
      reasons.push('authorization points to an outdated plan validation commit');
    } else if ((semanticCounts.get(semanticKey(authorization)) ?? 0) > 1) {
      classification = 'duplicate-authorization';
      reasons.push('an equivalent authorization already exists');
    } else if ((decisionsByPlan.get(authorization.planId)?.size ?? 0) > 1) {
      classification = 'conflicting-authorization';
      reasons.push('multiple decisions exist for the same plan');
    } else if (authorization.decision !== 'authorize-pr-preparation' || plan.classification !== 'current-and-compatible') {
      classification = 'authorization-classification-mismatch';
      reasons.push('authorization decision or source plan classification is incompatible');
    } else if (!controlsRemainClosed(authorization)) {
      classification = 'authorization-classification-mismatch';
      reasons.push('authorization controls are not fail-closed');
    }

    return {
      authorizationId: authorization?.authorizationId ?? null,
      planId: authorization?.planId ?? null,
      classification,
      reasons,
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
  });
}
