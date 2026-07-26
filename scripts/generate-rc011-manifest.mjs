import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const text = (name) => String(process.env[name] ?? '').trim();
const requiredIos = text('RC011_REQUIRE_IOS').toLowerCase() !== 'false';
const eas = JSON.parse(readFileSync(join(root, 'apps/mobile/eas.json'), 'utf8'));
const matrixPath = text('RC011_DEVICE_MATRIX_PATH') || 'release/rc-0.11.0/device-matrix.json';
const testsPath = text('RC011_TEST_RESULTS_PATH') || 'release/rc-0.11.0/test-results.json';

function fileDigest(path) {
  return createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
}

function artifact(prefix, required) {
  const value = {
    buildId: text(`${prefix}_BUILD_ID`) || null,
    buildNumber: text(`${prefix}_BUILD_NUMBER`) || null,
    artifactUrl: text(`${prefix}_ARTIFACT_URL`) || null,
    artifactSha256: text(`${prefix}_ARTIFACT_SHA256`) || null,
  };
  const errors = [];
  const any = Object.values(value).some(Boolean);
  if (!required && !any) return { value: null, errors };
  if (!value.buildId) errors.push(`${prefix}_BUILD_ID ausente.`);
  if (!/^\d+$/.test(value.buildNumber ?? '')) errors.push(`${prefix}_BUILD_NUMBER inválido.`);
  if (!String(value.artifactUrl ?? '').startsWith('https://')) errors.push(`${prefix}_ARTIFACT_URL deve usar HTTPS.`);
  if (!/^[a-f0-9]{64}$/i.test(value.artifactSha256 ?? '')) errors.push(`${prefix}_ARTIFACT_SHA256 inválido.`);
  return { value, errors };
}

const android = artifact('RC011_ANDROID', true);
const ios = artifact('RC011_IOS', requiredIos);
const errors = [...android.errors, ...ios.errors];
if (!/^[a-f0-9]{40}$/i.test(text('CYCLE_SOURCE_COMMIT'))) errors.push('CYCLE_SOURCE_COMMIT deve ser um SHA Git válido.');
if (!text('CYCLE_EVIDENCE_URL').startsWith('https://')) errors.push('CYCLE_EVIDENCE_URL deve usar HTTPS.');
if (errors.length) {
  console.error('Manifesto RC 0.11.0 não gerado:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const manifest = {
  schemaVersion: '2.0',
  product: 'BemMeCuida',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  release: {
    version: '0.11.0',
    candidate: 1,
    label: '0.11.0-rc.1',
    variant: 'rc011',
    channel: eas.build.rc011.channel,
    runtimeVersion: '0.11.0',
    distribution: eas.build.rc011.distribution,
    sourceCommit: text('CYCLE_SOURCE_COMMIT'),
    cycleEvidenceUrl: text('CYCLE_EVIDENCE_URL'),
  },
  identifiers: {
    androidPackage: 'com.tehknesolutions.bemmecuida.rc011',
    iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.rc011',
    scheme: 'bemmecuida-rc011',
  },
  artifacts: {
    android: android.value,
    ios: ios.value,
  },
  validation: {
    deviceMatrixPath: matrixPath,
    deviceMatrixSha256: fileDigest(matrixPath),
    testResultsPath: testsPath,
    testResultsSha256: fileDigest(testsPath),
    upgradeFromVersion: '0.10.0',
    otaRuntimeVersion: '0.11.0',
    otaChannel: 'rc-0-11',
  },
  controls: {
    requiresCycleGates: true,
    requiresIndependentApproval: true,
    requiresPhysicalDeviceEvidence: true,
    requiresUpgradeRegression: true,
    requiresLocalDatabaseIntegrity: true,
    requiresOtaCompatibility: true,
    containsSecrets: false,
    containsPersonalData: false,
    containsClinicalData: false,
  },
};

const output = text('RC011_MANIFEST_OUTPUT') || 'artifacts/bemmecuida-0.11.0-rc.1.json';
const target = resolve(root, output);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Manifesto da RC salvo em ${target}`);
