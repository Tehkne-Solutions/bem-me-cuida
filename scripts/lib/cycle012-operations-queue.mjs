const PRIORITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };
const SAFE_ROLE = /^[a-z][a-z0-9_]{2,63}$/;
const SAFE_STEP = /^[a-z][a-z0-9-]{2,63}$/;

const queueItem = ({ id, category, source, priority, ownerRole, accountableRole, dependencies = [], nextStep, evidenceRequirement, ready = true }) => ({
  id,
  category,
  source,
  status: ready ? 'ready-for-human-action' : 'waiting-on-dependencies',
  priority,
  ownerRole,
  accountableRole,
  dependencies: [...new Set(dependencies)].sort(),
  nextStep,
  evidenceRequirement,
  ready,
  executionAllowed: false,
});

const prioritySort = (a, b) =>
  Number(b.ready) - Number(a.ready) ||
  (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0) ||
  a.id.localeCompare(b.id);

export function buildOperationsQueue({ snapshot, config, generatedAt }) {
  if (snapshot?.cycleVersion !== '0.12.0' || snapshot?.activationAllowed !== false) {
    throw new Error('Snapshot operacional incompatível ou sem bloqueio de ativação.');
  }
  const items = [];

  for (const track of snapshot.reviews?.tracks ?? []) {
    if (track.status === 'passed') continue;
    const policy = config.reviewTracks?.[track.id];
    if (!policy) throw new Error(`Política ausente para a trilha ${track.id}.`);
    items.push(queueItem({
      id: `review-track-${track.id}`,
      category: 'human-review',
      source: `review:${track.id}`,
      priority: track.status === 'changes-required' ? 'critical' : policy.priority,
      ownerRole: policy.ownerRole,
      accountableRole: policy.accountableRole,
      nextStep: track.status === 'changes-required' ? 'resolve-review-changes' : policy.nextStep,
      evidenceRequirement: 'review-https-evidence',
    }));
  }

  if (snapshot.reviews?.minimumDistinctReviewersPass !== true) {
    const policy = config.reviewCoordination?.minimumDistinctReviewers;
    items.push(queueItem({
      id: 'review-minimum-distinct-reviewers',
      category: 'review-coordination',
      source: 'review:minimum-distinct-reviewers',
      priority: policy.priority,
      ownerRole: policy.ownerRole,
      accountableRole: policy.accountableRole,
      nextStep: policy.nextStep,
      evidenceRequirement: 'independent-review-evidence',
    }));
  }

  if (snapshot.reviews?.securityPrivacySeparationPass !== true) {
    const policy = config.reviewCoordination?.securityPrivacySeparation;
    const candidateDependencies = ['review-track-security', 'review-track-privacy'];
    const openTrackIds = new Set(items.map((item) => item.id));
    const dependencies = candidateDependencies.filter((id) => openTrackIds.has(id));
    items.push(queueItem({
      id: 'review-security-privacy-separation',
      category: 'review-coordination',
      source: 'review:security-privacy-separation',
      priority: policy.priority,
      ownerRole: policy.ownerRole,
      accountableRole: policy.accountableRole,
      dependencies,
      nextStep: policy.nextStep,
      evidenceRequirement: 'independent-reviewer-separation-evidence',
      ready: dependencies.length === 0,
    }));
  }

  const failedExternalGateIds = new Set((snapshot.externalGates ?? []).filter((gate) => !gate.passed).map((gate) => gate.id));
  for (const gate of snapshot.externalGates ?? []) {
    if (gate.passed) continue;
    const policy = config.externalGates?.[gate.id];
    if (!policy) throw new Error(`Política ausente para o gate ${gate.id}.`);
    const dependencies = (policy.dependencies ?? [])
      .filter((dependency) => failedExternalGateIds.has(dependency))
      .map((dependency) => `external-${dependency}`);
    items.push(queueItem({
      id: `external-${gate.id}`,
      category: 'external-gate',
      source: `external:${gate.id}`,
      priority: policy.priority,
      ownerRole: policy.ownerRole,
      accountableRole: policy.accountableRole,
      dependencies,
      nextStep: policy.nextStep,
      evidenceRequirement: policy.evidenceRequirement,
      ready: dependencies.length === 0,
    }));
  }

  const orderedItems = items.sort(prioritySort);
  const byPriority = Object.fromEntries(config.priorities.map((priority) => [priority, orderedItems.filter((item) => item.priority === priority).length]));
  const ownerRoles = [...new Set(orderedItems.map((item) => item.ownerRole))].sort();
  const byOwnerRole = Object.fromEntries(ownerRoles.map((role) => [role, orderedItems.filter((item) => item.ownerRole === role).map((item) => item.id)]));
  const readyItems = orderedItems.filter((item) => item.ready);
  const nextItems = readyItems.slice(0, 3).map((item) => item.id);

  const queue = {
    schemaVersion: '1.0',
    product: 'BemMeCuida',
    generatedBy: 'Tehkné Solutions',
    cycleVersion: '0.12.0',
    artifactType: 'cycle012-operations-queue',
    generatedAt,
    sourceCommit: snapshot.sourceCommit,
    status: orderedItems.length ? 'blocked-work-queue-open' : 'no-operational-pendencies',
    recommendation: orderedItems.length ? 'resolve-operational-pendencies' : 'prepare-human-proposal-review',
    activationAllowed: false,
    executionAllowed: false,
    summary: {
      totalItems: orderedItems.length,
      readyItems: readyItems.length,
      waitingItems: orderedItems.length - readyItems.length,
      ownerRoleCount: ownerRoles.length,
      byPriority,
    },
    nextItems,
    items: orderedItems,
    byOwnerRole,
    controls: { ...config.controls },
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsRawFeedback: false,
      containsJournalContent: false,
      containsSecrets: false,
      containsRawIdentity: false,
      containsHumanAssignments: false,
    },
  };
  return assertOperationsQueueSafe(queue, config);
}

