const SEVERITY_WEIGHT = { critical: 3, warning: 2, info: 1 };

const keyFor = (decision) => `${decision.proposalId}:${decision.decision}`;

export function buildDecisionValidation({ decisions = [], proposalValidation, policy, generatedAt }) {
  if (proposalValidation?.cycleVersion !== '0.12.0') throw new Error('Validação de propostas incompatível.');
  if (policy?.cycleVersion !== '0.12.0' || policy.controls?.readOnly !== true) throw new Error('Política de decisões incompatível.');

  const proposals = new Map((proposalValidation.items ?? []).map((item) => [item.proposalId, item]));
  const sameKeyCount = new Map();
  const proposalDecisionKinds = new Map();
  for (const decision of decisions) {
    sameKeyCount.set(keyFor(decision), (sameKeyCount.get(keyFor(decision)) ?? 0) + 1);
    const kinds = proposalDecisionKinds.get(decision.proposalId) ?? new Set();
    kinds.add(decision.decision);
    proposalDecisionKinds.set(decision.proposalId, kinds);
  }

  const items = decisions.map((decision) => {
    const proposal = proposals.get(decision.proposalId);
    let classification = 'current-and-compatible';
    if (!decision?.decisionId || !decision?.proposalId || !decision?.decision) classification = 'invalid-decision-reference';
    else if (!proposal) classification = 'proposal-missing';
    else if (decision.proposalValidationSourceCommit !== proposalValidation.sourceCommit) classification = 'stale-proposal-validation';
    else if ((proposalDecisionKinds.get(decision.proposalId)?.size ?? 0) > 1) classification = 'conflicting-decision';
    else if ((sameKeyCount.get(keyFor(decision)) ?? 0) > 1) classification = 'duplicate-decision';
    else if (decision.decision === 'accept-for-future-correction' && proposal.classification !== 'current-and-compatible') classification = 'decision-classification-mismatch';

    return {
      decisionId: decision.decisionId ?? 'invalid',
      proposalId: decision.proposalId ?? 'invalid',
      decision: decision.decision ?? 'invalid',
      classification,
      severity: policy.severity[classification],
      proposalClassification: proposal?.classification ?? 'missing',
      decisionSourceCommit: decision.proposalValidationSourceCommit ?? 'missing',
      currentSourceCommit: proposalValidation.sourceCommit,
      executionAllowed: false,
      correctionAuthorized: false,
      activationAllowed: false
    };
  }).sort((a, b) => (SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]) || a.proposalId.localeCompare(b.proposalId));

  const report = {
    schemaVersion: '1.0', product: 'BemMeCuida', generatedBy: 'Tehkné Solutions', cycleVersion: '0.12.0',
    artifactType: 'cycle012-decision-validation', generatedAt, sourceCommit: proposalValidation.sourceCommit,
    status: items.some((item) => item.severity === 'critical') ? 'critical-decision-review-required' : items.some((item) => item.severity === 'warning') ? 'decision-validation-warnings-open' : 'decision-validation-informational-only',
    executionAllowed: false, correctionAuthorized: false, activationAllowed: false,
    summary: Object.fromEntries(policy.classifications.map((classification) => [classification, items.filter((item) => item.classification === classification).length])),
    items, controls: { ...policy.controls }
  };
  return assertDecisionValidationSafe(report, policy);
}

export function assertDecisionValidationSafe(report, policy) {
  if (report?.artifactType !== 'cycle012-decision-validation' || report?.cycleVersion !== '0.12.0') throw new Error('Relatório incompatível.');
  if (report.executionAllowed !== false || report.correctionAuthorized !== false || report.activationAllowed !== false) throw new Error('Validação não pode autorizar execução.');
  for (const item of report.items ?? []) {
    if (!policy.classifications.includes(item.classification)) throw new Error('Classificação inválida.');
    if (item.executionAllowed !== false || item.correctionAuthorized !== false || item.activationAllowed !== false) throw new Error('Item autorizou execução.');
  }
  return report;
}

export function renderDecisionValidationMarkdown(report) {
  const rows = report.items.length ? report.items.map((item) => `| \`${item.decisionId}\` | \`${item.proposalId}\` | \`${item.decision}\` | \`${item.classification}\` | \`${item.severity}\` |`) : ['| — | — | — | Nenhuma decisão integrada | `info` |'];
  return ['## Validação das decisões — BemMeCuida 0.12.0', '', `**Estado:** \`${report.status}\``, '**Execução autorizada:** `false`', '**Correção autorizada:** `false`', '**Ativação permitida:** `false`', '', '| Decisão | Proposta | Resultado humano | Classificação | Severidade |', '|---|---|---|---|---|', ...rows, '', '> O relatório é somente leitura e não aprova nem executa decisões.', '', '**Tehkné Solutions**', ''].join('\n');
}
