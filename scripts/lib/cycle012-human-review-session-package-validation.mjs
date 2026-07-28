const blockedControlKeys = [
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

function sorted(value = []) {
  return [...value].sort();
}

function sameList(a, b) {
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}

function containsForbiddenContent(pkg, policy) {
  const serialized = JSON.stringify(pkg).toLowerCase();
  return policy.forbiddenPatterns.some((pattern) => serialized.includes(pattern.toLowerCase()));
}

function sameSemanticPackage(a, b) {
  return a.references?.reviewRecordId === b.references?.reviewRecordId &&
    a.references?.reviewRecordValidationCommit === b.references?.reviewRecordValidationCommit &&
    sameList(a.reviewQuestions, b.reviewQuestions) &&
    sameList(a.reviewChecklist, b.reviewChecklist);
}

export function validateHumanReviewSessionPackage(input, policy) {
  const { pkg, currentReviewRecord, expectedQuestions = [], expectedChecklist = [], siblingPackages = [] } = input;
  let classification = 'current-and-compatible';

  if (!pkg) classification = 'source-package-missing';
  else if (pkg.packageKind !== policy.requiredPackageKind || !pkg.packageId || !pkg.references?.reviewRecordId) {
    classification = 'invalid-package-reference';
  } else if (!currentReviewRecord || pkg.references.reviewRecordId !== currentReviewRecord.recordId) {
    classification = 'invalid-package-reference';
  } else if (pkg.references.reviewRecordValidationCommit !== currentReviewRecord.validationCommit || currentReviewRecord.classification !== policy.requiredSourceClassification) {
    classification = 'stale-source-validation';
  } else if (containsForbiddenContent(pkg, policy)) {
    classification = 'forbidden-operational-content';
  } else if (!sameList(pkg.reviewQuestions, expectedQuestions)) {
    classification = 'questions-divergence';
  } else if (!sameList(pkg.reviewChecklist, expectedChecklist)) {
    classification = 'checklist-divergence';
  } else {
    const duplicates = siblingPackages.filter((candidate) => candidate.packageId !== pkg.packageId && sameSemanticPackage(candidate, pkg));
    const conflicts = siblingPackages.filter((candidate) => candidate.packageId !== pkg.packageId && candidate.references?.reviewRecordId === pkg.references.reviewRecordId && !sameSemanticPackage(candidate, pkg));
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
