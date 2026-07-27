import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyAttestation, applyRolloutObservation, captureAttestation, captureRolloutObservation,
  evaluateRolloutObservation, validateAttestations, validateProductionArtifacts,
} from './lib/rc011-production-rollout.mjs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sha = '0123456789abcdef0123456789abcdef01234567';
const evidence = 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/123';

let attestations = readJson('release/rc-0.11.0/final-attestations.json');
const roles = ['release-admin', 'qa-lead', 'privacy-security'];
for (const [index, role] of roles.entries()) {
  const item = captureAttestation({ sourceCommit: sha, role, decision: 'approved', evidenceUrl: `${evidence}/${index}`, actor: `reviewer-${index}`, repository: 'Tehkne-Solutions/bem-me-cuida', recordedAt: `2026-07-27T12:0${index}:00.000Z` });
  attestations = applyAttestation({ register: attestations, attestation: item }).register;
}
assert.equal(attestations.status, 'approved');
assert.equal(validateAttestations(attestations).length, 0);
const duplicate = applyAttestation({ register: attestations, attestation: attestations.history[0] });
assert.equal(duplicate.duplicate, true);

let repeatedPrincipal = readJson('release/rc-0.11.0/final-attestations.json');
for (const [index, role] of roles.entries()) {
  repeatedPrincipal = applyAttestation({ register: repeatedPrincipal, attestation: captureAttestation({ sourceCommit: sha, role, decision: 'approved', evidenceUrl: `${evidence}/same-${index}`, actor: 'same-reviewer', repository: 'Tehkne-Solutions/bem-me-cuida', recordedAt: `2026-07-27T13:0${index}:00.000Z` }) }).register;
}
assert.equal(repeatedPrincipal.status, 'pending');
assert(validateAttestations(repeatedPrincipal).includes('attestation_principals_not_distinct'));

let rejected = readJson('release/rc-0.11.0/final-attestations.json');
rejected = applyAttestation({ register: rejected, attestation: captureAttestation({ sourceCommit: sha, role: 'qa-lead', decision: 'rejected', evidenceUrl: evidence, actor: 'qa-rejector', repository: 'Tehkne-Solutions/bem-me-cuida' }) }).register;
assert.equal(rejected.status, 'rejected');

const thresholds = readJson('release/rc-0.11.0/production-rollout.json').thresholds;
const passingObservation = captureRolloutObservation({ sourceCommit: sha, percentage: 1, metrics: { crashFreeSessionsPct: 99.5, syncSuccessPct: 98, authSuccessPct: 99, criticalIncidents: 0, blockingSupportReports: 0 }, evidenceUrl: evidence, recordedAt: '2026-07-27T14:00:00.000Z' });
assert.equal(evaluateRolloutObservation(passingObservation, thresholds).status, 'passed');
let rollout = readJson('release/rc-0.11.0/production-rollout.json');
rollout = applyRolloutObservation({ rollout, observation: passingObservation }).rollout;
assert.equal(rollout.status, 'ready-for-next-stage');
assert.equal(rollout.currentStage, 1);

assert.throws(() => applyRolloutObservation({ rollout: readJson('release/rc-0.11.0/production-rollout.json'), observation: captureRolloutObservation({ sourceCommit: sha, percentage: 5, metrics: passingObservation.metrics, evidenceUrl: evidence }) }), /anteriores/);
const failedObservation = captureRolloutObservation({ sourceCommit: sha, percentage: 5, metrics: { crashFreeSessionsPct: 98.9, syncSuccessPct: 96, authSuccessPct: 99, criticalIncidents: 0, blockingSupportReports: 0 }, evidenceUrl: `${evidence}/failed`, recordedAt: '2026-07-27T15:00:00.000Z' });
const failedRollout = applyRolloutObservation({ rollout, observation: failedObservation }).rollout;
assert.equal(failedRollout.status, 'pause-required');
assert.equal(failedRollout.pause.status, 'required');
assert(failedRollout.stages[1].failures.includes('crash-regression'));
assert(failedRollout.stages[1].failures.includes('sync-regression'));

assert.throws(() => captureRolloutObservation({ sourceCommit: sha, percentage: 10, metrics: passingObservation.metrics, evidenceUrl: 'https://user:pass@example.com/proof' }), /credenciais/);
assert(validateProductionArtifacts(readJson('release/rc-0.11.0/production-artifacts.json')).length > 0);

console.log('Política de ativação e rollout da RC 0.11 aprovada.');
console.log('Tehkné Solutions');
