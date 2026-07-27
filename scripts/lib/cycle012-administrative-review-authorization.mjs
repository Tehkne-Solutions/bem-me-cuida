import crypto from 'node:crypto';

const blockedControls = [
  'humanReviewAllowed',
  'functionalBranchCreationAllowed',
  'pullRequestOpeningAllowed',
  'patchGenerationAllowed',
  'sourceMutationAllowed',
  'executionAllowed',
  'correctionAuthorized',
  'mergeAllowed',
  'activationAllowed'
];

export function authorizationId(input) {
  const canonical = {
    cycle: input.cycle,
    packageId: input.packageId,
    packageValidationCommit: input.packageValidationCommit,
    decision: input.decision,
    reviewer: input.reviewer
  };
  return `admin-review-auth-${crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 16)}`;
}

export function buildAdministrativeReviewAuthorization(input, policy) {
  if (input.packageClassification !== policy.requiredPackageClassification) {
    throw new Error('package-not-current-and-compatible');
  }
  if (input.decision !== policy.allowedDecision) throw new Error('invalid-review-decision');
  if (!input.reviewer || !input.reviewedAt) throw new Error('human-review-metadata-required');

  for (const reference of policy.requiredReferences) {
    if (!input[reference]) throw new Error(`missing-reference:${reference}`);
  }

  const controls = { ...policy.controls };
  if (controls.administrativeReviewAuthorizationRecordingAllowed !== true) {
    throw new Error('authorization-recording-must-be-allowed');
  }
  for (const key of blockedControls) {
    if (controls[key] !== false) throw new Error(`unsafe-policy-control:${key}`);
  }
  if (controls.humanReviewRequired !== true) throw new Error('human-review-required');

  return Object.freeze({
    schemaVersion: policy.schemaVersion,
    authorizationId: authorizationId(input),
    authorizationKind: policy.authorizationKind,
    cycle: input.cycle,
    decision: input.decision,
    reviewer: input.reviewer,
    reviewedAt: input.reviewedAt,
    rationale: input.rationale ?? '',
    references: {
      packageId: input.packageId,
      packageValidationCommit: input.packageValidationCommit,
      authorizationId: input.authorizationId,
      planId: input.planId,
      decisionId: input.decisionId,
      proposalId: input.proposalId
    },
    controls
  });
}
