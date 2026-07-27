import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const RUN_ID_PATTERN = /^[1-9][0-9]{0,19}$/;
const EAS_BUILD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GROUP_PATTERN = /^[a-f0-9-]{16,}$/i;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;
const PROFILE_PATTERN = /^(android|ios)-[a-z0-9-]{2,48}$/;
const VERSION_PATTERN = /^[a-z0-9._-]{1,24}$/i;
const RESULTS_PATTERN = /^[a-z0-9-]+=(passed|failed|blocked)(,[a-z0-9-]+=(passed|failed|blocked))*$/;
const NUMBER_PATTERN = /^(100(?:\.0+)?|\d{1,2}(?:\.\d+)?)$/;
const COUNT_PATTERN = /^\d{1,9}$/;
const SENSITIVE_PATTERN = /(expo_[a-z0-9_-]{20,}|sb_secret_[a-z0-9_-]+|service[_-]?role|gh[pousr]_[a-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const commandDefinitions = {
  help: { privilege: 'write', args: [] }, status: { privilege: 'write', args: [] }, 'audit-external': { privilege: 'admin', args: [] },
  'validate-infrastructure': { privilege: 'write', args: ['sourceCommit'] },
  'capture-infrastructure': { privilege: 'admin', args: ['sourceCommit', 'buildEvidenceUrl', 'homologationEvidenceUrl', 'servicesEvidenceUrl'] },
  'evidence-inspect': { privilege: 'write', args: ['runId', 'sourceCommit'] }, 'evidence-pr': { privilege: 'admin', args: ['runId', 'sourceCommit'] },
  'validate-build': { privilege: 'write', args: ['sourceCommit', 'cycleEvidenceUrl'] },
  'build-android': { privilege: 'admin', args: ['sourceCommit', 'cycleEvidenceUrl'] }, 'build-ios': { privilege: 'admin', args: ['sourceCommit', 'cycleEvidenceUrl'] },
  'discover-android': { privilege: 'admin', args: ['sourceCommit'] }, 'capture-android-latest': { privilege: 'admin', args: ['sourceCommit'] },
  'android-artifact-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'discover-ios': { privilege: 'admin', args: ['sourceCommit'] }, 'capture-ios-latest': { privilege: 'admin', args: ['sourceCommit'] },
  'ios-artifact-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'android-session': { privilege: 'admin', args: ['sourceCommit', 'buildId', 'profileId', 'resultStatus', 'installationMode', 'osVersion', 'evidenceUrl', 'suiteResults'] },
  'android-session-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] }, 'android-review': { privilege: 'write', args: ['sourceCommit'] },
  'ios-session': { privilege: 'admin', args: ['sourceCommit', 'buildId', 'profileId', 'resultStatus', 'installationMode', 'osVersion', 'evidenceUrl', 'suiteResults'] },
  'ios-session-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] }, 'multiplatform-review': { privilege: 'write', args: ['sourceCommit'] },
  'collect-android': { privilege: 'admin', args: ['sourceCommit', 'buildId'] }, 'collect-ios': { privilege: 'admin', args: ['sourceCommit', 'buildId'] },
  'package-decision': { privilege: 'write', args: ['sourceCommit'] },
  'ota-publish': { privilege: 'admin', args: ['sourceCommit'] },
  'ota-publish-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'ota-session': { privilege: 'admin', args: ['sourceCommit', 'platform', 'buildId', 'profileId', 'osVersion', 'groupId', 'otaAction', 'evidenceUrl', 'otaResults'] },
  'ota-session-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'ota-rollback': { privilege: 'admin', args: ['sourceCommit', 'groupId'] },
  'ota-rollback-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'rc-final-review': { privilege: 'write', args: ['sourceCommit'] },
  'production-package': { privilege: 'write', args: ['sourceCommit'] },
  'final-attestation': { privilege: 'admin', args: ['sourceCommit', 'attestationRole', 'attestationDecision', 'evidenceUrl'] },
  'final-attestation-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'production-build-android': { privilege: 'admin', args: ['sourceCommit'] },
  'production-build-ios': { privilege: 'admin', args: ['sourceCommit'] },
  'production-artifact-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
  'rollout-observation': { privilege: 'admin', args: ['sourceCommit', 'rolloutPercentage', 'crashFreePct', 'syncSuccessPct', 'authSuccessPct', 'criticalIncidents', 'blockingSupportReports', 'evidenceUrl'] },
  'rollout-observation-pr': { privilege: 'admin', args: ['sourceCommit', 'runId'] },
};

function assertValue(name, value, command) {
  if (!value) throw new Error(`Argumento obrigatório ausente: ${name}.`);
  if (name === 'sourceCommit' && !SHA_PATTERN.test(value)) throw new Error('sourceCommit deve ser um SHA Git de 40 caracteres.');
  if (name === 'runId' && !RUN_ID_PATTERN.test(value)) throw new Error('runId inválido.');
  if (name === 'buildId' && !EAS_BUILD_ID_PATTERN.test(value)) throw new Error('buildId do EAS inválido.');
  if (name === 'platform' && !['android', 'ios'].includes(value)) throw new Error('platform inválida.');
  if (name === 'groupId' && !GROUP_PATTERN.test(value)) throw new Error('groupId OTA inválido.');
  if (name === 'otaAction' && !['publish', 'rollback'].includes(value)) throw new Error('otaAction inválida.');
  if (name === 'profileId') {
    if (!PROFILE_PATTERN.test(value)) throw new Error('profileId de aparelho inválido.');
    if (command.startsWith('android-') && !value.startsWith('android-')) throw new Error('profileId Android inválido.');
    if (command.startsWith('ios-') && !value.startsWith('ios-')) throw new Error('profileId iOS inválido.');
  }
  if (name === 'resultStatus' && !['passed', 'failed', 'blocked'].includes(value)) throw new Error('resultStatus inválido.');
  if (name === 'installationMode' && !['fresh', 'upgrade', 'retest'].includes(value)) throw new Error('installationMode inválido.');
  if (name === 'osVersion' && !VERSION_PATTERN.test(value)) throw new Error('osVersion inválida.');
  if (['suiteResults', 'otaResults'].includes(name) && (!RESULTS_PATTERN.test(value) || value.length > 2000)) throw new Error(`${name} inválido.`);
  if (name === 'attestationRole' && !['release-admin', 'qa-lead', 'privacy-security'].includes(value)) throw new Error('attestationRole inválido.');
  if (name === 'attestationDecision' && !['approved', 'rejected'].includes(value)) throw new Error('attestationDecision inválida.');
  if (name === 'rolloutPercentage' && !['1', '5', '10', '25', '50', '100'].includes(value)) throw new Error('rolloutPercentage inválido.');
  if (['crashFreePct', 'syncSuccessPct', 'authSuccessPct'].includes(name) && !NUMBER_PATTERN.test(value)) throw new Error(`${name} deve estar entre 0 e 100.`);
  if (['criticalIncidents', 'blockingSupportReports'].includes(name) && !COUNT_PATTERN.test(value)) throw new Error(`${name} deve ser inteiro não negativo.`);
  if (name.endsWith('Url') && !HTTPS_PATTERN.test(value)) throw new Error(`${name} deve ser uma URL HTTPS sem espaços.`);
}

export function parseRc011Command(input) {
  const body = String(input ?? '').trim();
  if (!body.startsWith('/rc011')) return { recognized: false };
  if (body.length > 3200) throw new Error('Comando excede o tamanho permitido.');
  if (SENSITIVE_PATTERN.test(body)) throw new Error('O comando contém material que parece secreto ou privilegiado.');
  if (EMAIL_PATTERN.test(body)) throw new Error('O comando contém endereço de e-mail e não está sanitizado.');
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 1) throw new Error('Use exatamente uma linha por comando /rc011.');
  const tokens = lines[0].split(/\s+/);
  const command = tokens[1] ?? 'help';
  const definition = commandDefinitions[command];
  if (tokens[0] !== '/rc011') throw new Error('Prefixo inválido. Use /rc011.');
  if (!definition) throw new Error(`Comando desconhecido: ${command}.`);
  const values = tokens.slice(2);
  if (values.length !== definition.args.length) throw new Error(`O comando ${command} espera ${definition.args.length} argumento(s), mas recebeu ${values.length}.`);
  const parsed = {
    recognized: true, command, privilege: definition.privilege, sourceCommit: '', runId: '', buildId: '', profileId: '', platform: '', groupId: '', otaAction: '', otaResults: '',
    resultStatus: '', installationMode: '', osVersion: '', suiteResults: '', evidenceUrl: '', buildEvidenceUrl: '', homologationEvidenceUrl: '', servicesEvidenceUrl: '', cycleEvidenceUrl: '',
    attestationRole: '', attestationDecision: '', rolloutPercentage: '', crashFreePct: '', syncSuccessPct: '', authSuccessPct: '', criticalIncidents: '', blockingSupportReports: '',
  };
  definition.args.forEach((name, index) => { assertValue(name, values[index], command); parsed[name] = values[index]; });
  if (command === 'ota-session' && !parsed.profileId.startsWith(`${parsed.platform}-`)) throw new Error('profileId incompatível com platform.');
  return parsed;
}

const outputKeys = [
  'recognized', 'command', 'privilege', 'sourceCommit', 'runId', 'buildId', 'profileId', 'platform', 'groupId', 'otaAction', 'otaResults', 'resultStatus', 'installationMode',
  'osVersion', 'suiteResults', 'evidenceUrl', 'buildEvidenceUrl', 'homologationEvidenceUrl', 'servicesEvidenceUrl', 'cycleEvidenceUrl', 'attestationRole', 'attestationDecision',
  'rolloutPercentage', 'crashFreePct', 'syncSuccessPct', 'authSuccessPct', 'criticalIncidents', 'blockingSupportReports',
];
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  try {
    const parsed = parseRc011Command(process.env.RC011_COMMENT_BODY ?? '');
    if (!parsed.recognized) process.exit(0);
    const outputIndex = process.argv.indexOf('--output');
    const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : process.env.GITHUB_OUTPUT;
    if (!outputPath) throw new Error('Caminho de saída do GitHub Actions ausente.');
    writeFileSync(outputPath, `${outputKeys.map((key) => `${key}=${String(parsed[key] ?? '')}`).join('\n')}\n`, 'utf8');
    console.log(`Comando RC 0.11 reconhecido: ${parsed.command}.`);
    console.log(`Privilégio exigido: ${parsed.privilege}.`);
    console.log('Tehkné Solutions');
  } catch (error) { console.error(`Comando RC 0.11 rejeitado: ${error.message}`); process.exit(1); }
}
