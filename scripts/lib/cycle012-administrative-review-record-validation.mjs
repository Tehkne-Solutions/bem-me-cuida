function sameRecord(a, b) {
  return a.packageId === b.packageId &&
    a.packageValidationCommit === b.packageValidationCommit &&
    a.decision === b.decision &&
    a.reviewer === b.reviewer;
}

export function validateAdministrativeReviewRecord(input, policy) {
  const { record, currentPackage, siblingRecords = [] } = input;
  let classification = 'current-and-compatible';

  if (!record) classification = 'source-record-missing';
  else if (record.recordKind !== policy.requiredRecordKind || !record.recordId || !record.packageId) {
    classification = 'invalid-record-reference';
  } else if (!currentPackage || record.packageId !== currentPackage.packageId) {
    classification = 'invalid-record-reference';
  } else if (record.packageValidationCommit !== currentPackage.validationCommit || currentPackage.classification !== policy.requiredPackageClassification) {
    classification = 'stale-package-validation';
  } else if (record.decision !== policy.requiredDecision) {
    classification = 'record-classification-mismatch';
  } else {
    const duplicates = siblingRecords.filter((candidate) => candidate.recordId !== record.recordId && sameRecord(candidate, record));
    const conflicts = siblingRecords.filter((candidate) => candidate.recordId !== record.recordId && candidate.packageId === record.packageId && !sameRecord(candidate, record));
    if (duplicates.length) classification = 'duplicate-record';
    else if (conflicts.length) classification = 'conflicting-record';
  }

  if (policy.reviewMustRemainManual !== true || policy.operationalActionsRemainBlocked !== true) {
    throw new Error('unsafe-policy');
  }

  return Object.freeze({
    schemaVersion: policy.schemaVersion,
    cycle: policy.cycle,
    recordId: record?.recordId ?? null,
    classification,
    reviewMustRemainManual: true,
    operationalActionsRemainBlocked: true
  });
}
