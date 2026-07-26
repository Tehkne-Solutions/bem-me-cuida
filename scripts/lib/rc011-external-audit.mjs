const sortUnique = (values) => [...new Set(values.filter(Boolean).map(String))].sort();

const unwrap = (wrapper) => {
  if (!wrapper || wrapper.accessible !== true) return null;
  return wrapper.data ?? null;
};

const collectNames = (payload, collectionKey) => {
  const collection = payload?.[collectionKey];
  if (!Array.isArray(collection)) return [];
  return sortUnique(collection.map((item) => item?.name));
};

const missingFrom = (expected, present) => {
  const presentSet = new Set(present);
  return expected.filter((name) => !presentSet.has(name));
};

const hasRequiredReviewers = (environmentDetails) => {
  const rules = environmentDetails?.protection_rules;
  if (!Array.isArray(rules)) return false;
  return rules.some((rule) => rule?.type === 'required_reviewers' && Array.isArray(rule.reviewers) && rule.reviewers.length > 0);
};

const accessSummary = (wrapper) => ({
  accessible: wrapper?.accessible === true,
  reason: wrapper?.accessible === true ? null : 'api_unavailable_or_unauthorized',
});

export function buildRc011ExternalAudit({
  manifest,
  repositoryVariablesResponse,
  environmentsResponse,
  environmentResponses,
  workflowRunId = null,
  generatedAt = new Date().toISOString(),
}) {
  const blockers = [];
  const repositoryVariablesPayload = unwrap(repositoryVariablesResponse);
  const environmentsPayload = unwrap(environmentsResponse);
  const expectedRepositoryVariables = sortUnique(manifest.repositoryVariables ?? []);
  const presentRepositoryVariables = collectNames(repositoryVariablesPayload, 'variables');
  const missingRepositoryVariables = missingFrom(expectedRepositoryVariables, presentRepositoryVariables);

  if (!repositoryVariablesPayload) blockers.push('Não foi possível consultar as variables do repositório.');
  for (const name of missingRepositoryVariables) blockers.push(`Variable ausente no repositório: ${name}.`);

  const presentEnvironmentNames = collectNames(environmentsPayload, 'environments');
  if (!environmentsPayload) blockers.push('Não foi possível consultar os environments do repositório.');

  const environmentAudits = (manifest.environments ?? []).map((expectedEnvironment) => {
    const responses = environmentResponses?.[expectedEnvironment.name] ?? {};
    const details = unwrap(responses.details);
    const variablesPayload = unwrap(responses.variables);
    const secretsPayload = unwrap(responses.secrets);
    const present = presentEnvironmentNames.includes(expectedEnvironment.name);
    const presentVariables = collectNames(variablesPayload, 'variables');
    const presentSecrets = collectNames(secretsPayload, 'secrets');
    const expectedVariables = sortUnique(expectedEnvironment.variables ?? []);
    const expectedSecrets = sortUnique(expectedEnvironment.secrets ?? []);
    const missingVariables = missingFrom(expectedVariables, presentVariables);
    const missingSecrets = missingFrom(expectedSecrets, presentSecrets);
    const reviewersConfigured = details ? hasRequiredReviewers(details) : false;

    if (!present) blockers.push(`Environment ausente: ${expectedEnvironment.name}.`);
    if (present && !details) blockers.push(`Não foi possível consultar a proteção de ${expectedEnvironment.name}.`);
    if (present && !variablesPayload) blockers.push(`Não foi possível consultar as variables de ${expectedEnvironment.name}.`);
    if (present && !secretsPayload) blockers.push(`Não foi possível consultar os nomes de secrets de ${expectedEnvironment.name}.`);
    for (const name of missingVariables) blockers.push(`Variable ausente em ${expectedEnvironment.name}: ${name}.`);
    for (const name of missingSecrets) blockers.push(`Secret obrigatório ausente em ${expectedEnvironment.name}: ${name}.`);
    if (expectedEnvironment.reviewersRequired && !reviewersConfigured) {
      blockers.push(`Revisor obrigatório não confirmado em ${expectedEnvironment.name}.`);
    }

    return {
      name: expectedEnvironment.name,
      present,
      access: {
        details: accessSummary(responses.details),
        variables: accessSummary(responses.variables),
        secrets: accessSummary(responses.secrets),
      },
      variables: {
        expected: expectedVariables,
        presentNames: presentVariables,
        missing: missingVariables,
      },
      secrets: {
        expectedNames: expectedSecrets,
        presentNames: presentSecrets,
        missing: missingSecrets,
        valuesRead: false,
      },
      protection: {
        required: expectedEnvironment.protectionRequired === true,
        reviewersRequired: expectedEnvironment.reviewersRequired === true,
        reviewersConfigured,
      },
    };
  });

  const recommendation = blockers.length === 0 ? 'ready-for-capture' : 'hold';

  return {
    schemaVersion: 1,
    release: manifest.release,
    repository: manifest.repository,
    generatedAt,
    generatedBy: 'Tehkné Solutions',
    workflowRunId: workflowRunId ? String(workflowRunId) : null,
    recommendation,
    repositoryVariables: {
      access: accessSummary(repositoryVariablesResponse),
      expected: expectedRepositoryVariables,
      presentNames: presentRepositoryVariables,
      missing: missingRepositoryVariables,
      valuesRead: false,
    },
    environmentsAccess: accessSummary(environmentsResponse),
    environments: environmentAudits,
    blockers: sortUnique(blockers),
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsSecretValues: false,
      containsVariableValues: false,
    },
  };
}

