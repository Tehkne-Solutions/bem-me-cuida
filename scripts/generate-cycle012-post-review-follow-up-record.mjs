import fs from 'node:fs';

const policyPath = new URL('../governance/cycle-0.12/post-review-follow-up-record-policy.json', import.meta.url);
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

export function generateFollowUpRecord(input) {
  if (input.followUpPackageClassification !== policy.sourcePackageClassificationRequired) {
    throw new Error('follow-up package must be current-and-compatible');
  }

  const record = {
    artifactType: policy.artifactType,
    schemaVersion: policy.version,
    recordIdentity: input.recordIdentity,
    itemUpdates: normalize(input.itemUpdates),
    evidenceRecords: normalize(input.evidenceRecords),
    blockers: normalize(input.blockers),
    closureSummary: input.closureSummary,
    references: input.references,
    controls: policy.controls
  };

  validate(record);
  return deepFreeze(sortObject(record));
}

function validate(record) {
  const serialized = JSON.stringify(record);
  if (policy.forbiddenTokens.some((token) => serialized.includes(token))) {
    throw new Error('forbidden operational content');
  }
  for (const section of policy.requiredSections) {
    if (record[section] == null) throw new Error(`missing section: ${section}`);
  }
  for (const update of record.itemUpdates) {
    for (const field of policy.requiredItemUpdateFields) {
      if (!update[field]) throw new Error(`missing item update field: ${field}`);
    }
    if (!policy.allowedItemStatuses.includes(update.status)) throw new Error('invalid item status');
  }
  for (const evidence of record.evidenceRecords) {
    for (const field of policy.requiredEvidenceFields) {
      if (!evidence[field]) throw new Error(`missing evidence field: ${field}`);
    }
  }
  for (const blocker of record.blockers) {
    if (!blocker.blockerId || !blocker.itemId || !blocker.status || !blocker.summary) throw new Error('invalid blocker');
    if (!policy.allowedBlockerStatuses.includes(blocker.status)) throw new Error('invalid blocker status');
  }
}

function normalize(items = []) {
  return [...items].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(`${JSON.stringify(generateFollowUpRecord(input), null, 2)}\n`);
}
