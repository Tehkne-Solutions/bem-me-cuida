import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const RUN_ID_PATTERN = /^[1-9][0-9]{0,19}$/;
const ISSUE_PATTERN = /^[1-9][0-9]{0,9}$/;
const EAS_BUILD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;
const PROFILE_PATTERN = /^android-[a-z0-9-]{2,48}$/;
const OS_VERSION_PATTERN = /^[a-z0-9._-]{1,24}$/i;
const SUITE_RESULTS_PATTERN = /^[a-z0-9-]+=(passed|failed|blocked)(,[a-z0-9-]+=(passed|failed|blocked))*$/;
const SENSITIVE_PATTERN = /(expo_[a-z0-9_-]{20,}|sb_secret_[a-z0-9_-]+|service[_-]?role|gh[pousr]_[a-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const commandDefinitions = {
  help: { privilege: 'write', args: [] },
  status: { privilege: 'write', args: [] },
  'audit-external': { privilege: 'admin', args: [] },
  'validate-infrastructure': { privilege: 'write', args: ['sourceCommit'] },
  'capture-infrastructure': {
    privilege: 'admin',
    args: ['sourceCommit', 'buildEvidenceUrl', 'homologationEvidenceUrl', 'servicesEvidenceUrl'],
  },
  'evidence-inspect': { privilege: 'write', args: ['runId', 'sourceCommit'] },
  'evidence-pr': { privilege: 'admin', args: ['runId', 'sourceCommit'] },
  'validate-build': { privilege: 'write', args: ['sourceCommit', 'cycleEvidenceUrl'] },
  'build-android': { privilege: 'admin', args: ['sourceCommit', 'cycleEvidenceUrl'] },
  'discover-android': { privilege: 'admin', args: ['sourceCommit'] },
  'capture-android-latest': { privilege: 'admin', args: ['sourceCommit'] },
  'android-artifact-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'android-session': {
    privilege: 'admin',
    args: ['sourceCommit', 'buildId', 'profileId', 'resultStatus', 'installationMode', 'osVersion', 'evidenceUrl', 'suiteResults'],
  },
  'android-session-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'android-review': { privilege: 'write', args: ['sourceCommit'] },
  'collect-android': { privilege: 'admin', args: ['sourceCommit', 'buildId'] },
  'package-decision': { privilege: 'write', args: ['sourceCommit'] },
};

const assertValue = (name, value) => {
  if (!value) throw new Error(`Argumento obrigatório ausente: ${name}.`);
  if (name === 'sourceCommit' && !SHA_PATTERN.test(value)) throw new Error('sourceCommit deve ser um SHA Git de 40 caracteres.');
  if (name === 'runId' && !RUN_ID_PATTERN.test(value)) throw new Error('runId inválido.');
  if (name === 'trackingIssue' && !ISSUE_PATTERN.test(value)) throw new Error('trackingIssue inválida.');
  if (name === 'buildId' && !EAS_BUILD_ID_PATTERN.test(value)) throw new Error('buildId do EAS inválido.');
  if (name === 'profileId' && !PROFILE_PATTERN.test(value)) throw new Error('profileId Android inválido.');
  if (name === 'resultStatus' && !['passed', 'failed', 'blocked'].includes(value)) throw new Error('resultStatus inválido.');
  if (name === 'installationMode' && !['fresh', 'upgrade', 'retest'].includes(value)) throw new Error('installationMode inválido.');
  if (name === 'osVersion' && !OS_VERSION_PATTERN.test(value)) throw new Error('osVersion inválida.');
  if (name === 'suiteResults' && (!SUITE_RESULTS_PATTERN.test(value) || value.length > 2000)) throw new Error('suiteResults inválido.');
  if (name.endsWith('Url') && !HTTPS_PATTERN.test(value)) throw new Error(`${name} deve ser uma URL HTTPS sem espaços.`);
};

export function parseRc011Command(input) {
  const body = String(input ?? '').trim();
  if (!body.startsWith('/rc011')) return { recognized: false };
  if (body.length > 3200) throw new Error('Comando excede o tamanho permitido.');
  if (SENSITIVE_PATTERN.test(body)) throw new Error('O comando contém material que parece secreto ou privilegiado.');
  if (EMAIL_PATTERN.test(body)) throw new Error('O comando contém endereço de e-mail e não está sanitizado.');

  const nonEmptyLines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (nonEmptyLines.length !== 1) throw new Error('Use exatamente uma linha por comando /rc011.');

  const tokens = nonEmptyLines[0].split(/\s+/);
  if (tokens[0] !== '/rc011') throw new Error('Prefixo inválido. Use /rc011.');

  const command = tokens[1] ?? 'help';
  const definition = commandDefinitions[command];
  if (!definition) throw new Error(`Comando desconhecido: ${command}.`);

  const values = tokens.slice(2);
  if (values.length !== definition.args.length) {
    throw new Error(`O comando ${command} espera ${definition.args.length} argumento(s), mas recebeu ${values.length}.`);
  }

  const parsed = {
    recognized: true,
    command,
    privilege: definition.privilege,
    sourceCommit: '',
    runId: '',
    buildId: '',
    profileId: '',
    resultStatus: '',
    installationMode: '',
    osVersion: '',
    suiteResults: '',
    evidenceUrl: '',
    buildEvidenceUrl: '',
    homologationEvidenceUrl: '',
    servicesEvidenceUrl: '',
    cycleEvidenceUrl: '',
  };

  definition.args.forEach((name, index) => {
    const value = values[index];
    assertValue(name, value);
    parsed[name] = value;
  });

  return parsed;
}

const writeGitHubOutput = (path, parsed) => {
  const keys = [
    'recognized',
    'command',
    'privilege',
    'sourceCommit',
    'runId',
    'buildId',
    'profileId',
    'resultStatus',
    'installationMode',
    'osVersion',
    'suiteResults',
    'evidenceUrl',
    'buildEvidenceUrl',
    'homologationEvidenceUrl',
    'servicesEvidenceUrl',
    'cycleEvidenceUrl',
  ];
  const lines = keys.map((key) => `${key}=${String(parsed[key] ?? '')}`);
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
};

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  try {
    const body = process.env.RC011_COMMENT_BODY ?? '';
    const outputIndex = process.argv.indexOf('--output');
    const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : process.env.GITHUB_OUTPUT;
    const parsed = parseRc011Command(body);
    if (!parsed.recognized) process.exit(0);
    if (!outputPath) throw new Error('Caminho de saída do GitHub Actions ausente.');
    writeGitHubOutput(outputPath, parsed);
    console.log(`Comando RC 0.11 reconhecido: ${parsed.command}.`);
    console.log(`Privilégio exigido: ${parsed.privilege}.`);
    console.log('Tehkné Solutions');
  } catch (error) {
    console.error(`Comando RC 0.11 rejeitado: ${error.message}`);
    process.exit(1);
  }
}
