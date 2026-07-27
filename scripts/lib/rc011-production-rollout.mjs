import { createHash } from 'node:crypto';

export const REQUIRED_ATTESTATION_ROLES = ['release-admin', 'qa-lead', 'privacy-security'];
export const ROLLOUT_STAGES = [1, 5, 10, 25, 50, 100];
export const ROLLOUT_REASON_CODES = ['crash-regression', 'sync-regression', 'auth-regression', 'critical-incident', 'support-blocker', 'manual-safety'];

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;

export function assertHttpsEvidence(value, label = 'Evidência') {
  if (!HTTPS_PATTERN.test(String(value ?? ''))) throw new Error(`${label} deve usar HTTPS.`);
  const url = new URL(value);
  if (url.username || url.password) throw new Error(`${label} não pode conter credenciais.`);
}

export function assertSourceCommit(value) {
  if (!SHA_PATTERN.test(String(value ?? ''))) throw new Error('O commit de origem deve ter 40 caracteres hexadecimais.');
}

export function assertBaseDocument(document, label) {
  if (document?.release !== '0.11.0' && document?.candidate !== '0.11.0-rc.1') throw new Error(`${label} não referencia a release correta.`);
  if (document?.generatedBy !== 'Tehkné Solutions') throw new Error(`${label} sem assinatura Tehkné Solutions.`);
  if (document?.privacy?.containsPersonalData !== false || document?.privacy?.containsClinicalData !== false) {
    throw new Error(`${label} precisa declarar ausência de dados pessoais e clínicos.`);
  }
}

export function principalFingerprint(actor, repository, sourceCommit) {
  if (!actor || !repository) throw new Error('Ator e repositório são obrigatórios para a atestação.');
  assertSourceCommit(sourceCommit);
  return createHash('sha256').update(`${repository.toLowerCase()}|${actor.toLowerCase()}|${sourceCommit.toLowerCase()}`).digest('hex');
}

export function captureAttestation({ sourceCommit, role, decision, evidenceUrl, actor, repository, recordedAt = new Date().toISOString() }) {
  assertSourceCommit(sourceCommit);
  if (!REQUIRED_ATTESTATION_ROLES.includes(role)) throw new Error('Papel de atestação inválido.');
  if (!['approved', 'rejected'].includes(decision)) throw new Error('Decisão de atestação inválida.');
  assertHttpsEvidence(evidenceUrl);
  return {
    schemaVersion: '1.0', release: '0.11.0', candidate: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions',
    privacy: { containsPersonalData: false, containsClinicalData: false, storesReviewerFingerprintOnly: true },
    sourceCommit: sourceCommit.toLowerCase(), role, decision, principalFingerprint: principalFingerprint(actor, repository, sourceCommit), evidenceUrl, recordedAt,
  };
}

export function applyAttestation({ register, attestation }) {
  assertBaseDocument(register, 'Registro de atestações');
  assertBaseDocument(attestation, 'Atestação');
  if (!REQUIRED_ATTESTATION_ROLES.includes(attestation.role)) throw new Error('Papel de atestação inválido.');
  if (!['approved', 'rejected'].includes(attestation.decision)) throw new Error('Decisão de atestação inválida.');
  assertSourceCommit(attestation.sourceCommit);
  assertHttpsEvidence(attestation.evidenceUrl);
  if (!HASH_PATTERN.test(attestation.principalFingerprint ?? '')) throw new Error('Fingerprint do responsável inválido.');
  if (register.sourceCommit && register.sourceCommit !== attestation.sourceCommit) throw new Error('A atestação referencia outro commit.');

  const next = structuredClone(register);
  next.sourceCommit = attestation.sourceCommit;
  next.history ??= [];
  const duplicate = next.history.some((item) => item.role === attestation.role && item.principalFingerprint === attestation.principalFingerprint && item.recordedAt === attestation.recordedAt);
  if (!duplicate) next.history.push(attestation);
  next.attestations[attestation.role] = {
    status: attestation.decision,
    principalFingerprint: attestation.principalFingerprint,
    evidenceUrl: attestation.evidenceUrl,
    recordedAt: attestation.recordedAt,
  };

  const current = REQUIRED_ATTESTATION_ROLES.map((role) => next.attestations[role]);
  const approved = current.filter((item) => item?.status === 'approved');
  const rejected = current.some((item) => item?.status === 'rejected');
  const distinct = new Set(approved.map((item) => item.principalFingerprint)).size === approved.length;
  next.status = rejected ? 'rejected' : approved.length === REQUIRED_ATTESTATION_ROLES.length && distinct ? 'approved' : 'pending';
  next.updatedAt = new Date().toISOString();
  return { register: next, duplicate };
}

export function captureRolloutObservation({ sourceCommit, percentage, metrics, evidenceUrl, recordedAt = new Date().toISOString() }) {
  assertSourceCommit(sourceCommit);
  const stage = Number(percentage);
  if (!ROLLOUT_STAGES.includes(stage)) throw new Error('Percentual de rollout inválido.');
  assertHttpsEvidence(evidenceUrl);
  const normalized = {
    crashFreeSessionsPct: Number(metrics.crashFreeSessionsPct),
    syncSuccessPct: Number(metrics.syncSuccessPct),
    authSuccessPct: Number(metrics.authSuccessPct),
    criticalIncidents: Number(metrics.criticalIncidents),
    blockingSupportReports: Number(metrics.blockingSupportReports),
  };
  for (const name of ['crashFreeSessionsPct', 'syncSuccessPct', 'authSuccessPct']) {
    if (!Number.isFinite(normalized[name]) || normalized[name] < 0 || normalized[name] > 100) throw new Error(`${name} deve estar entre 0 e 100.`);
  }
  for (const name of ['criticalIncidents', 'blockingSupportReports']) {
    if (!Number.isInteger(normalized[name]) || normalized[name] < 0) throw new Error(`${name} deve ser inteiro não negativo.`);
  }
  return {
    schemaVersion: '1.0', release: '0.11.0', candidate: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions',
    privacy: { containsPersonalData: false, containsClinicalData: false },
    sourceCommit: sourceCommit.toLowerCase(), percentage: stage, metrics: normalized, evidenceUrl, recordedAt,
  };
}

