import { spawnSync } from 'node:child_process';

const action = process.env.OTA_ACTION?.trim();
const message = process.env.OTA_MESSAGE?.trim() ?? '';
const rollout = process.env.OTA_ROLLOUT_PERCENTAGE?.trim() || '5';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(args) {
  const result = spawnSync(npx, ['eas-cli@latest', ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (action === 'publish-validation') {
  run([
    'update',
    '--channel', 'hotfix-validation',
    '--message', message,
    '--platform', 'all',
    '--environment', 'preview',
    '--rollout-percentage', '100',
    '--json',
    '--non-interactive',
  ]);
} else if (action === 'promote-production') {
  run([
    'update:republish',
    '--group', process.env.OTA_VALIDATED_GROUP_ID?.trim() ?? '',
    '--destination-channel', 'production',
    '--message', message,
    '--platform', 'all',
    '--rollout-percentage', rollout,
    '--json',
    '--non-interactive',
  ]);
} else if (action === 'rollback-production') {
  run([
    'update:republish',
    '--group', process.env.OTA_ROLLBACK_GROUP_ID?.trim() ?? '',
    '--destination-channel', 'production',
    '--message', message,
    '--platform', 'all',
    '--rollout-percentage', '100',
    '--json',
    '--non-interactive',
  ]);
} else if (action === 'cancel-rollout') {
  run([
    'update:revert-update-rollout',
    '--group', process.env.OTA_CURRENT_GROUP_ID?.trim() ?? '',
    '--message', message,
    '--json',
    '--non-interactive',
  ]);
} else {
  console.error(`OTA_ACTION não executável: ${action || '(ausente)'}.`);
  process.exit(1);
}