export function assertOperationsQueueSafe(queue, config) {
  const text = JSON.stringify(queue);
  if (/reviewerFingerprint|actorId|actor_id|assignee|email|token|secretValue/i.test(text)) {
    throw new Error('Fila contém identidade, atribuição humana ou segredo não permitido.');
  }
  if (queue.activationAllowed !== false || queue.executionAllowed !== false) {
    throw new Error('Fila não pode ativar o ciclo nem executar próximos passos.');
  }
  for (const item of queue.items ?? []) {
    if (!SAFE_ROLE.test(item.ownerRole) || !SAFE_ROLE.test(item.accountableRole)) throw new Error(`Papel inválido em ${item.id}.`);
    if (!SAFE_STEP.test(item.nextStep)) throw new Error(`Próximo passo inválido em ${item.id}.`);
    if (!config.priorities.includes(item.priority)) throw new Error(`Prioridade inválida em ${item.id}.`);
    if (item.executionAllowed !== false) throw new Error(`Execução indevidamente permitida em ${item.id}.`);
  }
  for (const control of ['readOnly', 'roleBasedOnly', 'doesNotAssignPeople', 'doesNotExecuteNextSteps', 'doesNotActivateCycle', 'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'doesNotMergePullRequests', 'doesNotPublishBuilds', 'doesNotDeleteEnvironments']) {
    if (queue.controls?.[control] !== true || config.controls?.[control] !== true) throw new Error(`Controle ausente: ${control}.`);
  }
  return queue;
}

const priorityIcon = (priority) => priority === 'critical' ? '⛔' : priority === 'high' ? '🔶' : priority === 'medium' ? '🔷' : '▫️';

export function renderOperationsQueueMarkdown(queue, command = 'queue') {
  const header = [
    '## Fila operacional — BemMeCuida 0.12.0',
    '',
    `**Estado:** \`${queue.status}\``,
    `**Recomendação:** \`${queue.recommendation}\``,
    '**Execução automática:** `false`',
    '',
  ];
  const queueSection = [
    '### Pendências priorizadas',
    '',
    '| Prioridade | Pendência | Responsável | Aprovador | Estado | Próximo passo |',
    '|---|---|---|---|---|---|',
    ...(queue.items.length ? queue.items.map((item) => `| ${priorityIcon(item.priority)} \`${item.priority}\` | \`${item.id}\` | \`${item.ownerRole}\` | \`${item.accountableRole}\` | \`${item.status}\` | \`${item.nextStep}\` |`) : ['| — | Nenhuma pendência | — | — | — | — |']),
    '',
  ];
  const ownersSection = [
    '### Matriz por papel responsável',
    '',
    '| Papel | Pendências |',
    '|---|---|',
    ...Object.entries(queue.byOwnerRole).map(([role, ids]) => `| \`${role}\` | ${ids.map((id) => `\`${id}\``).join(', ')} |`),
    ...(Object.keys(queue.byOwnerRole).length ? [] : ['| — | Nenhuma pendência |']),
    '',
  ];
  const nextSection = [
    '### Próximos passos desbloqueados',
    '',
    ...(queue.nextItems.length ? queue.nextItems.map((id, index) => {
      const item = queue.items.find((candidate) => candidate.id === id);
      return `${index + 1}. \`${item.nextStep}\` — \`${item.ownerRole}\` — evidência: \`${item.evidenceRequirement}\``;
    }) : ['- Nenhum próximo passo desbloqueado.']),
    '',
  ];
  const footer = [
    '> Fila somente leitura. Os papéis representam responsabilidades operacionais, não atribuições a pessoas.',
    '> Nenhum item executa ação, cria migration, publica build, faz merge ou ativa o ciclo.',
    '',
    '**Tehkné Solutions**',
    '',
  ];
  const sections = command === 'owners' ? ownersSection : command === 'next' ? nextSection : [...queueSection, ...ownersSection, ...nextSection];
  const markdown = [...header, ...sections, ...footer].join('\n');
  if (/sha256:[0-9a-f]{64}|reviewerFingerprint|actorId|actor_id|@[a-z0-9_-]+/i.test(markdown)) {
    throw new Error('Markdown da fila contém identidade não permitida.');
  }
  return markdown;
}
