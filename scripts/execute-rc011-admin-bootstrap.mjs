import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RC011_ENVIRONMENTS,
  buildBootstrapPlan,
  buildVariableMaps,
  parseAdminBootstrapConfig,
  sanitizeBootstrapResult,
  validateReviewerLogin,
} from './lib/rc011-admin-bootstrap.mjs';

const argValue = (name, fallback = '') => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
};

const mode = argValue('--mode', 'plan');
const outputJson = argValue('--output-json', 'artifacts/bemmecuida-0.11.0-rc.1-admin-bootstrap.json');
const outputMd = argValue('--output-md', 'artifacts/bemmecuida-0.11.0-rc.1-admin-bootstrap.md');
const rawConfig = process.env.RC011_BOOTSTRAP_CONFIG_JSON ?? '';
const actor = process.env.GITHUB_ACTOR ?? '';
const reviewerLogin = validateReviewerLogin(process.env.RC011_REVIEWER_LOGIN ?? '', mode === 'apply' ? actor : '');
const config = parseAdminBootstrapConfig(rawConfig);
const variableMaps = buildVariableMaps(config);
const operations = [];
const blockers = [];

const writeOutputs = (result) => {
  mkdirSync(dirname(outputJson), { recursive: true });
  mkdirSync(dirname(outputMd), { recursive: true });
  writeFileSync(outputJson, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  const lines = [
    '# Bootstrap administrativo — BemMeCuida 0.11.0-rc.1',
    '',
    `- Modo: **${result.mode}**`,
    `- Aplicado: **${result.applied ? 'sim' : 'não'}**`,
    `- Recomendação: **${result.recommendation}**`,
    `- Commit: \`${result.sourceCommit ?? 'não informado'}\``,
    '',
    '## Operações',
    '',
    ...(result.operations.length ? result.operations.map((item) => `- ${item}`) : ['- Nenhuma mutação executada.']),
    '',
    '## Bloqueadores',
    '',
    ...(result.blockers.length ? result.blockers.map((item) => `- ${item}`) : ['- Nenhum bloqueador estrutural registrado.']),
    '',
    '## Privacidade',
    '',
    '- Nenhum valor de secret foi incluído.',
    '- Nenhum valor de variable foi incluído.',
    '- Nenhum dado pessoal ou clínico foi processado.',
    '',
    '**Tehkné Solutions**',
    '',
  ];
  writeFileSync(outputMd, lines.join('\n'), 'utf8');
};

const runGh = (args, { input, token, label, allowFailure = false } = {}) => {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    input,
    env: { ...process.env, GH_TOKEN: token ?? process.env.GH_TOKEN ?? '' },
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${label ?? 'Operação GitHub'} falhou sem expor parâmetros ou valores.`);
  }
  return result;
};

const setVariable = ({ name, value, environment, token, repository }) => {
  const args = ['variable', 'set', name, '--repo', repository, '--body', value];
  if (environment) args.push('--env', environment);
  runGh(args, { token, label: `Configuração da variable ${name}` });
};

const setEnvironmentSecret = ({ environment, value, token, repository }) => {
  runGh(['secret', 'set', 'EXPO_TOKEN', '--repo', repository, '--env', environment], {
    input: value,
    token,
    label: `Configuração do secret em ${environment}`,
  });
};

const ensureEnvironment = ({ environment, reviewerId, token, repository }) => {
  const payload = {
    wait_timer: 0,
    prevent_self_review: true,
    reviewers: [{ type: 'User', id: reviewerId }],
    deployment_branch_policy: {
      protected_branches: false,
      custom_branch_policies: true,
    },
  };
  runGh(['api', '--method', 'PUT', `repos/${repository}/environments/${environment}`, '--input', '-'], {
    input: JSON.stringify(payload),
    token,
    label: `Criação ou atualização do environment ${environment}`,
  });

  const policies = runGh(
    ['api', `repos/${repository}/environments/${environment}/deployment-branch-policies`, '--jq', '.branch_policies[].name'],
    { token, label: `Consulta das políticas de branch de ${environment}`, allowFailure: true },
  );
  const names = String(policies.stdout ?? '').split(/\r?\n/).filter(Boolean);
  if (!names.includes('main')) {
    runGh(
      ['api', '--method', 'POST', `repos/${repository}/environments/${environment}/deployment-branch-policies`, '--input', '-'],
      { input: JSON.stringify({ name: 'main' }), token, label: `Política main de ${environment}` },
    );
  }
};

try {
  if (!['plan', 'apply'].includes(mode)) throw new Error('mode deve ser plan ou apply.');

  if (mode === 'plan') {
    const plan = buildBootstrapPlan({ config, reviewerConfigured: false });
    const result = sanitizeBootstrapResult({
      mode,
      applied: false,
      sourceCommit: process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
      operations: [
        `Variables do repositório planejadas: ${plan.repositoryVariables.length}.`,
        `Environments planejados: ${plan.environments.map((item) => item.name).join(', ')}.`,
        'Secret planejado por environment: EXPO_TOKEN.',
        'Revisor obrigatório e política da branch main serão configurados no apply.',
      ],
      blockers: [
        'O modo plan não modifica GitHub, EAS ou Supabase.',
        'O apply exige RC011_ADMIN_TOKEN e RC011_EXPO_TOKEN como secrets do repositório.',
      ],
    });
    writeOutputs(result);
    console.log('Plano do bootstrap administrativo gerado sem mutações.');
    console.log('Tehkné Solutions');
    process.exit(0);
  }

  const adminToken = process.env.RC011_ADMIN_TOKEN ?? '';
  const expoToken = process.env.RC011_EXPO_TOKEN ?? '';
  const repository = process.env.GITHUB_REPOSITORY ?? '';
  if (!repository.includes('/')) throw new Error('GITHUB_REPOSITORY ausente ou inválido.');
  if (adminToken.length < 20) throw new Error('RC011_ADMIN_TOKEN ausente. Cadastre o secret antes do apply.');
  if (expoToken.length < 20) throw new Error('RC011_EXPO_TOKEN ausente. Cadastre o secret antes do apply.');

  const reviewer = runGh(['api', `users/${reviewerLogin}`, '--jq', '.id'], {
    token: adminToken,
    label: 'Resolução do revisor obrigatório',
  });
  const reviewerId = Number.parseInt(String(reviewer.stdout ?? '').trim(), 10);
  if (!Number.isInteger(reviewerId) || reviewerId <= 0) throw new Error('Não foi possível resolver o revisor obrigatório.');

  for (const [name, value] of Object.entries(variableMaps.repository)) {
    setVariable({ name, value, token: adminToken, repository });
  }
  operations.push(`Variables públicas configuradas no repositório: ${Object.keys(variableMaps.repository).length}.`);

  for (const environment of RC011_ENVIRONMENTS) {
    ensureEnvironment({ environment, reviewerId, token: adminToken, repository });
    for (const [name, value] of Object.entries(variableMaps.environments[environment])) {
      setVariable({ name, value, environment, token: adminToken, repository });
    }
    setEnvironmentSecret({ environment, value: expoToken, token: adminToken, repository });
    operations.push(`Environment ${environment} criado ou atualizado com revisão obrigatória, branch main, variables e secret nominal.`);
  }

  const result = sanitizeBootstrapResult({
    mode,
    applied: true,
    sourceCommit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    operations,
    blockers,
  });
  writeOutputs(result);
  console.log('Bootstrap administrativo aplicado de forma idempotente.');
  console.log('Nenhum valor sensível foi incluído no relatório.');
  console.log('Tehkné Solutions');
} catch (error) {
  blockers.push(error instanceof Error ? error.message : 'Falha desconhecida no bootstrap.');
  const result = sanitizeBootstrapResult({
    mode,
    applied: false,
    sourceCommit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    operations,
    blockers,
  });
  writeOutputs(result);
  console.error(`Bootstrap administrativo reprovado: ${blockers[0]}`);
  process.exit(1);
}
