import { randomUUID } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const SENSITIVE_PATTERN = /(expo_[a-z0-9_-]{20,}|sb_secret_[a-z0-9_-]+|service[_-]?role|gh[pousr]_[a-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const PROFILE_PATTERN = /^ios-[a-z0-9-]{2,48}$/;
const RESULT_STATUSES = new Set(['passed', 'failed', 'blocked']);
const INSTALLATION_MODES = new Set(['fresh', 'upgrade', 'retest']);
const lower = (value) => String(value ?? '').toLowerCase();
const clone = (value) => JSON.parse(JSON.stringify(value));

function assertHttps(value) {
  let url;
  try { url = new URL(String(value ?? '')); } catch { throw new Error('A evidência deve ser uma URL HTTPS válida.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('A evidência deve usar HTTPS sem credenciais.');
  return url.toString();
}

function assertBuildAndPlan({ builds, plan, sourceCommit, buildId }) {
  const ios = builds?.platforms?.ios;
  if (builds?.release !== '0.11.0-rc.1' || ios?.status !== 'captured') throw new Error('A sessão exige um build iOS capturado.');
  if (!SHA_PATTERN.test(sourceCommit ?? '') || lower(builds.sourceCommit) !== lower(sourceCommit)) throw new Error('Commit divergente do build iOS.');
  if (!UUID_PATTERN.test(buildId ?? '') || lower(ios.buildId) !== lower(buildId)) throw new Error('Build ID iOS divergente.');
  if (!SHA256_PATTERN.test(ios.artifactSha256 ?? '')) throw new Error('Checksum iOS inválido.');
  if (plan?.release !== '0.11.0-rc.1' || plan?.platform !== 'ios') throw new Error('Plano físico iOS inválido.');
  if (lower(plan.sourceCommit) !== lower(sourceCommit) || lower(plan.build?.buildId) !== lower(buildId)) throw new Error('Plano iOS não corresponde ao build.');
  if (lower(plan.build?.artifactSha256) !== lower(ios.artifactSha256)) throw new Error('Checksum do plano iOS divergente.');
  return ios;
}

export function parseIosSuiteResults(value, allowedSuiteIds = []) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Informe ao menos um resultado de suíte.');
  const allowed = new Set(allowedSuiteIds);
  const results = [];
  const seen = new Set();
  for (const token of text.split(',')) {
    const [id, status, ...extra] = token.split('=');
    if (!id || !status || extra.length || !/^[a-z0-9-]{2,64}$/.test(id)) throw new Error(`Resultado de suíte inválido: ${token}.`);
    if (allowed.size && !allowed.has(id)) throw new Error(`Suíte não prevista: ${id}.`);
    if (!RESULT_STATUSES.has(status)) throw new Error(`Status inválido para ${id}.`);
    if (seen.has(id)) throw new Error(`Suíte duplicada: ${id}.`);
    seen.add(id); results.push({ id, status });
  }
  return results;
}

export function createIosPhysicalSession({ builds, plan, sourceCommit, buildId, profileId, deviceStatus, installationMode, osVersion, suiteResults, evidenceUrl, sessionId = randomUUID(), capturedAt = new Date().toISOString() }) {
  const ios = assertBuildAndPlan({ builds, plan, sourceCommit, buildId });
  if (!UUID_PATTERN.test(sessionId)) throw new Error('Session ID inválido.');
  if (!PROFILE_PATTERN.test(profileId ?? '')) throw new Error('Perfil iOS inválido.');
  const profile = (plan.devices ?? []).find((item) => item.id === profileId);
  if (!profile) throw new Error(`Perfil iOS ausente no plano: ${profileId}.`);
  if (!RESULT_STATUSES.has(deviceStatus)) throw new Error('Status do aparelho inválido.');
  if (!INSTALLATION_MODES.has(installationMode)) throw new Error('Modo de instalação inválido.');
  if (!/^[a-z0-9._-]{1,24}$/i.test(osVersion ?? '')) throw new Error('Versão do iOS inválida.');
  if (Number.isNaN(Date.parse(capturedAt))) throw new Error('Data da sessão inválida.');
  const results = Array.isArray(suiteResults)
    ? parseIosSuiteResults(suiteResults.map((item) => `${item.id}=${item.status}`).join(','), (plan.suites ?? []).map((item) => item.id))
    : parseIosSuiteResults(suiteResults, (plan.suites ?? []).map((item) => item.id));
  const session = {
    schemaVersion: '1.0', release: '0.11.0-rc.1', platform: 'ios', sessionId: lower(sessionId), sourceCommit: lower(sourceCommit),
    build: { buildId: lower(buildId), buildNumber: ios.buildNumber, artifactSha256: lower(ios.artifactSha256) },
    device: { profileId, class: profile.class, formFactor: profile.formFactor, memoryClass: profile.memoryClass, osVersion, installationMode, status: deviceStatus },
    suiteResults: results, evidenceUrl: assertHttps(evidenceUrl), capturedAt: new Date(capturedAt).toISOString(),
    privacy: { containsPersonalData: false, containsClinicalData: false, containsSecrets: false, containsDeviceIdentifiers: false, usesSyntheticAccounts: true },
    controls: { automaticApproval: false, requiresPullRequestReview: true }, generatedBy: 'Tehkné Solutions',
  };
  assertSanitizedIosSession(session);
  return session;
}

export function assertSanitizedIosSession(session) {
  const serialized = JSON.stringify(session);
  if (SENSITIVE_PATTERN.test(serialized)) throw new Error('A sessão contém material secreto.');
  if (EMAIL_PATTERN.test(serialized)) throw new Error('A sessão contém e-mail.');
  if (session?.privacy?.containsPersonalData !== false || session?.privacy?.containsClinicalData !== false || session?.privacy?.containsSecrets !== false || session?.privacy?.containsDeviceIdentifiers !== false) {
    throw new Error('Declarações de privacidade inválidas.');
  }
  if (session?.controls?.automaticApproval !== false) throw new Error('A sessão não pode aprovar automaticamente.');
  return true;
}

export { clone, assertBuildAndPlan };
