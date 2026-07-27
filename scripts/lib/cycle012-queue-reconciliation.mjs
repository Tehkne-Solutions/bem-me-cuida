import { assertQueueUpdateRecordSafe } from './cycle012-queue-update.mjs';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const SEVERITY_WEIGHT = { critical: 3, warning: 2, info: 1 };

const uniqueSorted = (values) => [...new Set(values)].sort();

function validQueueItemIds(queueConfig) {
  const ids = [];
  for (const track of Object.keys(queueConfig.reviewTracks ?? {})) ids.push(`review-track-${track}`);
  ids.push('review-minimum-distinct-reviewers', 'review-security-privacy-separation');
  for (const gate of Object.keys(queueConfig.externalGates ?? {})) ids.push(`external-${gate}`);
  return new Set(ids);
}

function sourceForItemId(itemId) {
  if (itemId.startsWith('review-track-')) return `review:${itemId.slice('review-track-'.length)}`;
  if (itemId === 'review-minimum-distinct-reviewers') return 'review:minimum-distinct-reviewers';
  if (itemId === 'review-security-privacy-separation') return 'review:security-privacy-separation';
  if (itemId.startsWith('external-')) return `external:${itemId.slice('external-'.length)}`;
  return 'unknown';
}

function expectedEvidenceKind(itemId, source, policy) {
  if (itemId.startsWith('review-')) return policy.evidenceKindBySource?.review ?? 'review';
  return policy.evidenceKindBySource?.[source] ?? 'none';
}

function classifyRecord({ record, queue, queueItem, validIds, policy }) {
  if (!validIds.has(record.queueItemId)) return 'invalid-item-reference';
  if (!queueItem) return 'source-reflected-closed';

  const source = queueItem.source ?? sourceForItemId(record.queueItemId);
  const expectedKind = expectedEvidenceKind(record.queueItemId, source, policy);
  if (record.progress.evidenceKind !== 'none' && record.progress.evidenceKind !== expectedKind) return 'state-conflict';

  const currentDependencies = new Set(queueItem.dependencies ?? []);
  const reportedDependencies = record.progress.dependencyIds ?? [];
  if (record.progress.dependencyState === 'blocked' && currentDependencies.size === 0) return 'state-conflict';

  if (record.sourceCommit !== queue.sourceCommit) return 'stale-source-commit';

  if (
    ['partially-resolved', 'resolution-reported'].includes(record.progress.dependencyState) &&
    reportedDependencies.some((dependency) => currentDependencies.has(dependency))
  ) {
    return 'dependency-report-not-reflected';
  }

  if (['evidence-submitted', 'review-requested'].includes(record.progress.state)) {
    return 'evidence-awaiting-source-reflection';
  }

  return 'aligned-open-item';
}

export function buildQueueReconciliation({ queue, records, queueConfig, updatePolicy, policy, generatedAt }) {
  if (queue?.cycleVersion !== '0.12.0' || queue.activationAllowed !== false || queue.executionAllowed !== false) {
    throw new Error('Fila incompatível ou sem bloqueios obrigatórios.');
  }
  if (!SHA_PATTERN.test(queue.sourceCommit ?? '')) throw new Error('sourceCommit atual inválido.');
  if (policy?.cycleVersion !== '0.12.0' || policy.controls?.readOnly !== true) throw new Error('Política de reconciliação incompatível.');

  const validIds = validQueueItemIds(queueConfig);
  const currentItems = new Map((queue.items ?? []).map((item) => [item.id, item]));
  const validated = (records ?? [])
    .map((record) => assertQueueUpdateRecordSafe(record, updatePolicy))
    .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt) || a.recordId.localeCompare(b.recordId));

  const items = validated.map((record) => {
    const queueItem = currentItems.get(record.queueItemId) ?? null;
    const classification = classifyRecord({ record, queue, queueItem, validIds, policy });
    const severity = policy.severity?.[classification];
    if (!severity) throw new Error(`Severidade ausente para ${classification}.`);
    return {
      recordId: record.recordId,
      queueItemId: record.queueItemId,
      classification,
      severity,
      source: queueItem?.source ?? sourceForItemId(record.queueItemId),
      submittedAt: record.submittedAt,
      recordSourceCommit: record.sourceCommit,
      currentSourceCommit: queue.sourceCommit,
      progressState: record.progress.state,
      dependencyState: record.progress.dependencyState,
      dependencyIds: uniqueSorted(record.progress.dependencyIds ?? []),
      evidenceKind: record.progress.evidenceKind,
      evidenceUrl: record.progress.evidenceUrl,
      currentItemPresent: Boolean(queueItem),
      currentItemStatus: queueItem?.status ?? 'not-open-in-current-queue',
      currentItemReady: queueItem?.ready ?? false,
      currentDependencies: uniqueSorted(queueItem?.dependencies ?? []),
      mutationAllowed: false,
    };
  }).sort((a, b) =>
    (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0) ||
    a.queueItemId.localeCompare(b.queueItemId) ||
    a.recordId.localeCompare(b.recordId),
  );

  const byClassification = Object.fromEntries(policy.classifications.map((classification) => [
    classification,
    items.filter((item) => item.classification === classification).length,
  ]));
  const criticalCount = items.filter((item) => item.severity === 'critical').length;
  const warningCount = items.filter((item) => item.severity === 'warning').length;
  const infoCount = items.filter((item) => item.severity === 'info').length;

  const report = {
    schemaVersion: '1.0',
    product: 'BemMeCuida',
    generatedBy: 'Tehkné Solutions',
    cycleVersion: '0.12.0',
    artifactType: 'cycle012-queue-reconciliation',
    generatedAt,
    sourceCommit: queue.sourceCommit,
    status: criticalCount ? 'critical-divergence-review-required' : warningCount ? 'reconciliation-warnings-open' : 'reconciliation-informational-only',
    recommendation: criticalCount ? 'human-review-required' : warningCount ? 'review-stale-or-unreflected-updates' : 'no-reconciliation-action-required',
    activationAllowed: false,
    mutationAllowed: false,
    summary: {
      recordCount: items.length,
      criticalCount,
      warningCount,
      infoCount,
      byClassification,
    },
    items,
    controls: { ...policy.controls },
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsRawFeedback: false,
      containsJournalContent: false,
      containsSecrets: false,
      containsRawIdentity: false,
      containsPseudonymousActorReference: false,
    },
  };
  return assertQueueReconciliationSafe(report, policy);
}

