const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;
const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const SENSITIVE_PATTERN = /(sb_secret_|service[_-]?role|gh[pousr]_|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

export const RC011_ENVIRONMENTS = ['rc-011-build', 'rc-011-homologation'];
export const RC011_CALLBACKS = [
  'bemmecuida-rc011://auth/callback',
  'bemmecuida-rc011://reset-password',
];

export const RC011_REPOSITORY_VARIABLES = [
  'EAS_PROJECT_ID',
  'RC011_SUPABASE_URL',
  'RC011_SUPABASE_PUBLISHABLE_KEY',
  'RC011_CYCLE_STATUS',
  'RC011_MILESTONE_DONE',
  'RC011_BLOCKER_COUNT',
  'RC011_FREEZE_READY',
  'RC011_BACKLOG_BLOCKED',
  'RC011_SCOPE_PENDING',
  'RC011_EXPERIMENTS_RUNNING',
  'RC011_REQUIRED_GATES',
  'RC011_PASSED_GATES',
  'RC011_CYCLE_EVIDENCE_URL',
];

const BOOLEAN_FIELDS = ['milestoneDone', 'freezeReady', 'authCallbacksConfigured'];
const INTEGER_FIELDS = [
  'blockerCount',
  'backlogBlocked',
  'scopePending',
  'experimentsRunning',
  'requiredGates',
  'passedGates',
];

const assertBoolean = (value, field) => {
  if (typeof value !== 'boolean') throw new Error(`${field} deve ser booleano.`);
};

const assertInteger = (value, field) => {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${field} deve ser inteiro maior ou igual a zero.`);
};

const assertHttps = (value, field) => {
  if (typeof value !== 'string' || !HTTPS_PATTERN.test(value)) throw new Error(`${field} deve ser uma URL HTTPS.`);
};

export function validateReviewerLogin(login, actor = '') {
  if (typeof login !== 'string' || !LOGIN_PATTERN.test(login)) throw new Error('reviewerLogin inválido.');
  if (actor && login.toLowerCase() === actor.toLowerCase()) {
    throw new Error('O revisor obrigatório deve ser diferente da conta que executa o bootstrap.');
  }
  return login;
}

export function parseAdminBootstrapConfig(raw) {
  let config;
  try {
    config = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error('configuration_json não contém JSON válido.');
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('configuration_json deve representar um objeto JSON.');
  }

  if (!UUID_PATTERN.test(String(config.easProjectId ?? ''))) throw new Error('easProjectId deve ser UUID válido.');
  assertHttps(config.supabaseUrl, 'supabaseUrl');
  if (!String(config.supabaseUrl).includes('.supabase.co')) throw new Error('supabaseUrl deve apontar para um projeto Supabase hospedado.');

  const publishableKey = String(config.supabasePublishableKey ?? '');
  if (publishableKey.length < 20 || SENSITIVE_PATTERN.test(publishableKey)) {
    throw new Error('supabasePublishableKey ausente ou com formato privilegiado não permitido.');
  }

  if (!['active', 'frozen'].includes(config.cycleStatus)) {
    throw new Error('cycleStatus deve ser active ou frozen.');
  }

  for (const field of BOOLEAN_FIELDS) assertBoolean(config[field], field);
  for (const field of INTEGER_FIELDS) assertInteger(config[field], field);
  assertHttps(config.cycleEvidenceUrl, 'cycleEvidenceUrl');

  if (config.requiredGates < 1) throw new Error('requiredGates deve ser maior que zero.');
  if (config.passedGates > config.requiredGates) throw new Error('passedGates não pode exceder requiredGates.');
  if (!config.authCallbacksConfigured) throw new Error('authCallbacksConfigured deve estar confirmado antes do apply.');

  return {
    easProjectId: config.easProjectId,
    supabaseUrl: config.supabaseUrl,
    supabasePublishableKey: publishableKey,
    cycleStatus: config.cycleStatus,
    milestoneDone: config.milestoneDone,
    blockerCount: config.blockerCount,
    freezeReady: config.freezeReady,
    backlogBlocked: config.backlogBlocked,
    scopePending: config.scopePending,
    experimentsRunning: config.experimentsRunning,
    requiredGates: config.requiredGates,
    passedGates: config.passedGates,
    cycleEvidenceUrl: config.cycleEvidenceUrl,
    authCallbacksConfigured: config.authCallbacksConfigured,
  };
}

const boolString = (value) => (value ? 'true' : 'false');

export function buildVariableMaps(config) {
  const common = {
    EAS_PROJECT_ID: config.easProjectId,
    RC011_SUPABASE_URL: config.supabaseUrl,
    RC011_SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
    RC011_CYCLE_STATUS: config.cycleStatus,
    RC011_MILESTONE_DONE: boolString(config.milestoneDone),
    RC011_BLOCKER_COUNT: String(config.blockerCount),
    RC011_FREEZE_READY: boolString(config.freezeReady),
    RC011_BACKLOG_BLOCKED: String(config.backlogBlocked),
    RC011_SCOPE_PENDING: String(config.scopePending),
    RC011_EXPERIMENTS_RUNNING: String(config.experimentsRunning),
    RC011_REQUIRED_GATES: String(config.requiredGates),
    RC011_PASSED_GATES: String(config.passedGates),
    RC011_CYCLE_EVIDENCE_URL: config.cycleEvidenceUrl,
  };

  return {
    repository: common,
    environments: {
      'rc-011-build': common,
      'rc-011-homologation': {
        ...common,
        RC011_AUTH_CALLBACKS: RC011_CALLBACKS.join(','),
        RC011_AUTH_CALLBACKS_CONFIGURED: boolString(config.authCallbacksConfigured),
      },
    },
  };
}

export function buildBootstrapPlan({ config, reviewerConfigured = false }) {
  const maps = buildVariableMaps(config);
  return {
    schemaVersion: '1.0',
    release: '0.11.0-rc.1',
    recommendation: 'ready-to-apply',
    repositoryVariables: Object.keys(maps.repository).sort(),
    environments: RC011_ENVIRONMENTS.map((name) => ({
      name,
      variables: Object.keys(maps.environments[name]).sort(),
      secretNames: ['EXPO_TOKEN'],
      reviewerConfigured,
      branchPolicy: 'main',
    })),
    callbacks: [...RC011_CALLBACKS],
    privacy: {
      containsSecretValues: false,
      containsVariableValues: false,
      containsPersonalData: false,
      containsClinicalData: false,
    },
    generatedBy: 'Tehkné Solutions',
  };
}

export function sanitizeBootstrapResult({ mode, applied, sourceCommit, runId, operations, blockers = [] }) {
  return {
    schemaVersion: '1.0',
    release: '0.11.0-rc.1',
    mode,
    applied,
    recommendation: applied && blockers.length === 0 ? 'capture-infrastructure' : 'hold',
    sourceCommit: /^[a-f0-9]{40}$/i.test(sourceCommit ?? '') ? sourceCommit : null,
    workflowRun: /^[1-9][0-9]{0,19}$/.test(String(runId ?? '')) ? String(runId) : null,
    operations,
    blockers,
    privacy: {
      containsSecretValues: false,
      containsVariableValues: false,
      containsPersonalData: false,
      containsClinicalData: false,
    },
    generatedBy: 'Tehkné Solutions',
  };
}
