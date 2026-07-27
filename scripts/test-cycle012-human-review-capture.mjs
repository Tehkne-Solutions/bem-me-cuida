import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const generator = join(repoRoot, 'scripts/create-cycle012-review-record.mjs');
const configSource = join(repoRoot, 'release/cycle-0.12.0/review-capture-config.json');

const prepare = () => {
  const root = mkdtempSync(join(tmpdir(), 'bmc-cycle012-review-'));
  const configTarget = join(root, 'release/cycle-0.12.0/review-capture-config.json');
  mkdirSync(dirname(configTarget), { recursive: true });
  cpSync(configSource, configTarget);
  return root;
};

const baseEnv = {
  ...process.env,
  REVIEW_TRACK: 'security',
  REVIEW_VERDICT: 'pass-with-residual-risk',
  REVIEW_EVIDENCE_URL: 'https://github.com/Tehkne-Solutions/bem-me-cuida/pull/42',
  REVIEW_SOURCE_COMMIT: '4f5dbe1daacb93f42a453fbd2c9244137f2d87ea',
  REVIEW_SOURCE_AUTHOR_ID: '100',
  GITHUB_REPOSITORY_ID: '200',
  GITHUB_ACTOR_ID: '300',
  REVIEWED_AT: '2026-07-27T15:00:00.000Z'
};

const validRoot = prepare();
const valid = spawnSync(process.execPath, [generator], { cwd: validRoot, env: baseEnv, encoding: 'utf8' });
assert.equal(valid.status, 0, valid.stderr);
const reviewFiles = readdirSync(join(validRoot, 'release/cycle-0.12.0/reviews'));
assert.equal(reviewFiles.length, 1);
const record = JSON.parse(readFileSync(join(validRoot, 'release/cycle-0.12.0/reviews', reviewFiles[0]), 'utf8'));
assert.equal(record.track, 'security');
assert.equal(record.verdict, 'pass-with-residual-risk');
assert.match(record.reviewerFingerprint, /^sha256:[0-9a-f]{64}$/);
assert.equal(record.controls.authorCannotApproveOwnChange, true);
assert.equal(record.controls.doesNotActivateCycle, true);
assert.equal(record.privacy.containsPersonalData, false);

const duplicate = spawnSync(process.execPath, [generator], { cwd: validRoot, env: baseEnv, encoding: 'utf8' });
assert.notEqual(duplicate.status, 0);
assert.match(duplicate.stderr, /Já existe uma revisão/);

const selfApprovalRoot = prepare();
const selfApproval = spawnSync(process.execPath, [generator], {
  cwd: selfApprovalRoot,
  env: { ...baseEnv, GITHUB_ACTOR_ID: '100' },
  encoding: 'utf8'
});
assert.notEqual(selfApproval.status, 0);
assert.match(selfApproval.stderr, /autor do commit não pode aprovar/);

const insecureRoot = prepare();
const insecure = spawnSync(process.execPath, [generator], {
  cwd: insecureRoot,
  env: { ...baseEnv, REVIEW_EVIDENCE_URL: 'http://localhost/review' },
  encoding: 'utf8'
});
assert.notEqual(insecure.status, 0);
assert.match(insecure.stderr, /HTTPS|local/);

rmSync(validRoot, { recursive: true, force: true });
rmSync(selfApprovalRoot, { recursive: true, force: true });
rmSync(insecureRoot, { recursive: true, force: true });

console.log('Testes da captura humana 0.12.0 aprovados.');
console.log('Tehkné Solutions');
