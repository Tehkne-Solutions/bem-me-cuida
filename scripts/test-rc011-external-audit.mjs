import assert from 'node:assert/strict';
import { buildRc011ExternalAudit } from './lib/rc011-external-audit.mjs';

const variableNames = [
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
const homologationVariables = [...variableNames, 'RC011_AUTH_CALLBACKS', 'RC011_AUTH_CALLBACKS_CONFIGURED'];
const manifest = {
  release: '0.11.0-rc.1',
  repository: 'Tehkne-Solutions/bem-me-cuida',
  repositoryVariables: variableNames,
  environments: [
    { name: 'rc-011-build', variables: variableNames, secrets: ['EXPO_TOKEN'], protectionRequired: true, reviewersRequired: true },
    { name: 'rc-011-homologation', variables: homologationVariables, secrets: ['EXPO_TOKEN'], protectionRequired: true, reviewersRequired: true },
  ],
};
const wrap = (data) => ({ accessible: true, data });
const environmentDetails = wrap({ protection_rules: [{ type: 'required_reviewers', reviewers: [{ id: 1 }] }] });
const named = (key, names) => wrap({ [key]: names.map((name) => ({ name, value: 'must-not-be-copied' })) });

const ready = buildRc011ExternalAudit({
  manifest,
  repositoryVariablesResponse: named('variables', variableNames),
  environmentsResponse: named('environments', ['rc-011-build', 'rc-011-homologation']),
  environmentResponses: {
    'rc-011-build': { details: environmentDetails, variables: named('variables', variableNames), secrets: named('secrets', ['EXPO_TOKEN']) },
    'rc-011-homologation': { details: environmentDetails, variables: named('variables', homologationVariables), secrets: named('secrets', ['EXPO_TOKEN']) },
  },
  workflowRunId: 123,
});
assert.equal(ready.recommendation, 'ready-for-capture');
assert.equal(ready.blockers.length, 0);
assert.equal(JSON.stringify(ready).includes('must-not-be-copied'), false);
assert.equal(ready.privacy.containsSecretValues, false);

const missingSecret = buildRc011ExternalAudit({
  manifest,
  repositoryVariablesResponse: named('variables', variableNames),
  environmentsResponse: named('environments', ['rc-011-build', 'rc-011-homologation']),
  environmentResponses: {
    'rc-011-build': { details: environmentDetails, variables: named('variables', variableNames), secrets: named('secrets', []) },
    'rc-011-homologation': { details: environmentDetails, variables: named('variables', homologationVariables), secrets: named('secrets', ['EXPO_TOKEN']) },
  },
});
assert.equal(missingSecret.recommendation, 'hold');
assert.ok(missingSecret.blockers.some((item) => item.includes('EXPO_TOKEN')));

const unavailable = buildRc011ExternalAudit({
  manifest,
  repositoryVariablesResponse: { accessible: false },
  environmentsResponse: { accessible: false },
  environmentResponses: {},
});
assert.equal(unavailable.recommendation, 'hold');
assert.ok(unavailable.blockers.some((item) => item.includes('Não foi possível consultar')));

console.log('Auditoria externa RC 0.11 aprovada: ready, faltas e APIs indisponíveis cobertos.');
console.log('Tehkné Solutions');
