import { createHash } from 'node:crypto';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,47}$/;
const TEMPORARY_ENVIRONMENTS = new Set(['rc-011-build', 'rc-011-homologation']);
const PROTECTED_ENVIRONMENTS = new Set(['production-release', 'production-observability']);
const CLEANUP_STATUSES = new Set(['retained', 'dry-run-approved', 'deleted', 'blocked']);
const SENSITIVE_PATTERN = /(email|cpf|diagnos|medica|journal|di[aá]rio|emotion|token|secret|password|imei|serial|udid)/i;

export function assertSourceCommit(value) {
  if (!SHA_PATTERN.test(String(value ?? ''))) throw new Error('sourceCommit deve ser um SHA Git de 40 caracteres.');
  return String(value).toLowerCase();
}

export function assertEvidenceUrl(value) {
  const url = String(value ?? '');
  if (!HTTPS_PATTERN.test(url)) throw new Error('evidenceUrl deve ser HTTPS.');
  const parsed = new URL(url);
  if (parsed.username || parsed.password) throw new Error('evidenceUrl não pode conter credenciais.');
  return url;
}

export function fingerprint(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function parseThemeCounts(input) {
  const text = String(input ?? '').trim();
  if (!text) throw new Error('themeCounts não pode estar vazio.');
  if (text.length > 2000 || SENSITIVE_PATTERN.test(text)) throw new Error('themeCounts contém conteúdo não permitido.');
  const seen = new Set();
  const rows = text.split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [theme, countText] = part.split('=');
    if (!SLUG_PATTERN.test(theme ?? '')) throw new Error(`Tema agregado inválido: ${theme ?? ''}.`);
    if (seen.has(theme)) throw new Error(`Tema agregado duplicado: ${theme}.`);
    const count = Number(countText);
    if (!Number.isInteger(count) || count < 0 || count > 1_000_000) throw new Error(`Contagem inválida para ${theme}.`);
    seen.add(theme);
    return { id: theme, count };
  });
  if (!rows.length || rows.length > 20) throw new Error('themeCounts deve conter entre 1 e 20 temas.');
  return rows.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).map((row, index) => ({ ...row, rank: index + 1 }));
}

export function buildFeedbackCapture({ sourceCommit, themeCounts, impacts, excludedSensitiveItems, evidenceUrl, capturedAt }) {
  const themes = parseThemeCounts(themeCounts);
  const impactDistribution = Object.fromEntries(['blocking', 'high', 'medium', 'low'].map((key) => {
    const value = Number(impacts?.[key] ?? 0);
    if (!Number.isInteger(value) || value < 0 || value > 1_000_000) throw new Error(`Impacto ${key} inválido.`);
    return [key, value];
  }));
  const excluded = Number(excludedSensitiveItems ?? 0);
  if (!Number.isInteger(excluded) || excluded < 0 || excluded > 1_000_000) throw new Error('excludedSensitiveItems inválido.');
  const includedItems = themes.reduce((sum, item) => sum + item.count, 0);
  const totalFeedbackItems = includedItems + excluded;
  return {
    schemaVersion: '1.0', product: 'BemMeCuida', generatedBy: 'Tehkné Solutions', captureType: 'cycle012-feedback-summary',
    sourceCommit: assertSourceCommit(sourceCommit), capturedAt, targetCycle: '0.12.0', status: includedItems >= 10 ? 'ready-for-human-review' : 'insufficient-sample',
    sample: { totalFeedbackItems, includedItems, excludedSensitiveItems: excluded }, themes, impactDistribution,
    evidenceUrl: assertEvidenceUrl(evidenceUrl),
    controls: { minimumSample: 10, rawTextForbidden: true, individualRecordsForbidden: true, clinicalSegmentationForbidden: true, humanReviewRequired: true },
    privacy: { containsPersonalData: false, containsClinicalData: false, containsRawFeedback: false },
  };
}

