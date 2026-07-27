import { createHash } from 'node:crypto';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const INCIDENT_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,39}$/;
const WINDOWS = ['24h', '72h', '7d', 'rolling'];
const SEVERITIES = ['sev1', 'sev2', 'sev3', 'sev4'];
const INCIDENT_STATUSES = ['open', 'contained', 'resolved'];
const PLATFORMS = ['android', 'ios', 'all'];
const IMPACTS = ['availability', 'authentication', 'synchronization', 'data-integrity', 'notifications', 'performance', 'other'];
const ACTIONS = ['monitor', 'pause', 'rollback-review', 'resolved'];

export function assertSourceCommit(value) {
  if (!SHA_PATTERN.test(String(value ?? ''))) throw new Error('sourceCommit inválido.');
  return String(value).toLowerCase();
}

export function assertHttpsUrl(value) {
  const text = String(value ?? '');
  if (!/^https:\/\/[^\s]+$/i.test(text)) throw new Error('A evidência deve usar HTTPS.');
  const url = new URL(text);
  if (url.username || url.password) throw new Error('A evidência não pode conter credenciais na URL.');
  return text;
}

export function percent(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) throw new Error(`${label} deve estar entre 0 e 100.`);
  return parsed;
}

export function count(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} deve ser inteiro não negativo.`);
  return parsed;
}

function snapshotId(sourceCommit, generatedAt, window) {
  return `health-${createHash('sha256').update(`${sourceCommit}:${generatedAt}:${window}`).digest('hex').slice(0, 16)}`;
}

export function createHealthSnapshot(input) {
  const sourceCommit = assertSourceCommit(input.sourceCommit);
  if (!WINDOWS.includes(input.window)) throw new Error('Janela de observação inválida.');
  const evidenceUrl = assertHttpsUrl(input.evidenceUrl);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const metrics = {
    crashFreePct: percent(input.crashFreePct, 'crashFreePct'),
    syncSuccessPct: percent(input.syncSuccessPct, 'syncSuccessPct'),
    authSuccessPct: percent(input.authSuccessPct, 'authSuccessPct'),
    notificationSuccessPct: percent(input.notificationSuccessPct, 'notificationSuccessPct'),
    sampleSize: count(input.sampleSize, 'sampleSize'),
    criticalIncidents: count(input.criticalIncidents, 'criticalIncidents'),
    openSev2: count(input.openSev2, 'openSev2'),
    blockingSupportReports: count(input.blockingSupportReports, 'blockingSupportReports'),
  };
  const failures = [];
  if (metrics.crashFreePct < 99) failures.push('crash_free_below_99');
  if (metrics.syncSuccessPct < 97) failures.push('sync_success_below_97');
  if (metrics.authSuccessPct < 98) failures.push('auth_success_below_98');
  if (metrics.notificationSuccessPct < 95) failures.push('notification_success_below_95');
  if (metrics.sampleSize < 100) failures.push('sample_size_below_100');
  if (metrics.criticalIncidents > 0) failures.push('critical_incident_open');
  if (metrics.openSev2 > 0) failures.push('sev2_open');
  if (metrics.blockingSupportReports > 0) failures.push('blocking_support_report');
  const recommendation = metrics.criticalIncidents > 0 ? 'rollback-review' : failures.length ? 'pause-required' : 'stable';
  return {
    schemaVersion: '1.0', product: 'BemMeCuida', release: '0.11.0', generatedBy: 'Tehkné Solutions', generatedAt,
    privacy: { containsPersonalData: false, containsClinicalData: false, containsJournalContent: false, aggregateMetricsOnly: true },
    sourceCommit, snapshotId: snapshotId(sourceCommit, generatedAt, input.window), window: input.window, evidenceUrl, metrics, failures, recommendation,
  };
}

export function applyHealthSnapshot(source, capture) {
  if (capture.release !== '0.11.0' || capture.product !== 'BemMeCuida') throw new Error('Captura de saúde incompatível.');
  assertSourceCommit(capture.sourceCommit);
  const next = structuredClone(source);
  next.sourceCommit = capture.sourceCommit;
  next.updatedAt = capture.generatedAt;
  next.snapshots ??= [];
  const existing = next.snapshots.findIndex((item) => item.snapshotId === capture.snapshotId);
  if (existing >= 0) next.snapshots[existing] = capture;
  else next.snapshots.push(capture);
  next.latestSnapshot = capture;
  next.status = capture.recommendation === 'stable' ? 'monitoring' : capture.recommendation;
  if (capture.window !== 'rolling') {
    next.checkpoints[capture.window] = {
      status: capture.recommendation === 'stable' ? 'passed' : 'failed',
      snapshotId: capture.snapshotId,
      evidenceUrl: capture.evidenceUrl,
      observedAt: capture.generatedAt,
    };
  }
  return next;
}

function incidentFingerprint(input) {
  return createHash('sha256').update(`${input.incidentId}:${input.sourceCommit}:${input.evidenceUrl}`).digest('hex');
}

export function createIncidentCapture(input) {
  const sourceCommit = assertSourceCommit(input.sourceCommit);
  const incidentId = String(input.incidentId ?? '').toUpperCase();
  if (!INCIDENT_ID_PATTERN.test(incidentId)) throw new Error('incidentId inválido.');
  if (!SEVERITIES.includes(input.severity)) throw new Error('Severidade inválida.');
  if (!INCIDENT_STATUSES.includes(input.status)) throw new Error('Estado do incidente inválido.');
  if (!PLATFORMS.includes(input.platform)) throw new Error('Plataforma inválida.');
  if (!IMPACTS.includes(input.impact)) throw new Error('Categoria de impacto inválida.');
  if (!ACTIONS.includes(input.action)) throw new Error('Ação de contenção inválida.');
  const evidenceUrl = assertHttpsUrl(input.evidenceUrl);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  return {
    schemaVersion: '1.0', product: 'BemMeCuida', release: '0.11.0', generatedBy: 'Tehkné Solutions', generatedAt,
    privacy: { containsPersonalData: false, containsClinicalData: false, containsJournalContent: false, technicalClassificationOnly: true },
    sourceCommit, incidentId, severity: input.severity, status: input.status, platform: input.platform, impact: input.impact,
    containmentAction: input.action, evidenceUrl, fingerprint: incidentFingerprint({ incidentId, sourceCommit, evidenceUrl }),
  };
}

export function applyIncidentCapture(source, capture) {
  if (capture.release !== '0.11.0') throw new Error('Captura de incidente incompatível.');
  const next = structuredClone(source);
  next.updatedAt = capture.generatedAt;
  next.incidents ??= [];
  const index = next.incidents.findIndex((item) => item.incidentId === capture.incidentId);
  if (index >= 0) next.incidents[index] = capture;
  else next.incidents.push(capture);
  const open = next.incidents.filter((item) => item.status !== 'resolved');
  next.summary = {
    openSev1: open.filter((item) => item.severity === 'sev1').length,
    openSev2: open.filter((item) => item.severity === 'sev2').length,
    openSev3: open.filter((item) => item.severity === 'sev3').length,
    openSev4: open.filter((item) => item.severity === 'sev4').length,
    total: next.incidents.length,
  };
  next.status = next.summary.openSev1 > 0 ? 'rollback-review' : next.summary.openSev2 > 0 ? 'pause-required' : 'monitoring';
  return next;
}

export function createPostReleaseDecision({ publication, rollout, health, incidents, closure, backlog, window = 'current' }) {
  const releasePublished = publication?.githubRelease?.status === 'published' || publication?.status === 'published';
  const rolloutCompleted = rollout?.status === 'completed';
  const blockers = [];
  if (!releasePublished) blockers.push('release_not_published');
  if (!rolloutCompleted) blockers.push('rollout_not_completed');
  if (health.status === 'rollback-review' || incidents.status === 'rollback-review') blockers.push('rollback_review_required');
  else if (health.status === 'pause-required' || incidents.status === 'pause-required') blockers.push('pause_required');
  if ((incidents.summary?.openSev1 ?? 0) > 0) blockers.push('open_sev1');
  if ((incidents.summary?.openSev2 ?? 0) > 0) blockers.push('open_sev2');
  const checkpoints = health.checkpoints ?? {};
  const selected = window === 'current' ? null : checkpoints[window];
  if (selected && selected.status !== 'passed') blockers.push(`checkpoint_${window}_not_passed`);
  const allCheckpointsPassed = ['24h', '72h', '7d'].every((key) => checkpoints[key]?.status === 'passed');
  const backlogPrepared = backlog?.targetVersion === '0.12.0' && ['draft', 'ready'].includes(backlog?.status);
  let recommendation = 'monitor';
  if (!releasePublished) recommendation = 'await-release';
  else if (blockers.includes('rollback_review_required') || blockers.includes('open_sev1')) recommendation = 'rollback-review';
  else if (blockers.includes('pause_required') || blockers.includes('open_sev2')) recommendation = 'pause-rollout';
  else if (allCheckpointsPassed && rolloutCompleted && backlogPrepared) recommendation = closure?.status === 'closed' ? 'cycle-closed' : 'ready-to-close-cycle';
  return {
    schemaVersion: '1.0', product: 'BemMeCuida', release: '0.11.0', generatedBy: 'Tehkné Solutions', generatedAt: new Date().toISOString(),
    privacy: { containsPersonalData: false, containsClinicalData: false }, window, recommendation,
    blockerCount: [...new Set(blockers)].length, blockers: [...new Set(blockers)],
    summary: {
      releasePublished, rolloutCompleted, healthStatus: health.status, incidentStatus: incidents.status,
      openSev1: incidents.summary?.openSev1 ?? 0, openSev2: incidents.summary?.openSev2 ?? 0,
      checkpointsPassed: ['24h', '72h', '7d'].filter((key) => checkpoints[key]?.status === 'passed').length,
      checkpointsRequired: 3, backlogPrepared,
    },
    controls: { doesNotPauseRollbackOrCloseAutomatically: true, requiresPrReviewedEvidence: true, requiresHumanApproval: true },
  };
}

export function proposeCycleClosure({ sourceCommit, publication, rollout, health, incidents, backlog, evidenceUrl }) {
  const decision = createPostReleaseDecision({ publication, rollout, health, incidents, closure: { status: 'blocked' }, backlog });
  if (decision.recommendation !== 'ready-to-close-cycle') throw new Error(`Ciclo ainda não pode ser encerrado: ${decision.blockers.join(', ') || decision.recommendation}.`);
  return {
    schemaVersion: '1.0', product: 'BemMeCuida', release: '0.11.0', candidate: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions',
    generatedAt: new Date().toISOString(), status: 'ready-for-human-closure', sourceCommit: assertSourceCommit(sourceCommit), evidenceUrl: assertHttpsUrl(evidenceUrl),
    conditions: {
      releasePublished: true, rolloutCompleted: true, checkpoint24hPassed: true, checkpoint72hPassed: true, checkpoint7dPassed: true,
      noOpenSev1OrSev2: true, noBlockingSupportReports: true, backlog012Prepared: true,
    },
    controls: { requiresHumanApproval: true, requiresPrReviewedEvidence: true, doesNotCloseAutomatically: true },
  };
}
