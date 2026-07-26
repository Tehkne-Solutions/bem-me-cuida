import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const value = (name) => process.env[name]?.trim() ?? '';
const output = value('HOTFIX_MANIFEST_OUTPUT') || 'artifacts/hotfix-manifest.json';
const required = [
  'OTA_HOTFIX_ID',
  'OTA_APPROVAL_ID',
  'OTA_RUNTIME_VERSION',
  'OTA_CHANNEL',
  'OTA_MESSAGE',
  'OTA_FINGERPRINT_SHA256',
  'OTA_SOURCE_COMMIT',
];
const missing = required.filter((name) => !value(name));
if (missing.length) {
  console.error(`Variáveis ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

function fileSha256(path) {
  return createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
}

const manifest = {
  schema: 'bemmecuida-hotfix-manifest/1.0',
  generatedAt: new Date().toISOString(),
  product: 'BemMeCuida',
  signature: 'Tehkné Solutions',
  hotfix: {
    id: value('OTA_HOTFIX_ID'),
    approvalId: value('OTA_APPROVAL_ID'),
    version: value('HOTFIX_VERSION') || '0.10.1',
    kind: value('HOTFIX_KIND') || 'ota',
    severity: value('HOTFIX_SEVERITY') || 'high',
    sourceCommit: value('OTA_SOURCE_COMMIT').toLowerCase(),
    runtimeVersion: value('OTA_RUNTIME_VERSION'),
    channel: value('OTA_CHANNEL'),
    message: value('OTA_MESSAGE'),
    fingerprintSha256: value('OTA_FINGERPRINT_SHA256').toLowerCase(),
    assetCount: Number(value('OTA_ASSET_COUNT') || '0'),
    rolloutPercentage: Number(value('OTA_ROLLOUT_PERCENTAGE') || '5'),
    nativeChanges: false,
  },
  eas: {
    validatedGroupId: value('OTA_VALIDATED_GROUP_ID') || null,
    publishedGroupId: value('OTA_PUBLISHED_GROUP_ID') || null,
    rollbackGroupId: value('OTA_ROLLBACK_GROUP_ID') || null,
  },
  controls: {
    fourEyesApproval: true,
    sameRuntimeRequired: true,
    validationChannelRequired: true,
    productionEnvironmentApprovalRequired: true,
    rollbackPrepared: Boolean(value('OTA_ROLLBACK_GROUP_ID')),
  },
  documentHashes: {
    runbookSha256: fileSha256('docs/HOTFIX-AND-OTA-RUNBOOK.md'),
    retentionPolicySha256: fileSha256('docs/AUDIT-RETENTION.md'),
    adrSha256: fileSha256('docs/ADR-016-hotfix-ota-four-eyes-retention.md'),
  },
};

mkdirSync(dirname(join(root, output)), { recursive: true });
writeFileSync(join(root, output), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Manifesto de hotfix gerado em ${output}.`);
