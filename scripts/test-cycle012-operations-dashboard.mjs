import assert from 'node:assert/strict';
import { buildOperationsSnapshot, parseOperationsCommand, renderOperationsMarkdown } from './lib/cycle012-operations-dashboard.mjs';

const commit = 'a'.repeat(40);
const config = {
  commands: { prefix: '/cycle012', allowed: ['status', 'reviews', 'blockers', 'gates'], exactMatchRequired: true, freeTextAllowed: false },
  controls: {
    readOnly: true,
    doesNotActivateCycle: true,
    doesNotAuthorizeMigrations: true,
    doesNotAuthorizeImplementation: true,
    doesNotMergePullRequests: true,
    doesNotPublishBuilds: true,
    doesNotDeleteEnvironments: true,
  },
};

assert.equal(parseOperationsCommand('/cycle012 status', config), 'status');
assert.equal(parseOperationsCommand('  /cycle012 reviews  ', config), 'reviews');
assert.throws(() => parseOperationsCommand('/cycle012 status agora', config));
assert.throws(() => parseOperationsCommand('/cycle012 activate', config));
assert.throws(() => parseOperationsCommand('/cycle012 status\ntexto', config));

const blockedExternal = {
  sourceClosure: { status: 'blocked', evidenceUrl: null },
  cleanup: { status: 'pending', temporaryEnvironments: [] },
  feedback: { status: 'pending', evidenceUrl: null },
  scope: { approval: { status: 'pending', evidenceUrl: null } },
  migrationPlan: { approval: { status: 'pending', evidenceUrl: null } },
};
const completeExternal = {
  sourceClosure: { status: 'closed', evidenceUrl: 'https://example.com/closure' },
  cleanup: { status: 'completed', temporaryEnvironments: [{ evidenceUrl: 'https://example.com/cleanup' }] },
  feedback: { status: 'approved', evidenceUrl: 'https://example.com/feedback' },
  scope: { approval: { status: 'approved', evidenceUrl: 'https://example.com/scope' } },
  migrationPlan: { approval: { status: 'approved', evidenceUrl: 'https://example.com/migrations' } },
};
const reviewer = (digit) => `sha256:${digit.repeat(64)}`;
const records = [
  ['architecture', reviewer('1'), 'pass'],
  ['security', reviewer('2'), 'pass'],
  ['privacy', reviewer('3'), 'pass'],
  ['accessibility', reviewer('1'), 'pass-with-residual-risk'],
  ['database', reviewer('2'), 'pass'],
].map(([track, reviewerFingerprint, verdict]) => ({ track, reviewerFingerprint, verdict, sourceCommit: commit }));

const makeSnapshot = (reviewRecords, external) => buildOperationsSnapshot({
  sourceCommit: commit,
  records: reviewRecords,
  config,
  ...external,
  generatedAt: '2026-07-27T12:00:00.000Z',
});

const incomplete = makeSnapshot([], blockedExternal);
assert.equal(incomplete.status, 'review-incomplete');
assert.equal(incomplete.recommendation, 'hold');
assert.equal(incomplete.activationAllowed, false);
assert.equal(incomplete.summary.passingTrackCount, 0);
assert.equal(incomplete.blockers.length > 0, true);

const reviewedButBlocked = makeSnapshot(records, blockedExternal);
assert.equal(reviewedButBlocked.status, 'review-complete-external-blocked');
assert.equal(reviewedButBlocked.reviews.reviewPackageComplete, true);
assert.equal(reviewedButBlocked.summary.externalGatesComplete, false);
assert.equal(reviewedButBlocked.activationAllowed, false);

const readyForProposal = makeSnapshot(records, completeExternal);
assert.equal(readyForProposal.status, 'ready-for-human-proposal');
assert.equal(readyForProposal.recommendation, 'prepare-human-proposal');
assert.equal(readyForProposal.blockers.length, 0);
assert.equal(readyForProposal.activationAllowed, false);
assert.equal(JSON.stringify(readyForProposal).includes('reviewerFingerprint'), false);
assert.equal(JSON.stringify(readyForProposal).includes(reviewer('1')), false);

for (const command of ['status', 'reviews', 'blockers', 'gates']) {
  const markdown = renderOperationsMarkdown(readyForProposal, command);
  assert.match(markdown, /Tehkné Solutions/);
  assert.match(markdown, /Ativação automática.*false/);
  assert.equal(markdown.includes('reviewerFingerprint'), false);
  assert.equal(markdown.includes(reviewer('1')), false);
}

console.log('Testes do painel operacional 0.12.0 aprovados.');
console.log('Tehkné Solutions');
