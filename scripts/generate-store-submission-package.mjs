import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function required(key) {
  const value = process.env[key]?.trim();
  if (!value || /SUBSTITUA|example\.com/i.test(value)) throw new Error(`${key} ausente ou inválida.`);
  return value;
}

function validateArtifact(label, url, checksum) {
  if (!url.startsWith('https://')) throw new Error(`${label}: URL do artefato deve usar HTTPS.`);
  if (!/^[a-fA-F0-9]{64}$/.test(checksum)) throw new Error(`${label}: SHA-256 inválido.`);
}

const app = JSON.parse(read('apps/mobile/app.json'));
const android = {
  buildNumber: required('ANDROID_BUILD_NUMBER'),
  artifactUrl: required('ANDROID_ARTIFACT_URL'),
  artifactSha256: required('ANDROID_ARTIFACT_SHA256').toLowerCase(),
};
validateArtifact('Android', android.artifactUrl, android.artifactSha256);

const iosUrl = process.env.IOS_ARTIFACT_URL?.trim();
const iosChecksum = process.env.IOS_ARTIFACT_SHA256?.trim().toLowerCase();
const iosBuildNumber = process.env.IOS_BUILD_NUMBER?.trim();
const ios = iosUrl || iosChecksum || iosBuildNumber
  ? {
      buildNumber: iosBuildNumber || (() => { throw new Error('IOS_BUILD_NUMBER ausente.'); })(),
      artifactUrl: iosUrl || (() => { throw new Error('IOS_ARTIFACT_URL ausente.'); })(),
      artifactSha256: iosChecksum || (() => { throw new Error('IOS_ARTIFACT_SHA256 ausente.'); })(),
    }
  : null;
if (ios) validateArtifact('iOS', ios.artifactUrl, ios.artifactSha256);

const documents = [
  'docs/STORE-LISTING-PT-BR.md',
  'docs/DATA-SAFETY-MATRIX.md',
  'docs/STORE-READINESS.md',
  'docs/STORE-SUBMISSION-PACKAGE.md',
  'docs/PRODUCTION-RELEASE-01.md',
  'docs/INCIDENT-RESPONSE.md',
  'docs/POST-RELEASE-MONITORING.md',
];

const output = process.env.STORE_PACKAGE_OUTPUT?.trim()
  || `artifacts/bemmecuida-${app.expo.version}-production-1.json`;

const payload = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  signature: 'Tehkné Solutions',
  appVersion: app.expo.version,
  productionRelease: 1,
  generatedAt: new Date().toISOString(),
  legal: {
    supportUrl: required('PRODUCTION_SUPPORT_URL'),
    privacyUrl: required('PRODUCTION_PRIVACY_URL'),
    termsUrl: required('PRODUCTION_TERMS_URL'),
  },
  artifacts: {
    android,
    ...(ios ? { ios } : {}),
  },
  documents: documents.map((path) => ({ path, sha256: sha256(read(path)) })),
  controls: {
    rolloutSequence: [1, 5, 10, 25, 50, 100],
    minimumCrashFreeSessionsPct: 99,
    minimumSyncSuccessPct: 97,
    minimumAuthSuccessPct: 98,
    criticalIncidentsAllowed: 0,
    personalOrEmotionalContentInHealthSnapshots: false,
  },
};

mkdirSync(dirname(join(root, output)), { recursive: true });
writeFileSync(join(root, output), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Pacote de submissão gerado em ${output}`);