export function assertQueueReconciliationSafe(report, policy) {
  if (report?.cycleVersion !== '0.12.0' || report?.artifactType !== 'cycle012-queue-reconciliation') {
    throw new Error('Relatório de reconciliação incompatível.');
  }
  if (report.activationAllowed !== false || report.mutationAllowed !== false) {
    throw new Error('Reconciliação não pode ativar o ciclo nem produzir mutações.');
  }
  const text = JSON.stringify(report);
  if (/reporterFingerprint|sha256:[a-f0-9]{64}|actorId|actor_id|email|login|username|token|password|secretValue/i.test(text)) {
    throw new Error('Relatório contém identidade ou segredo não permitido.');
  }
  for (const item of report.items ?? []) {
    if (!policy.classifications.includes(item.classification)) throw new Error(`Classificação inválida em ${item.recordId}.`);
    if (policy.severity?.[item.classification] !== item.severity) throw new Error(`Severidade divergente em ${item.recordId}.`);
    if (item.mutationAllowed !== false) throw new Error(`Mutação indevidamente permitida em ${item.recordId}.`);
  }
  for (const control of [
    'readOnly', 'deterministic', 'doesNotRewriteUpdates', 'doesNotChangeQueueReadiness', 'doesNotResolveDependencies',
    'doesNotChangeReviews', 'doesNotChangeGates', 'doesNotActivateCycle', 'doesNotAuthorizeMigrations',
    'doesNotAuthorizeImplementation', 'doesNotMergePullRequests', 'doesNotPublishBuilds', 'doesNotDeleteEnvironments',
  ]) {
    if (report.controls?.[control] !== true || policy.controls?.[control] !== true) throw new Error(`Controle ausente: ${control}.`);
  }
  return report;
}

const severityIcon = (severity) => severity === 'critical' ? '⛔' : severity === 'warning' ? '⚠️' : 'ℹ️';

export function renderQueueReconciliationMarkdown(report) {
  const lines = [
    '## Reconciliação da fila — BemMeCuida 0.12.0',
    '',
    `**Estado:** \`${report.status}\``,
    `**Recomendação:** \`${report.recommendation}\``,
    '**Correção automática:** `false`',
    '**Ativação permitida:** `false`',
    '',
    '### Resumo',
    '',
    `- Registros analisados: **${report.summary.recordCount}**`,
    `- Críticos: **${report.summary.criticalCount}**`,
    `- Alertas: **${report.summary.warningCount}**`,
    `- Informativos: **${report.summary.infoCount}**`,
    '',
    '### Resultado por relato',
    '',
    '| Severidade | Registro | Pendência | Classificação | Commit do relato | Commit atual |',
    '|---|---|---|---|---|---|',
    ...(report.items.length ? report.items.map((item) =>
      `| ${severityIcon(item.severity)} \`${item.severity}\` | \`${item.recordId}\` | \`${item.queueItemId}\` | \`${item.classification}\` | \`${item.recordSourceCommit.slice(0, 12)}\` | \`${item.currentSourceCommit.slice(0, 12)}\` |`,
    ) : ['| ℹ️ `info` | — | — | Nenhum relato versionado | — | — |']),
    '',
    '> O relatório apenas compara relatos com as fontes de verdade atuais.',
    '> Nenhum relato, gate, revisão, dependência ou estado da fila é alterado automaticamente.',
    '',
    '**Tehkné Solutions**',
    '',
  ];
  const markdown = lines.join('\n');
  if (/reporterFingerprint|sha256:[a-f0-9]{64}|actorId|actor_id|@[a-z0-9_-]+/i.test(markdown)) {
    throw new Error('Markdown de reconciliação contém identidade não permitida.');
  }
  return markdown;
}
