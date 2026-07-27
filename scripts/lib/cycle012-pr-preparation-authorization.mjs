import crypto from 'node:crypto';

const REQUIRED = ['correctionPlanId', 'correctionPlanValidationCommit', 'authorizerId', 'authorizedAt', 'reason'];

export function authorizePrPreparation(input) {
  for (const field of REQUIRED) {
    if (!input?.[field] || String(input[field]).trim() === '') throw new Error(`missing:${field}`);
  }
  if (input.planClassification !== 'current-and-compatible') throw new Error('plan-not-current-and-compatible');
  if (input.decision !== 'authorize-pr-preparation') throw new Error('invalid-authorization-decision');
  if (input.executionAllowed || input.correctionAuthorized || input.sourceMutationAllowed || input.mergeAllowed || input.activationAllowed) {
    throw new Error('unsafe-authorization-controls');
  }
  const canonical = JSON.stringify({
    correctionPlanId: input.correctionPlanId,
    correctionPlanValidationCommit: input.correctionPlanValidationCommit,
    authorizerId: input.authorizerId,
    authorizedAt: input.authorizedAt,
    reason: input.reason,
    decision: input.decision
  });
  return Object.freeze({
    authorizationId: `prpa-${crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16)}`,
    cycle: '0.12.0',
    correctionPlanId: input.correctionPlanId,
    correctionPlanValidationCommit: input.correctionPlanValidationCommit,
    authorizerId: input.authorizerId,
    authorizedAt: input.authorizedAt,
    reason: input.reason,
    decision: input.decision,
    planClassification: input.planClassification,
    pullRequestPreparationAllowed: true,
    patchGenerationAllowed: false,
    sourceMutationAllowed: false,
    executionAllowed: false,
    correctionAuthorized: false,
    mergeAllowed: false,
    activationAllowed: false,
    humanReviewRequired: true
  });
}