export function buildCleanupCapture({ sourceCommit, environment, status, evidenceUrl, capturedAt }) {
  const name = String(environment ?? '');
  const normalizedStatus = String(status ?? '');
  if (PROTECTED_ENVIRONMENTS.has(name)) throw new Error(`Environment protegido não pode entrar na limpeza: ${name}.`);
  if (!TEMPORARY_ENVIRONMENTS.has(name)) throw new Error(`Environment temporário desconhecido: ${name}.`);
  if (!CLEANUP_STATUSES.has(normalizedStatus)) throw new Error(`Status de limpeza inválido: ${normalizedStatus}.`);
  return {
    schemaVersion: '1.0', product: 'BemMeCuida', generatedBy: 'Tehkné Solutions', captureType: 'cycle012-environment-cleanup',
    sourceCommit: assertSourceCommit(sourceCommit), capturedAt, sourceCycle: '0.11.0', targetCycle: '0.12.0',
    environment: name, status: normalizedStatus, evidenceUrl: assertEvidenceUrl(evidenceUrl),
    privacy: { containsSecrets: false, containsPersonalData: false, containsClinicalData: false },
  };
}

export function applyFeedbackCapture(current, capture) {
  if (capture.captureType !== 'cycle012-feedback-summary') throw new Error('Captura de feedback inválida.');
  return {
    ...current,
    status: capture.status,
    updatedAt: capture.capturedAt,
    sample: capture.sample,
    themes: capture.themes,
    impactDistribution: capture.impactDistribution,
    evidenceUrl: capture.evidenceUrl,
  };
}

export function applyCleanupCapture(current, capture) {
  if (capture.captureType !== 'cycle012-environment-cleanup') throw new Error('Captura de limpeza inválida.');
  let found = false;
  const temporaryEnvironments = current.temporaryEnvironments.map((item) => {
    if (item.name !== capture.environment) return item;
    found = true;
    return { ...item, status: capture.status, evidenceUrl: capture.evidenceUrl, updatedAt: capture.capturedAt };
  });
  if (!found) throw new Error(`Environment ausente no plano: ${capture.environment}.`);
  const deleted = temporaryEnvironments.every((item) => item.status === 'deleted');
  const blocked = temporaryEnvironments.some((item) => item.status === 'blocked');
  return { ...current, status: deleted ? 'completed' : blocked ? 'blocked' : 'in-progress', updatedAt: capture.capturedAt, temporaryEnvironments };
}

export function evaluateCycle012({ sourceClosure, cleanup, feedback, scope, migrationPlan }) {
  const blockers = [];
  if (sourceClosure?.status !== 'closed') blockers.push(`Ciclo 0.11.0: ${sourceClosure?.status ?? 'missing'}`);
  if (cleanup?.status !== 'completed') blockers.push(`Limpeza de environments: ${cleanup?.status ?? 'missing'}`);
  if (!['approved', 'ready-for-human-review'].includes(feedback?.status)) blockers.push(`Feedback agregado: ${feedback?.status ?? 'missing'}`);
  if (scope?.approval?.status !== 'approved') blockers.push(`Escopo 0.12.0: ${scope?.approval?.status ?? 'missing'}`);
  if (migrationPlan?.approval?.status !== 'approved') blockers.push(`Plano de migrations: ${migrationPlan?.approval?.status ?? 'missing'}`);
  const evidence = [sourceClosure?.evidenceUrl, cleanup?.temporaryEnvironments?.find((item) => item.evidenceUrl)?.evidenceUrl, feedback?.evidenceUrl, scope?.approval?.evidenceUrl, migrationPlan?.approval?.evidenceUrl];
  if (blockers.length === 0 && evidence.some((url) => !url)) blockers.push('Todas as aprovações precisam de evidência HTTPS.');
  return {
    blockers,
    recommendation: blockers.length ? 'hold' : 'ready-for-human-activation',
    controls: { doesNotActivateAutomatically: true, independentApprovalRequired: true, noMigrationCreatedAutomatically: true },
  };
}

export function sanitizeCycle012Artifact(value) {
  const text = JSON.stringify(value);
  if (SENSITIVE_PATTERN.test(text.replace(/contains(PersonalData|ClinicalData|RawFeedback|Secrets)":false/gi, ''))) {
    throw new Error('Artefato contém categoria potencialmente sensível.');
  }
  return value;
}

export const cycle012Constants = {
  temporaryEnvironments: [...TEMPORARY_ENVIRONMENTS],
  protectedEnvironments: [...PROTECTED_ENVIRONMENTS],
  cleanupStatuses: [...CLEANUP_STATUSES],
};
