import { createHash } from 'node:crypto';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,95}$/;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;
const TERMINAL_STATE_PATTERN = /^(completed|complete|closed|resolved|approved|done)$/i;
const RAW_IDENTITY_PATTERN = /(actorId|actor_id|email|login|username|token|password|secretValue)/i;
const FREE_TEXT_KEY_PATTERN = /(note|notes|comment|comments|description|message|freeText)/i;

const uniqueSorted = (values) => [...new Set(values)].sort();
const parseDependencies = (input) => uniqueSorted(
  (Array.isArray(input) ? input : String(input ?? '').split(','))
    .map((value) => String(value).trim())
    .filter(Boolean),
);

const assertHttpsEvidence = (value, policy) => {
  const url = String(value ?? '').trim();
  if (!url) return null;
  if (policy.evidence?.httpsOnly === true && !HTTPS_PATTERN.test(url)) throw new Error('evidenceUrl deve usar HTTPS.');
  const parsed = new URL(url);
  if (policy.evidence?.credentialsForbidden === true && (parsed.username || parsed.password)) {
    throw new Error('evidenceUrl não pode conter credenciais.');
  }
  if (policy.evidence?.localHostsForbidden === true) {
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
      throw new Error('evidenceUrl não pode apontar para host local.');
    }
  }
  return url;
};

const actorFingerprint = (actorId) => {
  const normalized = String(actorId ?? '').trim();
  if (!/^\d+$/.test(normalized)) throw new Error('actorId inválido para fingerprint pseudonimizado.');
  return `sha256:${createHash('sha256').update(`cycle012-queue-update:${normalized}`).digest('hex')}`;
};

export function buildQueueUpdateRecord({
  sourceCommit,
  queue,
  policy,
  queueItemId,
  progressState,
  dependencyState,
  dependencyIds,
  evidenceKind,
  evidenceUrl,
  actorId,
  submittedAt,
}) {
  if (!SHA_PATTERN.test(String(sourceCommit ?? ''))) throw new Error('sourceCommit deve ser um SHA completo.');
  if (queue?.cycleVersion !== '0.12.0' || queue?.activationAllowed !== false || queue?.executionAllowed !== false) {
    throw new Error('Fila incompatível ou sem bloqueios obrigatórios.');
  }
  const itemId = String(queueItemId ?? '').trim();
  if (!ITEM_ID_PATTERN.test(itemId)) throw new Error('queueItemId inválido.');
  const item = (queue.items ?? []).find((candidate) => candidate.id === itemId);
  if (!item) throw new Error(`Pendência não encontrada na fila: ${itemId}.`);

  const progress = String(progressState ?? '').trim();
  const dependency = String(dependencyState ?? '').trim();
  const kind = String(evidenceKind ?? 'none').trim();
  if (!policy.progressStates?.includes(progress) || TERMINAL_STATE_PATTERN.test(progress)) throw new Error('progressState inválido ou terminal.');
  if (!policy.dependencyStates?.includes(dependency) || TERMINAL_STATE_PATTERN.test(dependency)) throw new Error('dependencyState inválido ou terminal.');
  if (!policy.evidenceKinds?.includes(kind)) throw new Error('evidenceKind inválido.');

  const reportedDependencies = parseDependencies(dependencyIds);
  const allowedDependencies = new Set(item.dependencies ?? []);
  for (const dependencyId of reportedDependencies) {
    if (!ITEM_ID_PATTERN.test(dependencyId) || !allowedDependencies.has(dependencyId)) {
      throw new Error(`Dependência não pertence à pendência ${itemId}: ${dependencyId}.`);
    }
  }
  if (dependency === 'unchanged' && reportedDependencies.length) throw new Error('dependencyIds deve ficar vazio quando dependencyState é unchanged.');
  if (dependency !== 'unchanged' && !reportedDependencies.length) throw new Error('dependencyIds é obrigatório para atualização de dependência.');

  const normalizedEvidenceUrl = assertHttpsEvidence(evidenceUrl, policy);
  const evidenceRequired = policy.evidence?.requiredForProgressStates?.includes(progress) === true;
  if (evidenceRequired && (!normalizedEvidenceUrl || kind === 'none')) throw new Error('Evidência HTTPS e evidenceKind são obrigatórios para este progresso.');
  if (kind === 'none' && normalizedEvidenceUrl) throw new Error('evidenceKind none não pode conter evidenceUrl.');
  if (kind !== 'none' && !normalizedEvidenceUrl) throw new Error('evidenceUrl é obrigatório quando evidenceKind não é none.');

  const submitted = String(submittedAt ?? '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(submitted) || Number.isNaN(Date.parse(submitted))) {
    throw new Error('submittedAt deve ser uma data ISO UTC.');
  }
  const reporterFingerprint = actorFingerprint(actorId);
  const recordSeed = [sourceCommit.toLowerCase(), itemId, progress, dependency, reportedDependencies.join(','), kind, normalizedEvidenceUrl ?? '', reporterFingerprint, submitted].join('|');
  const recordId = `queue-update-${createHash('sha256').update(recordSeed).digest('hex').slice(0, 20)}`;

  const record = {
    schemaVersion: '1.0',
    product: 'BemMeCuida',
    generatedBy: 'Tehkné Solutions',
    cycleVersion: '0.12.0',
    artifactType: 'cycle012-queue-update',
    recordId,
    status: 'reported-awaiting-human-review',
    effect: 'informational-only',
    sourceCommit: sourceCommit.toLowerCase(),
    queueItemId: itemId,
    submittedAt: submitted,
    reporterFingerprint,
    progress: {
      state: progress,
      dependencyState: dependency,
      dependencyIds: reportedDependencies,
      evidenceKind: kind,
      evidenceUrl: normalizedEvidenceUrl,
    },
    controls: { ...policy.controls },
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsRawFeedback: false,
      containsJournalContent: false,
      containsSecrets: false,
      containsRawIdentity: false,
      containsPseudonymousActorReference: true,
    },
  };
  return assertQueueUpdateRecordSafe(record, policy);
}

