import assert from 'node:assert/strict';
import {
  applyHealthSnapshot, applyIncidentCapture, assertHttpsUrl, createHealthSnapshot, createIncidentCapture,
  createPostReleaseDecision, proposeCycleClosure,
} from './lib/rc011-post-release-observability.mjs';

const sha = '0123456789abcdef0123456789abcdef01234567';
const evidence = 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/100';
const healthBase = {
  schemaVersion: '1.0', product: 'BemMeCuida', release: '0.11.0', status: 'blocked-awaiting-release', sourceCommit: null,
  latestSnapshot: null, snapshots: [], checkpoints: { '24h': { status: 'pending' }, '72h': { status: 'pending' }, '7d': { status: 'pending' } },
};
const incidentsBase = { schemaVersion: '1.0', release: '0.11.0', status: 'monitoring-not-started', summary: {}, incidents: [] };
const healthy = (window, generatedAt) => createHealthSnapshot({
  sourceCommit: sha, window, crashFreePct: 99.7, syncSuccessPct: 98.2, authSuccessPct: 99.1, notificationSuccessPct: 97,
  sampleSize: 500, criticalIncidents: 0, openSev2: 0, blockingSupportReports: 0, evidenceUrl: evidence, generatedAt,
});
let health = applyHealthSnapshot(healthBase, healthy('24h', '2026-07-28T12:00:00.000Z'));
health = applyHealthSnapshot(health, healthy('72h', '2026-07-30T12:00:00.000Z'));
health = applyHealthSnapshot(health, healthy('7d', '2026-08-03T12:00:00.000Z'));
assert.equal(health.checkpoints['24h'].status, 'passed');
assert.equal(health.checkpoints['72h'].status, 'passed');
assert.equal(health.checkpoints['7d'].status, 'passed');
assert.equal(health.snapshots.length, 3);
health = applyHealthSnapshot(health, healthy('7d', '2026-08-03T12:00:00.000Z'));
assert.equal(health.snapshots.length, 3, 'snapshot idempotente não deve duplicar');

const degraded = createHealthSnapshot({
  sourceCommit: sha, window: 'rolling', crashFreePct: 98, syncSuccessPct: 99, authSuccessPct: 99, notificationSuccessPct: 99,
  sampleSize: 500, criticalIncidents: 0, openSev2: 0, blockingSupportReports: 0, evidenceUrl: evidence,
});
assert.equal(degraded.recommendation, 'pause-required');
const critical = createHealthSnapshot({
  sourceCommit: sha, window: 'rolling', crashFreePct: 100, syncSuccessPct: 100, authSuccessPct: 100, notificationSuccessPct: 100,
  sampleSize: 500, criticalIncidents: 1, openSev2: 0, blockingSupportReports: 0, evidenceUrl: evidence,
});
assert.equal(critical.recommendation, 'rollback-review');

let incidents = applyIncidentCapture(incidentsBase, createIncidentCapture({
  sourceCommit: sha, incidentId: 'BMC-SEV2-001', severity: 'sev2', status: 'open', platform: 'android', impact: 'synchronization', action: 'pause', evidenceUrl: evidence,
}));
assert.equal(incidents.status, 'pause-required');
assert.equal(incidents.summary.openSev2, 1);
incidents = applyIncidentCapture(incidents, createIncidentCapture({
  sourceCommit: sha, incidentId: 'BMC-SEV2-001', severity: 'sev2', status: 'resolved', platform: 'android', impact: 'synchronization', action: 'resolved', evidenceUrl: evidence,
}));
assert.equal(incidents.status, 'monitoring');
assert.equal(incidents.summary.openSev2, 0);
assert.equal(incidents.incidents.length, 1);

const publication = { status: 'published', githubRelease: { status: 'published' } };
const rollout = { status: 'completed' };
const backlog = { targetVersion: '0.12.0', status: 'draft' };
const decision = createPostReleaseDecision({ publication, rollout, health, incidents, closure: { status: 'blocked' }, backlog });
assert.equal(decision.recommendation, 'ready-to-close-cycle');
const proposal = proposeCycleClosure({ sourceCommit: sha, publication, rollout, health, incidents, backlog, evidenceUrl: evidence });
assert.equal(proposal.status, 'ready-for-human-closure');
assert.equal(proposal.controls.doesNotCloseAutomatically, true);

const waiting = createPostReleaseDecision({ publication: { status: 'pending' }, rollout: { status: 'pending' }, health: healthBase, incidents: incidentsBase, closure: { status: 'blocked' }, backlog });
assert.equal(waiting.recommendation, 'await-release');
assert.throws(() => assertHttpsUrl('https://user:pass@example.com/evidence'), /credenciais/);
assert.throws(() => createIncidentCapture({ sourceCommit: sha, incidentId: 'x', severity: 'sev1', status: 'open', platform: 'all', impact: 'other', action: 'pause', evidenceUrl: evidence }), /incidentId/);
console.log('Observabilidade pós-release da RC 0.11 aprovada.');
console.log('Tehkné Solutions');
