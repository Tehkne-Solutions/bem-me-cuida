import { existsSync, readFileSync } from 'node:fs';

const mode = process.argv[2] ?? 'structure';
const failures = [];
const required = [
  'release/rc-0.11.0/ota-device-validation.json',
  'release/rc-0.11.0/ota-session.template.json',
  'scripts/lib/rc011-ota-final-validation.mjs',
  'scripts/capture-rc011-ota-device-session.mjs',
  'scripts/apply-rc011-ota-device-session.mjs',
  'scripts/apply-rc011-ota-final-capture.mjs',
  'scripts/generate-rc011-final-decision-package.mjs',
  'scripts/test-rc011-ota-final-validation.mjs',
];
for (const path of required) if (!existsSync(path)) failures.push(`Arquivo ausente: ${path}`);
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const record = existsSync('release/rc-0.11.0/ota-device-validation.json') ? JSON.parse(read('release/rc-0.11.0/ota-device-validation.json')) : {};
if (record.release !== '0.11.0-rc.1' || record.runtimeVersion !== '0.11.0' || record.channel !== 'rc-0-11') failures.push('Registro OTA físico incompatível com a candidata.');
for (const action of ['publish', 'rollback']) {
  if (!record.actions?.[action]) failures.push(`Ação OTA ausente: ${action}.`);
  for (const platform of ['android', 'ios']) {
    const item = record.actions?.[action]?.platforms?.[platform];
    if (!item || !Array.isArray(item.requiredProfiles) || item.requiredProfiles.length === 0) failures.push(`Perfis obrigatórios ausentes para ${action}/${platform}.`);
  }
}
const core = read('scripts/lib/rc011-ota-final-validation.mjs');
for (const marker of ['update-received', 'rollback-received', 'restart-applied', 'local-data-preserved', 'offline-startup', 'automaticPromotion: false', 'requiresHumanAttestation']) {
  if (!core.includes(marker)) failures.push(`Política OTA sem controle: ${marker}.`);
}
if (mode === 'review' && record.status !== 'ready-for-final-review') failures.push(`Validação OTA física ainda não está pronta: ${record.status}.`);
if (failures.length) {
  console.error('Validação OTA final reprovada:'); failures.forEach((item) => console.error(`- ${item}`)); process.exit(1);
}
console.log(`Validação OTA final aprovada no modo ${mode}.`);
console.log('Tehkné Solutions');
