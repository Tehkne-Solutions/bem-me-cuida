import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const app = JSON.parse(readFileSync(join(root, 'apps/mobile/app.json'), 'utf8'));
const eas = JSON.parse(readFileSync(join(root, 'apps/mobile/eas.json'), 'utf8'));
const rcNumber = process.env.EXPO_PUBLIC_RELEASE_CANDIDATE?.trim()
  || eas?.build?.rc?.env?.EXPO_PUBLIC_RELEASE_CANDIDATE
  || '2';
const artifactUrl = process.env.RELEASE_ARTIFACT_URL?.trim() || null;
const artifactSha256 = process.env.RELEASE_ARTIFACT_SHA256?.trim() || null;
const buildNumber = process.env.RELEASE_BUILD_NUMBER?.trim() || null;

const errors = [];
if (artifactUrl && !artifactUrl.startsWith('https://')) errors.push('RELEASE_ARTIFACT_URL deve usar HTTPS.');
if (artifactSha256 && !/^[A-Fa-f0-9]{64}$/.test(artifactSha256)) errors.push('RELEASE_ARTIFACT_SHA256 deve conter 64 caracteres hexadecimais.');
if (!/^\d+$/.test(String(rcNumber))) errors.push('EXPO_PUBLIC_RELEASE_CANDIDATE deve ser numérica.');

if (errors.length) {
  console.error('Manifesto não gerado:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const version = app.expo.version;
const manifest = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  release: {
    version,
    rcNumber: Number(rcNumber),
    label: `${version}-rc.${rcNumber}`,
    variant: 'rc',
    channel: eas.build.rc.channel,
    distribution: eas.build.rc.distribution,
  },
  android: {
    package: 'com.tehknesolutions.bemmecuida.rc',
    profile: 'rc',
    buildNumber,
    artifactUrl,
    artifactSha256,
  },
  controls: {
    promotionAuthority: 'Supabase RPC operator_promote_release',
    requiresOperatorRole: true,
    requiresAllMandatoryGates: true,
    requiresAvailableAndroidBuild: true,
    blocksUrgentOrBlockingFeedback: true,
  },
};

const json = `${JSON.stringify(manifest, null, 2)}\n`;
const output = process.env.RELEASE_MANIFEST_OUTPUT?.trim();
if (output) {
  const target = resolve(root, output);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, json, 'utf8');
  console.log(`Manifesto salvo em ${target}`);
} else {
  process.stdout.write(json);
}
