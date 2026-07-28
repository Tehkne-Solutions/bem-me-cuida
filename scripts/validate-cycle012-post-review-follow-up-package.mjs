import fs from 'node:fs';

const policyPath = new URL('../governance/cycle-0.12/post-review-follow-up-package-validation-policy.json', import.meta.url);
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

export function validateFollowUpPackage({
  package: candidate,
  packages = [],
  currentExecutionRecordId,
  currentExecutionRecordValidationCommit,
  executionRecordClassification
}) {
  if (!candidate) return result('source-package-missing');

  const serialized = JSON.stringify(candidate);
  if (policy.forbiddenTokens.some((token) => serialized.includes(token))) {
    return result('forbidden-operational-content');
  }

  if (candidate.artifactType !== 'post-review-follow-up-package') {
    return result('invalid-package-reference');
  }

  if (candidate.references?.executionRecordId !== currentExecutionRecordId) {
    return result('invalid-package-reference');
  }

  if (candidate.references?.executionRecordValidationCommit !== currentExecutionRecordValidationCommit) {
    return result('stale-execution-record-validation');
  }

  if (executionRecordClassification !== 'current-and-compatible') {
    return result('stale-execution-record-validation');
  }

  if (policy.requiredSections.some((section) => candidate[section] == null)) {
    return result('incomplete-package');
  }

  if (!Array.isArray(candidate.followUpItems) || !Array.isArray(candidate.completionCriteria)) {
    return result('incomplete-package');
  }

  for (const item of candidate.followUpItems) {
    if (policy.requiredItemFields.some((field) => item?.[field] == null || item[field] === '')) {
      return result(item?.owner == null || item.owner === '' ? 'missing-owner' : 'incomplete-package');
    }
    if (!policy.allowedPriorities.includes(item.priority) || !policy.allowedStatuses.includes(item.status)) {
      return result('invalid-priority-or-status');
    }
  }

  const itemIds = candidate.followUpItems.map((item) => item.itemId);
  const criterionIds = candidate.completionCriteria.map((criterion) => criterion.itemId);
  if (new Set(itemIds).size !== itemIds.length || new Set(criterionIds).size !== criterionIds.length) {
    return result('completion-criteria-divergence');
  }
  if (itemIds.some((itemId) => !criterionIds.includes(itemId)) || criterionIds.some((itemId) => !itemIds.includes(itemId))) {
    return result('completion-criteria-divergence');
  }
  if (candidate.followUpItems.some((item) => {
    const criterion = candidate.completionCriteria.find((entry) => entry.itemId === item.itemId);
    return criterion?.completionCriterion !== item.completionCriterion;
  })) {
    return result('completion-criteria-divergence');
  }

  const packageId = candidate.packageIdentity?.packageId;
  const sameIdentity = packages.filter((entry) => entry?.packageIdentity?.packageId === packageId);
  const exact = sameIdentity.filter((entry) => JSON.stringify(entry) === serialized);
  if (exact.length > 1) return result('duplicate-package');
  if (sameIdentity.some((entry) => JSON.stringify(entry) !== serialized)) return result('conflicting-package');

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
  process.stdout.write(`${JSON.stringify(validateFollowUpPackage(input), null, 2)}\n`);
}
