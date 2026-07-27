import { randomUUID } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const GROUP_PATTERN = /^[a-f0-9-]{16,}$/i;
const PROFILE_PATTERN = /^(android|ios)-[a-z0-9-]{2,48}$/;
const STATUS_SET = new Set(['passed', 'failed', 'blocked']);
const PLATFORM_SET = new Set(['android', 'ios']);
const ACTION_SET = new Set(['publish', 'rollback']);
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const SENSITIVE_PATTERN = /(expo_[a-z0-9_-]{20,}|sb_secret_[a-z0-9_-]+|service[_-]?role|gh[pousr]_[a-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const REQUIRED_CHECKS = {
  publish: ['update-received', 'restart-applied', 'local-data-preserved', 'offline-startup'],
  rollback: ['rollback-received', 'restart-applied', 'local-data-preserved', 'offline-startup'],
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const lower = (value) => String(value ?? '').toLowerCase();

function assertHttps(value) {
  let parsed;
  try { parsed = new URL(String(value ?? '')); } catch { throw new Error('A evidência deve ser uma URL HTTPS válida.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('A evidência deve usar HTTPS sem credenciais.');
  return parsed.toString();
}

export function parseOtaCheckResults(value, action) {
  if (!ACTION_SET.has(action)) throw new Error('Ação OTA inválida.');
  const text = String(value ?? '').trim();
  if (!text || text.length > 1000) throw new Error('Resultados OTA ausentes ou extensos demais.');
  const required = new Set(REQUIRED_CHECKS[action]);
  const seen = new Set();
  const results = [];
  for (const token of text.split(',')) {
    const [id, status, ...extra] = token.split('=');
    if (!id || !status || extra.length || !/^[a-z0-9-]{2,64}$/.test(id)) throw new Error(`Resultado OTA inválido: ${token}.`);
    if (!required.has(id)) throw new Error(`Check OTA não previsto para ${action}: ${id}.`);
    if (!STATUS_SET.has(status)) throw new Error(`Status OTA inválido para ${id}.`);
    if (seen.has(id)) throw new Error(`Check OTA duplicado: ${id}.`);
    seen.add(id);
    results.push({ id, status });
  }
  for (const id of required) if (!seen.has(id)) throw new Error(`Check OTA obrigatório ausente: ${id}.`);
  return results;
}

function expectedUpdate(ota, action) {
  if (action === 'publish') return { status: ota?.publish?.status, groupId: ota?.publish?.groupId, sourceCommit: ota?.publish?.sourceCommit };
  return { status: ota?.rollback?.status, groupId: ota?.rollback?.rollbackGroupId, sourceCommit: ota?.rollback?.sourceCommit ?? ota?.publish?.sourceCommit };
}

function deriveStatus(results) {
  if (results.some((item) => item.status === 'failed')) return 'failed';
  if (results.some((item) => item.status === 'blocked')) return 'blocked';
  return results.every((item) => item.status === 'passed') ? 'passed' : 'blocked';
}

export function createOtaDeviceSession({ builds, ota, deviceMatrix, sourceCommit, platform, buildId, profileId, osVersion, action, groupId, checkResults, evidenceUrl, sessionId = randomUUID(), capturedAt = new Date().toISOString() }) {
  if (builds?.release !== '0.11.0-rc.1' || ota?.release !== '0.11.0-rc.1') throw new Error('Registros não pertencem à RC 0.11.0-rc.1.');
  if (!SHA_PATTERN.test(sourceCommit ?? '') || lower(builds.sourceCommit) !== lower(sourceCommit)) throw new Error('Commit da sessão diverge dos builds.');
  if (!PLATFORM_SET.has(platform)) throw new Error('Plataforma OTA inválida.');
  if (!ACTION_SET.has(action)) throw new Error('Ação OTA inválida.');
  if (!UUID_PATTERN.test(sessionId)) throw new Error('Session ID inválido.');
  if (!GROUP_PATTERN.test(groupId ?? '')) throw new Error('Group ID OTA inválido.');
  if (!PROFILE_PATTERN.test(profileId ?? '') || !profileId.startsWith(`${platform}-`)) throw new Error('Perfil incompatível com a plataforma.');
  if (!/^[a-z0-9._-]{1,24}$/i.test(osVersion ?? '')) throw new Error('Versão do sistema inválida.');
  if (Number.isNaN(Date.parse(capturedAt))) throw new Error('Data da sessão inválida.');

  const build = builds?.platforms?.[platform];
  if (build?.status !== 'captured' || lower(build.buildId) !== lower(buildId)) throw new Error('Build capturado não corresponde à sessão OTA.');
  const update = expectedUpdate(ota, action);
  if (!['captured', 'passed'].includes(update.status)) throw new Error(`A operação OTA ${action} ainda não foi capturada.`);
  if (lower(update.groupId) !== lower(groupId)) throw new Error('Group ID da sessão diverge do registro OTA.');
  if (update.sourceCommit && lower(update.sourceCommit) !== lower(sourceCommit)) throw new Error('Commit do update diverge da candidata.');
  if (ota.runtimeVersion !== '0.11.0' || ota.channel !== 'rc-0-11') throw new Error('Runtime ou canal OTA divergente.');

  const profile = (deviceMatrix?.profiles ?? []).find((item) => item.id === profileId && item.platform === platform);
  if (!profile) throw new Error('Perfil não existe na matriz canônica.');
  const results = Array.isArray(checkResults)
    ? parseOtaCheckResults(checkResults.map((item) => `${item.id}=${item.status}`).join(','), action)
    : parseOtaCheckResults(checkResults, action);
  const session = {
    schemaVersion: '1.0', release: '0.11.0-rc.1', platform, action,
    sessionId: lower(sessionId), sourceCommit: lower(sourceCommit),
    build: { buildId: lower(buildId), buildNumber: build.buildNumber ?? null },
    update: { groupId: lower(groupId), runtimeVersion: '0.11.0', channel: 'rc-0-11' },
    device: { profileId, class: profile.class, formFactor: profile.formFactor, osVersion, status: deriveStatus(results) },
    checkResults: results, evidenceUrl: assertHttps(evidenceUrl), capturedAt: new Date(capturedAt).toISOString(),
    privacy: { containsPersonalData: false, containsClinicalData: false, containsSecrets: false, containsDeviceIdentifiers: false, usesSyntheticAccounts: true },
    controls: { automaticApproval: false, requiresPullRequestReview: true }, generatedBy: 'Tehkné Solutions',
  };
  assertSanitizedOtaSession(session);
  return session;
}

export function assertSanitizedOtaSession(session) {
  const serialized = JSON.stringify(session);
  if (SENSITIVE_PATTERN.test(serialized) || EMAIL_PATTERN.test(serialized)) throw new Error('A sessão OTA contém material sensível ou e-mail.');
  const privacy = session?.privacy ?? {};
  for (const key of ['containsPersonalData', 'containsClinicalData', 'containsSecrets', 'containsDeviceIdentifiers']) {
    if (privacy[key] !== false) throw new Error(`Declaração de privacidade inválida: ${key}.`);
  }
  if (session?.controls?.automaticApproval !== false) throw new Error('A sessão OTA não pode aprovar automaticamente.');
  return true;
}

function platformStatus(record) {
  const required = record.requiredProfiles ?? [];
  const statuses = required.map((id) => record.profiles?.[id]?.status ?? 'pending');
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('blocked')) return 'blocked';
  return statuses.length > 0 && statuses.every((status) => status === 'passed') ? 'passed' : 'pending';
}

function actionStatus(record) {
  const statuses = ['android', 'ios'].map((platform) => record.platforms?.[platform]?.status ?? 'pending');
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('blocked')) return 'blocked';
  return statuses.every((status) => status === 'passed') ? 'passed' : 'in-progress';
}

export function applyOtaDeviceSession({ validation, session }) {
  assertSanitizedOtaSession(session);
  const next = clone(validation);
  if (next?.release !== session.release || next?.runtimeVersion !== '0.11.0' || next?.channel !== 'rc-0-11') throw new Error('Registro de validação OTA incompatível.');
  const sessions = Array.isArray(next.sessions) ? next.sessions : [];
  if (sessions.some((item) => item.sessionId === session.sessionId)) return { validation: next, duplicate: true };
  const action = next.actions?.[session.action];
  if (!action) throw new Error('Ação ausente no registro OTA físico.');
  if (action.groupId && lower(action.groupId) !== lower(session.update.groupId)) throw new Error('Group ID diverge do ciclo físico atual.');
  action.groupId = session.update.groupId;
  const platform = action.platforms?.[session.platform];
  if (!platform || !(platform.requiredProfiles ?? []).includes(session.device.profileId)) throw new Error('Perfil não é obrigatório para esta validação OTA.');
  platform.profiles = { ...(platform.profiles ?? {}), [session.device.profileId]: {
    status: session.device.status, evidenceUrl: session.evidenceUrl, sessionId: session.sessionId,
    buildId: session.build.buildId, osVersion: session.device.osVersion, capturedAt: session.capturedAt,
  } };
  platform.status = platformStatus(platform);
  action.status = actionStatus(action);
  action.updatedAt = new Date().toISOString();
  next.sessions = [...sessions, { sessionId: session.sessionId, action: session.action, platform: session.platform, profileId: session.device.profileId, status: session.device.status, evidenceUrl: session.evidenceUrl, capturedAt: session.capturedAt }];
  const actionStates = [next.actions.publish.status, next.actions.rollback.status];
  next.status = actionStates.includes('failed') || actionStates.includes('blocked') ? 'retest-required' : actionStates.every((item) => item === 'passed') ? 'ready-for-final-review' : 'in-progress';
  next.updatedAt = new Date().toISOString();
  next.controls = { automaticApproval: false, requiresIndependentReview: true };
  return { validation: next, duplicate: false };
}

function evidenceReady(value) { return typeof value === 'string' && value.startsWith('https://'); }

export function createFinalRcDecision({ infrastructure, builds, deviceMatrix, testResults, androidPlan, iosPlan, ota, otaDeviceValidation }) {
  const blockers = [];
  for (const [scope, item] of Object.entries(infrastructure?.scopes ?? {})) if (item.status !== 'ready') blockers.push(`infrastructure_${scope}_${item.status ?? 'missing'}`);
  for (const platform of ['android', 'ios']) {
    const build = builds?.platforms?.[platform];
    if (build?.status !== 'captured') blockers.push(`build_${platform}_pending`);
    if (!/^[a-f0-9]{64}$/i.test(build?.artifactSha256 ?? '')) blockers.push(`checksum_${platform}_missing`);
  }
  for (const profile of (deviceMatrix?.profiles ?? []).filter((item) => item.required)) {
    if (profile.status !== 'passed') blockers.push(`device_${profile.id}_${profile.status}`);
    if (!evidenceReady(profile.evidenceUrl)) blockers.push(`device_${profile.id}_evidence_missing`);
  }
  for (const suite of (testResults?.suites ?? []).filter((item) => item.required)) {
    if (suite.status !== 'passed') blockers.push(`suite_${suite.id}_${suite.status}`);
    if (!evidenceReady(suite.evidenceUrl)) blockers.push(`suite_${suite.id}_evidence_missing`);
  }
  if (androidPlan?.status !== 'ready-for-review') blockers.push(`android_plan_${androidPlan?.status ?? 'missing'}`);
  if (iosPlan?.status !== 'ready-for-review') blockers.push(`ios_plan_${iosPlan?.status ?? 'missing'}`);
  if (ota?.publish?.status !== 'passed') blockers.push(`ota_publish_${ota?.publish?.status ?? 'missing'}`);
  if (ota?.rollback?.status !== 'passed') blockers.push(`ota_rollback_${ota?.rollback?.status ?? 'missing'}`);
  if (otaDeviceValidation?.actions?.publish?.status !== 'passed') blockers.push(`ota_devices_publish_${otaDeviceValidation?.actions?.publish?.status ?? 'missing'}`);
  if (otaDeviceValidation?.actions?.rollback?.status !== 'passed') blockers.push(`ota_devices_rollback_${otaDeviceValidation?.actions?.rollback?.status ?? 'missing'}`);
  const uniqueBlockers = [...new Set(blockers)];
  return {
    schemaVersion: '1.0', product: 'BemMeCuida', release: '0.11.0-rc.1', generatedAt: new Date().toISOString(), generatedBy: 'Tehkné Solutions',
    recommendation: uniqueBlockers.length ? 'hold' : 'promote', blockerCount: uniqueBlockers.length, blockers: uniqueBlockers,
    summary: {
      buildsCaptured: Object.values(builds?.platforms ?? {}).filter((item) => item.status === 'captured').length,
      requiredDevicesPassed: (deviceMatrix?.profiles ?? []).filter((item) => item.required && item.status === 'passed').length,
      requiredDevicesTotal: (deviceMatrix?.profiles ?? []).filter((item) => item.required).length,
      requiredSuitesPassed: (testResults?.suites ?? []).filter((item) => item.required && item.status === 'passed').length,
      requiredSuitesTotal: (testResults?.suites ?? []).filter((item) => item.required).length,
      otaPublishStatus: ota?.publish?.status ?? 'pending', otaRollbackStatus: ota?.rollback?.status ?? 'pending',
      otaPhysicalStatus: otaDeviceValidation?.status ?? 'pending',
    },
    privacy: { containsPersonalData: false, containsClinicalData: false },
    controls: { automaticPromotion: false, doesNotMutateReleaseState: true, requiresIndependentGateApproval: true, requiresHumanAttestation: true },
    signature: 'Tehkné Solutions',
  };
}

export { REQUIRED_CHECKS };
