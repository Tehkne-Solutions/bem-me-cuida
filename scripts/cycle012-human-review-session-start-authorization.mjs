import crypto from 'node:crypto';

export function buildSessionStartAuthorization(input) {
  const required = ['reviewer', 'decidedAt', 'rationale', 'sessionPackageId', 'sessionPackageValidationCommit'];
  for (const field of required) {
    if (!input?.[field]) throw new Error(`missing:${field}`);
  }
  if (input.sessionPackageClassification !== 'current-and-compatible') {
    throw new Error('ineligible-session-package');
  }
  if (input.decision !== 'authorize-human-review-session-start') {
    throw new Error('invalid-decision');
  }
  const payload = {
    kind: 'human-review-session-start-authorization',
    cycle: '0.12.0',
    decision: input.decision,
    reviewer: input.reviewer,
    decidedAt: input.decidedAt,
    rationale: input.rationale,
    references: {
      sessionPackageId: input.sessionPackageId,
      sessionPackageValidationCommit: input.sessionPackageValidationCommit
    },
    controls: {
      sessionStartAuthorizationRecordingAllowed: true,
      reviewSessionExecutionAllowed: false,
      functionalBranchCreationAllowed: false,
      pullRequestOpeningAllowed: false,
      patchGenerationAllowed: false,
      sourceMutationAllowed: false,
      executionAllowed: false,
      correctionAuthorized: false,
      mergeAllowed: false,
      activationAllowed: false,
      humanReviewRequired: true
    }
  };
  return { ...payload, authorizationId: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex') };
}
