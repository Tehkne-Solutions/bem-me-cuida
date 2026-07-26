import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildBootstrapPlan,
  buildVariableMaps,
  parseAdminBootstrapConfig,
  validateReviewerLogin,
} from './lib/rc011-admin-bootstrap.mjs';

const validConfig = {
  easProjectId: '123e4567-e89b-42d3-a456-426614174000',
  supabaseUrl: 'https://example.supabase.co',
  supabasePublishableKey: 'sb_publishable_public_key_for_rc011_tests',
  cycleStatus: 'active',
  milestoneDone: true,
  blockerCount: 0,
  freezeReady: true,
  backlogBlocked: 0,
  scopePending: 0,
  experimentsRunning: 0,
  requiredGates: 7,
  passedGates: 7,
  cycleEvidenceUrl: 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/123',
  authCallbacksConfigured: true,
};

const parsed = parseAdminBootstrapConfig(JSON.stringify(validConfig));
assert.equal(parsed.cycleStatus, 'active');
assert.equal(validateReviewerLogin('release-admin-2', 'release-admin-1'), 'release-admin-2');
assert.throws(() => validateReviewerLogin('release-admin-1', 'release-admin-1'), /diferente/);
assert.throws(
  () => parseAdminBootstrapConfig(JSON.stringify({ ...validConfig, passedGates: 8 })),
  /não pode exceder/,
);
const privilegedKeyPattern = ['sb', 'secret', 'forbidden', 'value', '1234567890123456'].join('_');
assert.throws(
  () => parseAdminBootstrapConfig(JSON.stringify({ ...validConfig, supabasePublishableKey: privilegedKeyPattern })),
  /privilegiado/,
);
assert.throws(
  () => parseAdminBootstrapConfig(JSON.stringify({ ...validConfig, authCallbacksConfigured: false })),
  /deve estar confirmado/,
);

const maps = buildVariableMaps(parsed);
assert.equal(Object.keys(maps.repository).length, 13);
assert.equal(Object.keys(maps.environments['rc-011-build']).length, 13);
assert.equal(Object.keys(maps.environments['rc-011-homologation']).length, 15);
assert.equal(maps.environments['rc-011-homologation'].RC011_AUTH_CALLBACKS_CONFIGURED, 'true');

const plan = buildBootstrapPlan({ config: parsed, reviewerConfigured: false });
assert.equal(plan.recommendation, 'ready-to-apply');
assert.equal(plan.environments.length, 2);
assert.equal(plan.privacy.containsSecretValues, false);
assert.equal(plan.privacy.containsVariableValues, false);
assert.equal(JSON.stringify(plan).includes(validConfig.supabasePublishableKey), false);
assert.equal(JSON.stringify(plan).includes(validConfig.supabaseUrl), false);

const outputDir = mkdtempSync(join(tmpdir(), 'rc011-admin-bootstrap-'));
const outputJson = join(outputDir, 'plan.json');
const outputMd = join(outputDir, 'plan.md');
const execution = spawnSync(
  process.execPath,
  [
    'scripts/execute-rc011-admin-bootstrap.mjs',
    '--mode',
    'plan',
    '--output-json',
    outputJson,
    '--output-md',
    outputMd,
  ],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      RC011_BOOTSTRAP_CONFIG_JSON: JSON.stringify(validConfig),
      RC011_REVIEWER_LOGIN: 'release-admin-2',
      GITHUB_SHA: '0123456789abcdef0123456789abcdef01234567',
      GITHUB_RUN_ID: '123456',
    },
  },
);
assert.equal(execution.status, 0, execution.stderr);
const generatedJson = readFileSync(outputJson, 'utf8');
const generatedMd = readFileSync(outputMd, 'utf8');
assert.equal(generatedJson.includes(validConfig.supabasePublishableKey), false);
assert.equal(generatedJson.includes(validConfig.supabaseUrl), false);
assert.equal(generatedMd.includes(validConfig.supabasePublishableKey), false);
assert.match(generatedMd, /ready-to-apply/);
assert.match(generatedMd, /Tehkné Solutions/);

console.log('Bootstrap administrativo RC 0.11 aprovado.');
console.log('Nenhum valor público ou secreto foi incluído nos artefatos de plano.');
console.log('Tehkné Solutions');
