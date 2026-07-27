const blockedControlKeys = [
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

function hasForbiddenContent(pkg, policy) {
  const serialized = JSON.stringify(pkg);
  return policy.forbiddenPatterns.some((pattern) => serialized.toLowerCase().includes(pattern.toLowerCase()));
}

function sameSemanticPackage(a, b) {
  return a.authorizationId === b.authorizationId &&
    a.authorizationValidationCommit === b.authorizationValidationCommit &&
    JSON.stringify([...(a.allowedScope ?? [])].sort()) === JSON.stringify([...(b.allowedScope ?? [])].sort());
}

export function validateAdministrativePackage(input, policy) {
  const { pkg, currentAuthorization, siblingPackages = [] } = input;
  let classification = 'current-and-compatible';

  if (!pkg) classification = 'source-package-missing';
  else if (pkg.packageKind !== policy.requiredPackageKind || !pkg.packageId || !pkg.references?.authorizationId) {
    classification = 'invalid-package-reference';
  } else if (!currentAuthorization || pkg.references.authorizationId !== currentAuthorization.authorizationId) {
    classification = 'invalid-package-reference';
  } else if (pkg.references.authorizationValidationCommit !== currentAuthorization.validationCommit || currentAuthorization.classification !== policy.requiredAuthorizationClassification) {
    classification = 'stale-authorization-validation';
  } else if (hasForbiddenContent(pkg, policy)) {
    classification = 'forbidden-operational-content';
  } else if (JSON.stringify([...(pkg.allowedScope ?? [])].sort()) !== JSON.stringify([...(currentAuthorization.allowedScope ?? [])].sort())) {
    classification = 'scope-divergence';
  } else {
    const duplicates = siblingPackages.filter((candidate) => candidate.packageId !== pkg.packageId && sameSemanticPackage(candidate, pkg));
    const conflicts = siblingPackages.filter((candidate) => candidate.packageId !== pkg.packageId && candidate.references?.authorizationId === pkg.references.authorizationId && !sameSemanticPackage(candidate, pkg));
    if (duplicates.length) classification = 'duplicate-package';
    else if (conflicts.length) classification = 'conflicting-package';
  }

  const controls = { ...policy.controls };
  for (const key of blockedControlKeys) {
    if (controls[key] !== false) throw new Error(`unsafe-policy-control:${key}`);
  }
  if (controls.humanReviewRequired !== true) throw new Error('human-review-required');

  return Object.freeze({
    schemaVersion: policy.schemaVersion,
    cycle: policy.cycle,
    packageId: pkg?.packageId ?? null,
    classification,
    controls
  });
}
