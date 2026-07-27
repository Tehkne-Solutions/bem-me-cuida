import crypto from 'node:crypto';

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export function buildCorrectionPlan({ decision, decisionValidation, proposal, policy }) {
  if (!decision || !decisionValidation || !proposal || !policy) throw new Error('missing-input');
  if (decisionValidation.classification !== policy.eligibleDecisionClassification) throw new Error('decision-not-current');
  if (decision.decision !== policy.eligibleDecisionType) throw new Error('decision-not-accepted');
  if (decision.proposalId !== proposal.proposalId) throw new Error('proposal-reference-mismatch');
  if (decisionValidation.decisionId !== decision.decisionId) throw new Error('decision-reference-mismatch');

  const allowedRoots = policy.allowedTargets[proposal.target];
  if (!Array.isArray(allowedRoots)) throw new Error('unsupported-target');

  const sourceCommit = decisionValidation.sourceCommit || decision.validationCommit;
  const planId = `cp-${sha256(`${decision.decisionId}:${sourceCommit}:${proposal.target}`).slice(0, 24)}`;

  return {
    schemaVersion: '1.0',
    product: policy.product,
    cycleVersion: policy.cycleVersion,
    planId,
    decisionId: decision.decisionId,
    proposalId: proposal.proposalId,
    recordId: proposal.recordId,
    sourceCommit,
    target: proposal.target,
    requestedAction: proposal.requestedAction,
    allowedRoots,
    impactMap: allowedRoots.map((root) => ({ root, mutationAllowed: false, reviewRequired: true })),
    consistency: {
      decisionCurrent: true,
      proposalReferenceValid: true,
      targetSupported: true,
      scopeDeterministic: true
    },
    executionAllowed: false,
    correctionAuthorized: false,
    activationAllowed: false
  };
}

export function assertCorrectionPlanSafe(plan) {
  if (!plan?.planId || !plan?.decisionId || !plan?.proposalId) throw new Error('invalid-plan');
  if (plan.executionAllowed || plan.correctionAuthorized || plan.activationAllowed) throw new Error('unsafe-plan');
  if (!Array.isArray(plan.allowedRoots) || !Array.isArray(plan.impactMap)) throw new Error('invalid-impact-map');
  return true;
}