export function evaluateRolloutObservation(observation, thresholds) {
  const failures = [];
  if (observation.metrics.crashFreeSessionsPct < thresholds.minimumCrashFreeSessionsPct) failures.push('crash-regression');
  if (observation.metrics.syncSuccessPct < thresholds.minimumSyncSuccessPct) failures.push('sync-regression');
  if (observation.metrics.authSuccessPct < thresholds.minimumAuthSuccessPct) failures.push('auth-regression');
  if (observation.metrics.criticalIncidents > thresholds.maximumCriticalIncidents) failures.push('critical-incident');
  if (observation.metrics.blockingSupportReports > thresholds.maximumBlockingSupportReports) failures.push('support-blocker');
  return { status: failures.length ? 'failed' : 'passed', failures };
}

export function applyRolloutObservation({ rollout, observation }) {
  assertBaseDocument(rollout, 'Registro de rollout');
  assertBaseDocument(observation, 'Observação de rollout');
  assertSourceCommit(observation.sourceCommit);
  assertHttpsEvidence(observation.evidenceUrl);
  if (rollout.sourceCommit && rollout.sourceCommit !== observation.sourceCommit) throw new Error('A observação referencia outro commit.');
  const stageIndex = ROLLOUT_STAGES.indexOf(observation.percentage);
  if (stageIndex < 0) throw new Error('Estágio de rollout inválido.');
  const previousStages = rollout.stages.slice(0, stageIndex);
  if (previousStages.some((stage) => stage.status !== 'passed')) throw new Error('Não é permitido registrar um estágio antes da aprovação dos anteriores.');

  const next = structuredClone(rollout);
  next.sourceCommit = observation.sourceCommit;
  next.observations ??= [];
  const duplicate = next.observations.some((item) => item.percentage === observation.percentage && item.recordedAt === observation.recordedAt && item.evidenceUrl === observation.evidenceUrl);
  if (!duplicate) next.observations.push(observation);
  const result = evaluateRolloutObservation(observation, next.thresholds);
  const stage = next.stages[stageIndex];
  stage.status = result.status;
  stage.completedAt = observation.recordedAt;
  stage.evidenceUrl = observation.evidenceUrl;
  stage.metrics = observation.metrics;
  stage.failures = result.failures;
  next.currentStage = observation.percentage;
  if (result.status === 'failed') {
    next.status = 'pause-required';
    next.pause = { status: 'required', reasonCode: result.failures[0], evidenceUrl: observation.evidenceUrl, requestedAt: observation.recordedAt };
  } else {
    next.status = observation.percentage === 100 ? 'completed' : 'ready-for-next-stage';
  }
  next.updatedAt = new Date().toISOString();
  return { rollout: next, duplicate, result };
}

export function validateProductionArtifacts(artifacts) {
  assertBaseDocument(artifacts, 'Artefatos de produção');
  const failures = [];
  for (const platform of ['android', 'ios']) {
    const item = artifacts.platforms?.[platform];
    if (item?.status !== 'captured') failures.push(`production_build_${platform}_pending`);
    if (!item?.buildId) failures.push(`production_build_${platform}_id_missing`);
    if (!item?.buildNumber) failures.push(`production_build_${platform}_number_missing`);
    if (!HTTPS_PATTERN.test(item?.artifactUrl ?? '')) failures.push(`production_build_${platform}_url_missing`);
    if (!HASH_PATTERN.test(item?.artifactSha256 ?? '')) failures.push(`production_build_${platform}_checksum_missing`);
  }
  if (!SHA_PATTERN.test(artifacts.sourceCommit ?? '')) failures.push('production_build_source_commit_missing');
  return failures;
}

export function validateAttestations(register) {
  assertBaseDocument(register, 'Atestações finais');
  const failures = [];
  const fingerprints = [];
  for (const role of REQUIRED_ATTESTATION_ROLES) {
    const item = register.attestations?.[role];
    if (item?.status !== 'approved') failures.push(`attestation_${role}_${item?.status ?? 'missing'}`);
    if (!HASH_PATTERN.test(item?.principalFingerprint ?? '')) failures.push(`attestation_${role}_fingerprint_missing`);
    if (!HTTPS_PATTERN.test(item?.evidenceUrl ?? '')) failures.push(`attestation_${role}_evidence_missing`);
    if (item?.principalFingerprint) fingerprints.push(item.principalFingerprint);
  }
  if (new Set(fingerprints).size !== fingerprints.length) failures.push('attestation_principals_not_distinct');
  return failures;
}

export function evaluateStoreReadiness(store, artifacts, attestations) {
  assertBaseDocument(store, 'Prontidão das lojas');
  const failures = [...validateProductionArtifacts(artifacts), ...validateAttestations(attestations)];
  for (const key of ['supportUrl', 'privacyUrl', 'termsUrl']) if (!HTTPS_PATTERN.test(store.legal?.[key] ?? '')) failures.push(`store_${key}_missing`);
  return failures;
}
