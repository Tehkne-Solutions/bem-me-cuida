import crypto from 'node:crypto';

const blockedControls = [
  'reviewSessionExecutionAllowed',
  'functionalBranchCreationAllowed',
  'pullRequestOpeningAllowed',
  'patchGenerationAllowed',
  'sourceMutationAllowed',
  'executionAllowed',
  'correctionAuthorized',
  'mergeAllowed',
  'activationAllowed'
];

export function sessionPackageId(input) {
  return `review-session-${crypto.createHash('sha256').update(JSON.stringify({
    cycle: input.cycle,
    reviewRecordId: input.reviewRecordId,
    recordValidationCommit: input.recordValidationCommit,
    packageId: input.packageId,
    questions: [...input.reviewQuestions]
  })).digest('hex').slice(0, 16)}`;
}

export function buildHumanReviewSessionPackage(input, policy) {
  if (input.recordClassification !== policy.requiredRecordClassification) {
    throw new Error('review-record-not-current-and-compatible');
  }
  for (const key of ['reviewRecordId', 'recordValidationCommit', 'packageId', 'authorizationId']) {
    if (!input[key]) throw new Error(`missing-reference:${key}`);
  }
  if (!Array.isArray(input.reviewQuestions) || input.reviewQuestions.length === 0) {
    throw new Error('review-questions-required');
  }
  if (Object.values(input.sourceControls ?? {}).some((value) => value === true)) {
    throw new Error('source-controls-must-remain-closed');
  }

  const controls = { ...policy.controls };
  for (const key of blockedControls) {
    if (controls[key] !== false) throw new Error(`unsafe-policy-control:${key}`);
  }
  if (controls.sessionPackageGenerationAllowed !== true || controls.humanReviewRequired !== true) {
    throw new Error('invalid-review-controls');
  }

  const result = {
    schemaVersion: policy.schemaVersion,
    sessionPackageId: sessionPackageId(input),
    packageKind: policy.packageKind,
    cycle: input.cycle,
    context: input.context,
    references: {
      reviewRecordId: input.reviewRecordId,
      recordValidationCommit: input.recordValidationCommit,
      packageId: input.packageId,
      authorizationId: input.authorizationId,
      planId: input.planId,
      decisionId: input.decisionId,
      proposalId: input.proposalId
    },
    reviewQuestions: [...input.reviewQuestions],
    reviewChecklist: [...policy.requiredChecklist],
    decisionFields: [...policy.allowedDecisionFields],
    riskNotes: [...(input.riskNotes ?? [])],
    controls
  };

  for (const field of policy.forbiddenContent) {
    if (Object.prototype.hasOwnProperty.call(result, field)) throw new Error(`forbidden-field:${field}`);
  }
  const serialized = JSON.stringify(result);
  if (/BEGIN PATCH|diff --git|replacementContent|migrationSql|git apply|supabase db push/i.test(serialized)) {
    throw new Error('forbidden-operational-content');
  }
  return Object.freeze(result);
}