export function renderRc011ExternalAuditMarkdown(audit) {
  const lines = [
    '# Auditoria externa — BemMeCuida 0.11.0-rc.1',
    '',
    `- Recomendação: **${audit.recommendation}**`,
    `- Execução: ${audit.workflowRunId ? `\`${audit.workflowRunId}\`` : 'não informada'}`,
    `- Gerado em: ${audit.generatedAt}`,
    '',
    '## Variables do repositório',
    '',
    `- API acessível: ${audit.repositoryVariables.access.accessible ? 'sim' : 'não'}`,
    `- Esperadas: ${audit.repositoryVariables.expected.length}`,
    `- Presentes: ${audit.repositoryVariables.presentNames.length}`,
    `- Ausentes: ${audit.repositoryVariables.missing.length ? audit.repositoryVariables.missing.map((name) => `\`${name}\``).join(', ') : 'nenhuma'}`,
    '',
    '## Environments',
    '',
  ];

  for (const environment of audit.environments) {
    lines.push(`### ${environment.name}`);
    lines.push('');
    lines.push(`- Presente: ${environment.present ? 'sim' : 'não'}`);
    lines.push(`- Proteção consultável: ${environment.access.details.accessible ? 'sim' : 'não'}`);
    lines.push(`- Revisores obrigatórios confirmados: ${environment.protection.reviewersConfigured ? 'sim' : 'não'}`);
    lines.push(`- Variables ausentes: ${environment.variables.missing.length ? environment.variables.missing.map((name) => `\`${name}\``).join(', ') : 'nenhuma'}`);
    lines.push(`- Secrets ausentes: ${environment.secrets.missing.length ? environment.secrets.missing.map((name) => `\`${name}\``).join(', ') : 'nenhum'}`);
    lines.push('');
  }

  lines.push('## Bloqueadores');
  lines.push('');
  if (audit.blockers.length === 0) {
    lines.push('- Nenhum bloqueador estrutural detectado. A captura protegida ainda exige evidências HTTPS e revisão humana.');
  } else {
    for (const blocker of audit.blockers) lines.push(`- ${blocker}`);
  }
  lines.push('');
  lines.push('## Privacidade');
  lines.push('');
  lines.push('- Nenhum valor de secret foi lido ou registrado.');
  lines.push('- Nenhum valor de variable foi incluído no relatório.');
  lines.push('- Nenhum dado pessoal ou clínico foi processado.');
  lines.push('');
  lines.push('**Tehkné Solutions**');
  lines.push('');
  return lines.join('\n');
}
