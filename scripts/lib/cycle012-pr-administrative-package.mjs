import crypto from 'node:crypto';

const blocked = [
  'functionalBranchCreationAllowed',
  'pullRequestOpeningAllowed',
  'patchGenerationAllowed',
  'sourceMutationAllowed',
  'executionAllowed',
  'correctionAuthorized',
  'mergeAllowed',
  'activationAllowed'
];

export function packageId(input) {
  return `pr-admin-${crypto.createHash('sha256').update(JSON.stringify({
    cycle: input.cycle,
    authorizationId: input.authorizationId,
    authorizationValidationCommit: input.authorizationValidationCommit,
    allowedScope: [...input.allowedScope].sort()
  })).digest('hex').slice(0, 16)}`;
}

export function buildAdministrativePackage(input, policy) {
  if (input.authorizationClassification !== policy.requiredAuthorizationClassification) {
    throw new Error('authorization-not-current-and-compatible');
  }
  if (!input.authorizationId || !input.authorizationValidationCommit) {
    throw new Error('missing-authorization-reference');
  }
  if (!Array.isArray(input.allowedScope) || input.allowedScope.length === 0) {
    throw new Error('allowed-scope-required');
  }
  if (Object.values(input.controls ?? {}).some((value) => value === true)) {
    throw new Error('source-controls-must-remain-closed');
  }

  const controls = { ...policy.controls };
  for (const key of blocked) {
    if (controls[key] !== false) throw new Error(`unsafe-policy-control:${key}`);
  }
  if (controls.humanReviewRequired !== true) throw new Error('human-review-required');

  const pkg = {
    schemaVersion: policy.schemaVersion,
    packageId: packageId(input),
    packageKind: policy.packageKind,
    cycle: input.cycle,
    title: input.title,
    summary: input.summary,
    references: {
      authorizationId: input.authorizationId,
      authorizationValidationCommit: input.authorizationValidationCommit,
      planId: input.planId,
      decisionId: input.decisionId,
      proposalId: input.proposalId
    },
    allowedScope: [...new Set(input.allowedScope)].sort(),
    reviewChecklist: [...policy.requiredChecklist],
    riskNotes: [...(input.riskNotes ?? [])],
    controls
  };

  const serialized = JSON.stringify(pkg);
  for (const token of policy.forbiddenContent) {
    if (Object.prototype.hasOwnProperty.call(pkg, token)) throw new Error(`forbidden-field:${token}`);
  }
  if (/BEGIN PATCH|diff --git|migrationSql|replacementContent/i.test(serialized)) {
    throw new Error('forbidden-operational-content');
  }
  return Object.freeze(pkg);
}
