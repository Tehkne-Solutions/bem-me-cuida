const SEVERITY_WEIGHT = { critical: 3, warning: 2, info: 1 };

const proposalKey = (proposal) => `${proposal.recordId}:${proposal.requestedAction}`;

export function validateResolutionProposals({ reconciliation, proposals, resolutionPolicy, validationPolicy, generatedAt }) {
  if (reconciliation?.cycleVersion !== '0.12.0' || reconciliation?.mutationAllowed !== false) {
    throw new Error('Reconciliação incompatível ou mutável.');
  }
  if (validationPolicy?.controls?.readOnly !== true) throw new Error('Política de validação incompatível.');

  const reconciliationItems = new Map((reconciliation.items ?? []).map((item) => [item.recordId, item]));
  const counts = new Map();
  for (const proposal of proposals ?? []) counts.set(proposalKey(proposal), (counts.get(proposalKey(proposal)) ?? 0) + 1);

  const byRecord = new Map();
  for (const proposal of proposals ?? []) {
    const list = byRecord.get(proposal.recordId) ?? [];
    list.push(proposal);
    byRecord.set(proposal.recordId, list);
  }

  const items = (proposals ?? []).map((proposal) => {
    const source = reconciliationItems.get(proposal.recordId);
    let classification = 'current-and-compatible';
    if (!proposal?.proposalId || proposal?.cycleVersion !== '0.12.0') classification = 'invalid-proposal-reference';
    else if (!source) classification = 'source-item-missing';
    else if (proposal.reconciliationSourceCommit !== reconciliation.sourceCommit) classification = 'stale-reconciliation';
    else if (!(resolutionPolicy.actionsByClassification?.[source.classification] ?? []).includes(proposal.requestedAction)) classification = 'action-classification-mismatch';
    else if ((counts.get(proposalKey(proposal)) ?? 0) > 1) classification = 'duplicate-proposal';
    else if (new Set((byRecord.get(proposal.recordId) ?? []).map((item) => item.requestedAction)).size > 1) classification = 'conflicting-proposal';

    return {
      proposalId: proposal.proposalId ?? 'invalid',
      recordId: proposal.recordId ?? 'invalid',
      requestedAction: proposal.requestedAction ?? 'invalid',
      sourceClassification: source?.classification ?? 'missing',
      proposalSourceCommit: proposal.reconciliationSourceCommit ?? 'invalid',
      currentSourceCommit: reconciliation.sourceCommit,
      classification,
      severity: validationPolicy.severity[classification],
      approvalAllowed: false,
      executionAllowed: false,
      mutationAllowed: false
    };
  }).sort((a, b) =>
    (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0) ||
    a.recordId.localeCompare(b.recordId) || a.proposalId.localeCompare(b.proposalId));

  const summary = Object.fromEntries(validationPolicy.classifications.map((name) => [name, items.filter((item) => item.classification === name).length]));
  const criticalCount = items.filter((item) => item.severity === 'critical').length;
  const warningCount = items.filter((item) => item.severity === 'warning').length;
  const report = {
    schemaVersion: '1.0',
    product: 'BemMeCuida',
    generatedBy: 'Tehkné Solutions',
    cycleVersion: '0.12.0',
    artifactType: 'cycle012-proposal-validation',
    generatedAt,
    sourceCommit: reconciliation.sourceCommit,
    status: criticalCount ? 'critical-proposal-review-required' : warningCount ? 'proposal-review-warnings-open' : 'proposal-validation-informational-only',
    recommendation: criticalCount ? 'human-review-required' : warningCount ? 'review-obsolete-or-duplicate-proposals' : 'no-automatic-action',
    approvalAllowed: false,
    executionAllowed: false,
    mutationAllowed: false,
    summary: { proposalCount: items.length, criticalCount, warningCount, byClassification: summary },
    items,
    controls: { ...validationPolicy.controls },
    privacy: { ...validationPolicy.privacy }
  };
  return assertProposalValidationSafe(report, validationPolicy);
}

export function assertProposalValidationSafe(report, policy) {
  if (report?.artifactType !== 'cycle012-proposal-validation' || report?.cycleVersion !== '0.12.0') throw new Error('Relatório incompatível.');
  if (report.approvalAllowed !== false || report.executionAllowed !== false || report.mutationAllowed !== false) throw new Error('Validação não pode aprovar, executar ou alterar propostas.');
  const text = JSON.stringify(report);
  if (/proposerFingerprint|sha256:[a-f0-9]{64}|actorId|email|login|username|token|password|secretValue/i.test(text)) throw new Error('Relatório contém identidade ou segredo.');
  for (const item of report.items ?? []) {
    if (!policy.classifications.includes(item.classification)) throw new Error(`Classificação inválida: ${item.classification}`);
    if (policy.severity[item.classification] !== item.severity) throw new Error(`Severidade divergente: ${item.proposalId}`);
  }
  return report;
}

export function renderProposalValidationMarkdown(report) {
  const lines = [
    '## Validação das propostas — BemMeCuida 0.12.0', '',
    `**Estado:** \`${report.status}\``,
    `**Recomendação:** \`${report.recommendation}\``,
    '**Aprovação automática:** `false`',
    '**Execução automática:** `false`', '',
    `- Propostas analisadas: **${report.summary.proposalCount}**`,
    `- Críticas: **${report.summary.criticalCount}**`,
    `- Alertas: **${report.summary.warningCount}**`, '',
    '| Proposta | Relato | Ação | Classificação | Severidade |',
    '|---|---|---|---|---|',
    ...(report.items.length ? report.items.map((item) => `| \`${item.proposalId}\` | \`${item.recordId}\` | \`${item.requestedAction}\` | \`${item.classification}\` | \`${item.severity}\` |`) : ['| — | — | — | Nenhuma proposta integrada | `info` |']),
    '', '> Este relatório não aprova, executa, reescreve ou integra propostas.', '', '**Tehkné Solutions**', ''
  ];
  return lines.join('\n');
}
