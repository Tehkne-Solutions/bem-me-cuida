import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RC011_INFRASTRUCTURE_PATH,
  RC011_TEMPORARY_SECRETS,
  buildTransitionReport,
  validateEvidencePr,
  validateRevocation,
} from './lib/rc011-release-transition.mjs';

const mergedPr = {
  number: 31,
  state: 'MERGED',
  isDraft: false,
  baseRefName: 'main',
  mergeCommit: { oid: '0123456789abcdef0123456789abcdef01234567' },
  files: [{ path: RC011_INFRASTRUCTURE_PATH }],
  url: 'https://github.com/Tehkne-Solutions/bem-me-cuida/pull/31',
};

const evidencePr = validateEvidencePr(mergedPr);
assert.equal(evidencePr.number, 31);
assert.equal(evidencePr.files.length, 1);
assert.throws(() => validateEvidencePr({ ...mergedPr, state: 'OPEN' }), /mesclado/);
assert.throws(
  () => validateEvidencePr({ ...mergedPr, files: [...mergedPr.files, { path: 'README.md' }] }),
  /somente/,
);

const revocation = validateRevocation({
  confirmedAbsent: true,
  secretNames: [...RC011_TEMPORARY_SECRETS],
});
assert.equal(revocation.confirmedAbsent, true);
assert.throws(
  () => validateRevocation({ confirmedAbsent: false, secretNames: [...RC011_TEMPORARY_SECRETS] }),
  /não foi confirmada/,
);

const finalReport = buildTransitionReport({
  mode: 'finalize-and-build',
  sourceCommit: mergedPr.mergeCommit.oid,
  evidencePr,
  revocation,
  buildAuthorized: true,
});
assert.equal(finalReport.recommendation, 'validate-and-build-android');
assert.equal(finalReport.privacy.containsSecretValues, false);
assert.deepEqual(finalReport.revocation.secretNames.sort(), [...RC011_TEMPORARY_SECRETS].sort());

const outputDir = mkdtempSync(join(tmpdir(), 'rc011-release-transition-'));
const prPath = join(outputDir, 'pr.json');
const revocationPath = join(outputDir, 'revocation.json');
const outputJson = join(outputDir, 'report.json');
const outputMd = join(outputDir, 'report.md');
writeFileSync(prPath, JSON.stringify(mergedPr), 'utf8');
writeFileSync(revocationPath, JSON.stringify({ confirmedAbsent: true, secretNames: RC011_TEMPORARY_SECRETS }), 'utf8');

const execution = spawnSync(
  process.execPath,
  [
    'scripts/generate-rc011-release-transition-report.mjs',
    '--mode',
    'finalize-and-build',
    '--source-commit',
    mergedPr.mergeCommit.oid,
    '--evidence-pr-json',
    prPath,
    '--revocation-json',
    revocationPath,
    '--build-authorized',
    'true',
    '--output-json',
    outputJson,
    '--output-md',
    outputMd,
  ],
  { cwd: process.cwd(), encoding: 'utf8' },
);
assert.equal(execution.status, 0, execution.stderr);
const generatedJson = readFileSync(outputJson, 'utf8');
const generatedMd = readFileSync(outputMd, 'utf8');
assert.match(generatedJson, /validate-and-build-android/);
assert.match(generatedMd, /Ausência confirmada/);
assert.match(generatedMd, /Tehkné Solutions/);
assert.equal(generatedJson.includes('token-value'), false);

console.log('Transição pós-evidências RC 0.11 aprovada.');
console.log('PR, revogação e autorização do Android permanecem estritamente encadeados.');
console.log('Tehkné Solutions');