export function assertQueueUpdateRecordSafe(record, policy) {
  if (record?.cycleVersion !== '0.12.0' || record?.artifactType !== 'cycle012-queue-update') throw new Error('Registro de atualização incompatível.');
  if (record.status !== 'reported-awaiting-human-review' || record.effect !== 'informational-only') throw new Error('Registro não pode produzir efeito operacional direto.');
  if (!/^sha256:[a-f0-9]{64}$/i.test(record.reporterFingerprint ?? '')) throw new Error('Fingerprint pseudonimizado inválido.');
  const text = JSON.stringify(record);
  if (RAW_IDENTITY_PATTERN.test(text.replace(/reporterFingerprint/g, ''))) throw new Error('Registro contém identidade ou segredo não permitido.');
  for (const key of Object.keys(record)) if (FREE_TEXT_KEY_PATTERN.test(key)) throw new Error(`Campo de texto livre proibido: ${key}.`);
  for (const control of ['informationalOnly', 'doesNotCompleteItems', 'doesNotChangeQueueReadiness', 'doesNotResolveDependencies', 'doesNotChangeGates', 'doesNotActivateCycle', 'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'doesNotMergePullRequests', 'doesNotPublishBuilds', 'doesNotDeleteEnvironments']) {
    if (record.controls?.[control] !== true || policy.controls?.[control] !== true) throw new Error(`Controle ausente: ${control}.`);
  }
  return record;
}

export function applyQueueUpdates(queue, records, policy) {
  if (queue?.activationAllowed !== false || queue?.executionAllowed !== false) throw new Error('Fila precisa permanecer bloqueada.');
  const validated = (records ?? []).map((record) => assertQueueUpdateRecordSafe(record, policy)).sort((a, b) =>
    Date.parse(a.submittedAt) - Date.parse(b.submittedAt) || a.recordId.localeCompare(b.recordId),
  );
  const queueIds = new Set((queue.items ?? []).map((item) => item.id));
  const latestByItem = new Map();
  let unmatchedUpdateCount = 0;
  for (const record of validated) {
    if (!queueIds.has(record.queueItemId)) {
      unmatchedUpdateCount += 1;
      continue;
    }
    latestByItem.set(record.queueItemId, record);
  }
  const items = queue.items.map((item) => {
    const record = latestByItem.get(item.id);
    if (!record) return item;
    return {
      ...item,
      reportedProgress: {
        recordId: record.recordId,
        state: record.progress.state,
        dependencyState: record.progress.dependencyState,
        dependencyIds: record.progress.dependencyIds,
        evidenceKind: record.progress.evidenceKind,
        evidenceUrl: record.progress.evidenceUrl,
        submittedAt: record.submittedAt,
        reportedAgainstCommit: record.sourceCommit,
      },
    };
  });
  const enriched = {
    ...queue,
    items,
    summary: {
      ...queue.summary,
      mergedUpdateCount: validated.length,
      itemsWithUpdates: latestByItem.size,
      unmatchedUpdateCount,
    },
  };
  const text = JSON.stringify(enriched);
  if (/reporterFingerprint|sha256:[a-f0-9]{64}/i.test(text)) throw new Error('Fila enriquecida não pode expor fingerprint do relator.');
  if (enriched.activationAllowed !== false || enriched.executionAllowed !== false) throw new Error('Atualizações não podem mudar bloqueios da fila.');
  return enriched;
}
