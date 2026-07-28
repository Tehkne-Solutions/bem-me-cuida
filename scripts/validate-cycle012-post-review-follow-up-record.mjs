import fs from 'node:fs';

const policyPath = new URL('../governance/cycle-0.12/post-review-follow-up-record-validation-policy.json', import.meta.url);
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

export function validateFollowUpRecord({
  record,
  records = [],
  currentFollowUpPackageId,
  currentFollowUpPackageValidationCommit,
  followUpPackageClassification
}) {
  if (!record) return result('source-record-missing');

  const serialized = JSON.stringify(record);
  if (policy.forbiddenTokens.some((token) => serialized.includes(token))) {
    return result('forbidden-operational-content');
  }

  if (record.artifactType !== 'post-review-follow-up-record') {
    return result('invalid-record-reference');
  }
  if (record.references?.followUpPackageId !== currentFollowUpPackageId) {
    return result('invalid-record-reference');
  }
  if (record.references?.followUpPackageValidationCommit !== currentFollowUpPackageValidationCommit) {
    return result('stale-follow-up-package-validation');
  }
  if (followUpPackageClassification !== 'current-and-compatible') {
    return result('stale-follow-up-package-validation');
  }

  if (policy.requiredSections.some((section) => record[section] == null)) {
    return result('incomplete-record');
  }

  if (!Array.isArray(record.itemUpdates) || !Array.isArray(record.evidenceRecords) || !Array.isArray(record.blockers)) {
    return result('incomplete-record');
  }

  for (const update of record.itemUpdates) {
    if (policy.requiredItemUpdateFields.some((field) => update?.[field] == null || update[field] === '')) {
      return result('invalid-item-update');
    }
    if (!policy.allowedItemStatuses.includes(update.status)) return result('invalid-item-update');
  }

  const itemIds = record.itemUpdates.map((item) => item.itemId);
  if (new Set(itemIds).size !== itemIds.length) return result('invalid-item-update');

  const evidenceIds = [];
  for (const evidence of record.evidenceRecords) {
    if (policy.requiredEvidenceFields.some((field) => evidence?.[field] == null || evidence[field] === '')) {
      return result('evidence-divergence');
    }
    if (!itemIds.includes(evidence.itemId)) return result('evidence-divergence');
    evidenceIds.push(evidence.evidenceId);
  }
  if (new Set(evidenceIds).size !== evidenceIds.length) return result('evidence-divergence');

  const blockerIds = [];
  for (const blocker of record.blockers) {
    if (policy.requiredBlockerFields.some((field) => blocker?.[field] == null || blocker[field] === '')) {
      return result('invalid-blocker');
    }
    if (!itemIds.includes(blocker.itemId)) return result('invalid-blocker');
    if (!policy.allowedBlockerStatuses.includes(blocker.status)) return result('invalid-blocker');
    blockerIds.push(blocker.blockerId);
  }
  if (new Set(blockerIds).size !== blockerIds.length) return result('invalid-blocker');

  if (!policy.allowedClosureStatuses.includes(record.closureSummary?.status)) {
    return result('inconsistent-closure');
  }
  const openBlockers = record.blockers.some((blocker) => blocker.status === 'open');
  const unfinishedItems = record.itemUpdates.some(
    (item) => !['completed-administratively', 'not-required'].includes(item.status)
  );
  if (record.closureSummary.status === 'closed-administratively' && (openBlockers || unfinishedItems)) {
    return result('inconsistent-closure');
  }

  const sameRecord = records.filter(
    (candidate) => candidate?.recordIdentity?.recordId === record.recordIdentity?.recordId
  );
  const exact = sameRecord.filter((candidate) => JSON.stringify(candidate) === serialized);
  if (exact.length > 1) return result('duplicate-record');
  if (sameRecord.some((candidate) => JSON.stringify(candidate) !== serialized)) {
    return result('conflicting-record');
  }

  return result('current-and-compatible');
}

function result(classification) {
  return {
    classification,
    compatible: classification === 'current-and-compatible',
    controls: policy.controls
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(`${JSON.stringify(validateFollowUpRecord(input), null, 2)}\n`);
}
