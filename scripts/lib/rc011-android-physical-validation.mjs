import { randomUUID } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const TOKEN_PATTERN = /(expo_[a-z0-9_-]{20,}|sb_secret_[a-z0-9_-]+|service[_-]?role|gh[pousr]_[a-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PROFILE_PATTERN = /^android-[a-z0-9-]{2,48}$/;
const OS_VERSION_PATTERN = /^[a-z0-9._-]{1,24}$/i;
const RESULT_STATUSES = new Set(['passed', 'failed', 'blocked']);
const INSTALLATION_MODES = new Set(['fresh', 'upgrade', 'retest']);

const clone = (value) => JSON.parse(JSON.stringify(value));
const lower = (value) => String(value ?? '').toLowerCase();

function assertHttps(value, label) {
  let parsed;
  try {
    parsed = new URL(String(value ?? ''));
  } catch {
    throw new Error(`${label} deve ser uma URL HTTPS válida.`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error(`${label} deve usar HTTPS e não pode conter credenciais.`);
  }
  return parsed.toString();
}

function assertBuildAndPlan({ builds, plan, sourceCommit, buildId }) {
  const android = builds?.platforms?.android;
  if (builds?.release !== '0.11.0-rc.1' || android?.status !== 'captured') {
    throw new Error('A sessão exige um build Android capturado da RC 0.11.0-rc.1.');
  }
  if (!SHA_PATTERN.test(sourceCommit ?? '') || lower(builds.sourceCommit) !== lower(sourceCommit)) {
    throw new Error('O commit da sessão não corresponde ao registro do build.');
  }
  if (!UUID_PATTERN.test(buildId ?? '') || lower(android.buildId) !== lower(buildId)) {
    throw new Error('O build ID da sessão não corresponde ao artefato Android capturado.');
  }
  if (!SHA256_PATTERN.test(android.artifactSha256 ?? '')) throw new Error('O SHA-256 do artefato Android é inválido.');
  if (plan?.release !== '0.11.0-rc.1' || plan?.platform !== 'android') {
    throw new Error('O plano físico Android está ausente ou pertence a outra candidata.');
  }
  if (lower(plan.sourceCommit) !== lower(sourceCommit) || lower(plan.build?.buildId) !== lower(buildId)) {
    throw new Error('O plano físico não está vinculado ao mesmo commit e build da sessão.');
  }
  if (lower(plan.build?.artifactSha256) !== lower(android.artifactSha256)) {
    throw new Error('O checksum do plano diverge do registro do build.');
  }
  return android;
}

export function parseAndroidSuiteResults(value, allowedSuiteIds = []) {
  const allowed = new Set(allowedSuiteIds);
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Informe ao menos um resultado de suíte.');
  if (text.length > 2000) throw new Error('A lista de resultados excede o tamanho permitido.');

  const results = [];
  const seen = new Set();
  for (const token of text.split(',')) {
    const [id, status, ...extra] = token.split('=');
    if (!id || !status || extra.length) throw new Error(`Resultado de suíte inválido: ${token}.`);
    if (!/^[a-z0-9-]{2,64}$/.test(id)) throw new Error(`ID de suíte inválido: ${id}.`);
    if (allowed.size && !allowed.has(id)) throw new Error(`Suíte não prevista no plano: ${id}.`);
    if (!RESULT_STATUSES.has(status)) throw new Error(`Status inválido para ${id}: ${status}.`);
    if (seen.has(id)) throw new Error(`Suíte duplicada na sessão: ${id}.`);
    seen.add(id);
    results.push({ id, status });
  }
  return results;
}

export function createAndroidPhysicalSession({
  builds,
  plan,
  sourceCommit,
  buildId,
  profileId,
  deviceStatus,
  installationMode,
  osVersion,
  suiteResults,
  evidenceUrl,
  sessionId = randomUUID(),
  capturedAt = new Date().toISOString(),
}) {
  const android = assertBuildAndPlan({ builds, plan, sourceCommit, buildId });
  if (!UUID_PATTERN.test(sessionId)) throw new Error('Session ID inválido.');
  if (!PROFILE_PATTERN.test(profileId ?? '')) throw new Error('Perfil Android inválido.');
  const profile = (plan.devices ?? []).find((item) => item.id === profileId);
  if (!profile) throw new Error(`Perfil Android não existe no plano: ${profileId}.`);
  if (!RESULT_STATUSES.has(deviceStatus)) throw new Error('Status do aparelho deve ser passed, failed ou blocked.');
  if (!INSTALLATION_MODES.has(installationMode)) throw new Error('Modo de instalação deve ser fresh, upgrade ou retest.');
  if (!OS_VERSION_PATTERN.test(osVersion ?? '')) throw new Error('Versão do Android inválida ou contém caracteres não permitidos.');
  if (Number.isNaN(Date.parse(capturedAt))) throw new Error('Data da sessão inválida.');

  const results = Array.isArray(suiteResults)
    ? parseAndroidSuiteResults(suiteResults.map((item) => `${item.id}=${item.status}`).join(','), (plan.suites ?? []).map((item) => item.id))
    : parseAndroidSuiteResults(suiteResults, (plan.suites ?? []).map((item) => item.id));
  const safeEvidenceUrl = assertHttps(evidenceUrl, 'A evidência');

  const session = {
    schemaVersion: '1.0',
    release: '0.11.0-rc.1',
    platform: 'android',
    sessionId: lower(sessionId),
    sourceCommit: lower(sourceCommit),
    build: {
      buildId: lower(buildId),
      buildNumber: android.buildNumber,
      artifactSha256: lower(android.artifactSha256),
    },
    device: {
      profileId,
      class: profile.class,
      formFactor: profile.formFactor,
      memoryClass: profile.memoryClass,
      osVersion,
      installationMode,
      status: deviceStatus,
    },
    suiteResults: results,
    evidenceUrl: safeEvidenceUrl,
    capturedAt: new Date(capturedAt).toISOString(),
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsSecrets: false,
      containsDeviceIdentifiers: false,
      usesSyntheticAccounts: true,
    },
    controls: {
      automaticApproval: false,
      requiresPullRequestReview: true,
    },
    generatedBy: 'Tehkné Solutions',
  };

  assertSanitizedAndroidSession(session);
  return session;
}

export function assertSanitizedAndroidSession(session) {
  const serialized = JSON.stringify(session);
  if (TOKEN_PATTERN.test(serialized)) throw new Error('A sessão contém material que parece secreto ou privilegiado.');
  if (EMAIL_PATTERN.test(serialized)) throw new Error('A sessão contém endereço de e-mail e não está sanitizada.');
  if (session?.privacy?.containsPersonalData !== false || session?.privacy?.containsClinicalData !== false) {
    throw new Error('A sessão deve declarar ausência de dados pessoais e clínicos.');
  }
  if (session?.privacy?.containsSecrets !== false || session?.privacy?.containsDeviceIdentifiers !== false) {
    throw new Error('A sessão deve declarar ausência de secrets e identificadores únicos do aparelho.');
  }
  if (session?.controls?.automaticApproval !== false) throw new Error('A sessão não pode aprovar gates automaticamente.');
  return true;
}

function normalizeSummary(plan) {
  const requiredDevices = (plan.devices ?? []).filter((item) => item.required);
  const requiredSuites = (plan.suites ?? []).filter((item) => item.required);
  const failures = [
    ...requiredDevices.filter((item) => item.status === 'failed' || item.status === 'blocked').map((item) => ({ type: 'device', id: item.id, status: item.status })),
    ...requiredSuites.filter((item) => item.status === 'failed' || item.status === 'blocked').map((item) => ({ type: 'suite', id: item.id, status: item.status })),
  ];
  const passedRequiredDevices = requiredDevices.filter((item) => item.status === 'passed').length;
  const passedRequiredSuites = requiredSuites.filter((item) => item.status === 'passed').length;
  const ready = passedRequiredDevices === requiredDevices.length && passedRequiredSuites === requiredSuites.length;
  return {
    status: failures.length ? 'retest-required' : ready ? 'ready-for-review' : 'in-progress',
    summary: {
      requiredDevices: requiredDevices.length,
      passedRequiredDevices,
      requiredSuites: requiredSuites.length,
      passedRequiredSuites,
      failedOrBlockedRequiredItems: failures.length,
    },
    retests: failures,
  };
}

function statusForGlobalSuite(current, platformResults) {
  const android = platformResults?.android?.status;
  if (android === 'failed' || android === 'blocked') return android;
  const requiredPlatforms = Array.isArray(current.requiredPlatforms) && current.requiredPlatforms.length
    ? current.requiredPlatforms
    : ['android', 'ios'];
  if (requiredPlatforms.every((platform) => platformResults?.[platform]?.status === 'passed')) return 'passed';
  return current.status === 'waived' ? 'waived' : 'pending';
}

export function applyAndroidPhysicalSession({ plan, deviceMatrix, testResults, session }) {
  assertSanitizedAndroidSession(session);
  assertBuildAndPlan({
    builds: {
      release: session.release,
      sourceCommit: session.sourceCommit,
      platforms: {
        android: {
          status: 'captured',
          buildId: session.build.buildId,
          buildNumber: session.build.buildNumber,
          artifactSha256: session.build.artifactSha256,
        },
      },
    },
    plan,
    sourceCommit: session.sourceCommit,
    buildId: session.build.buildId,
  });

  const nextPlan = clone(plan);
  const nextMatrix = clone(deviceMatrix);
  const nextTests = clone(testResults);
  const sessions = Array.isArray(nextPlan.sessions) ? nextPlan.sessions : [];
  if (sessions.some((item) => item.sessionId === session.sessionId)) {
    return { plan: nextPlan, deviceMatrix: nextMatrix, testResults: nextTests, duplicate: true };
  }

  const device = nextPlan.devices.find((item) => item.id === session.device.profileId);
  if (!device) throw new Error('O aparelho da sessão não existe no plano atual.');
  Object.assign(device, {
    status: session.device.status,
    evidenceUrl: session.evidenceUrl,
    latestSessionId: session.sessionId,
    testedAt: session.capturedAt,
    osVersion: session.device.osVersion,
    installationMode: session.device.installationMode,
  });

  for (const result of session.suiteResults) {
    const suite = nextPlan.suites.find((item) => item.id === result.id);
    if (!suite) throw new Error(`Suíte ausente no plano atual: ${result.id}.`);
    Object.assign(suite, {
      status: result.status,
      evidenceUrl: session.evidenceUrl,
      latestSessionId: session.sessionId,
      testedAt: session.capturedAt,
    });
  }

  nextPlan.sessions = [...sessions, {
    sessionId: session.sessionId,
    profileId: session.device.profileId,
    deviceStatus: session.device.status,
    suiteCount: session.suiteResults.length,
    evidenceUrl: session.evidenceUrl,
    capturedAt: session.capturedAt,
  }];
  const normalized = normalizeSummary(nextPlan);
  nextPlan.status = normalized.status;
  nextPlan.summary = normalized.summary;
  nextPlan.retests = normalized.retests;
  nextPlan.updatedAt = new Date().toISOString();
  nextPlan.controls = { automaticApproval: false, requiresOperatorReview: true };

  const matrixProfile = (nextMatrix.profiles ?? []).find((item) => item.id === session.device.profileId);
  if (!matrixProfile) throw new Error('Perfil da sessão ausente na matriz canônica.');
  Object.assign(matrixProfile, {
    status: session.device.status,
    evidenceUrl: session.evidenceUrl,
    latestSessionId: session.sessionId,
    testedBuildId: session.build.buildId,
    testedAt: session.capturedAt,
    osVersion: session.device.osVersion,
  });
  nextMatrix.updatedAt = new Date().toISOString();

  for (const result of session.suiteResults) {
    const suite = (nextTests.suites ?? []).find((item) => item.id === result.id);
    if (!suite) throw new Error(`Suíte ausente no registro canônico: ${result.id}.`);
    const platformResults = { ...(suite.platformResults ?? {}) };
    platformResults.android = {
      status: result.status,
      evidenceUrl: session.evidenceUrl,
      sessionId: session.sessionId,
      buildId: session.build.buildId,
      capturedAt: session.capturedAt,
    };
    suite.platformResults = platformResults;
    suite.status = statusForGlobalSuite(suite, platformResults);
    suite.evidenceUrl = suite.status === 'failed' || suite.status === 'blocked' ? session.evidenceUrl : suite.status === 'passed' ? session.evidenceUrl : null;
  }
  nextTests.updatedAt = new Date().toISOString();

  return { plan: nextPlan, deviceMatrix: nextMatrix, testResults: nextTests, duplicate: false };
}

function normalizeGateStatus(items) {
  if (!items.length) return 'pending';
  if (items.some((item) => item.status === 'failed' || item.status === 'blocked')) return 'failed';
  if (items.every((item) => item.status === 'passed' || item.status === 'waived')) return 'passed';
  return 'pending';
}

export function createAndroidGateProposal({ plan, gateMap }) {
  const suiteById = new Map((plan.suites ?? []).map((item) => [item.id, item]));
  const requiredDevices = (plan.devices ?? []).filter((item) => item.required);
  const gates = (gateMap?.gates ?? []).map((gate) => {
    const sources = gate.sourceType === 'device-matrix'
      ? requiredDevices
      : (gate.sourceIds ?? []).map((id) => suiteById.get(id)).filter(Boolean);
    return {
      gateKey: gate.gateKey,
      required: gate.required === true,
      scope: 'android',
      recommendedStatus: normalizeGateStatus(sources),
      evidence: [...new Set(sources.map((item) => item.evidenceUrl).filter((value) => String(value).startsWith('https://')))],
      sourceCount: sources.length,
      passedSourceCount: sources.filter((item) => item.status === 'passed' || item.status === 'waived').length,
    };
  });
  return {
    schemaVersion: '1.0',
    release: '0.11.0-rc.1',
    platform: 'android',
    buildId: plan.build?.buildId ?? null,
    artifactSha256: plan.build?.artifactSha256 ?? null,
    readyForAndroidReview: gates.filter((item) => item.required).every((item) => item.recommendedStatus === 'passed'),
    gates,
    controls: {
      automaticMutation: false,
      automaticApproval: false,
      requiresOperatorReview: true,
      globalGatesRemainAuthoritative: true,
    },
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsSecrets: false,
    },
    generatedAt: new Date().toISOString(),
    generatedBy: 'Tehkné Solutions',
  };
}

export function createAndroidHomologationReport({ plan, proposal }) {
  return {
    release: plan.release,
    platform: 'android',
    buildId: plan.build?.buildId ?? null,
    status: plan.status,
    summary: plan.summary,
    retests: plan.retests ?? [],
    sessionCount: (plan.sessions ?? []).length,
    readyForAndroidReview: proposal.readyForAndroidReview,
    globalApprovalChanged: false,
    generatedAt: new Date().toISOString(),
    generatedBy: 'Tehkné Solutions',
  };
}
