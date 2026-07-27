import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2] ?? 'structure';
if (!['structure', 'review', 'promotion'].includes(mode)) throw new Error('Modo inválido. Use structure, review ou promotion.');
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const matrix = readJson(process.env.RC011_DEVICE_MATRIX_PATH ?? 'release/rc-0.11.0/device-matrix.json');
const tests = readJson(process.env.RC011_TEST_RESULTS_PATH ?? 'release/rc-0.11.0/test-results.json');
const iosPlan = readJson(process.env.RC011_IOS_PLAN_PATH ?? 'release/rc-0.11.0/ios-homologation-plan.json');
const failures = [];
const fail = (message) => failures.push(message);
for (const [name, document] of Object.entries({ matrix, tests, iosPlan })) {
  if (document.release !== '0.11.0-rc.1') fail(`${name} não referencia 0.11.0-rc.1.`);
  if (document.generatedBy !== 'Tehkné Solutions') fail(`${name} sem assinatura Tehkné Solutions.`);
  if (document.privacy?.containsPersonalData !== false || document.privacy?.containsClinicalData !== false) fail(`${name} com privacidade inválida.`);
}
const iosProfiles = (matrix.profiles ?? []).filter((item) => item.platform === 'ios');
if (iosProfiles.length < 4) fail('Matriz iOS incompleta.');
if (!iosProfiles.some((item) => item.formFactor === 'tablet')) fail('Perfil iPad ausente.');
if (!Array.isArray(tests.suites) || tests.suites.length < 8) fail('Suítes globais incompletas.');
if (mode !== 'structure') {
  if (!['in-progress', 'retest-required', 'ready-for-review'].includes(iosPlan.status)) fail('Plano iOS ainda não recebeu sessões físicas.');
  for (const suite of tests.suites) {
    if (!Array.isArray(suite.requiredPlatforms) || !suite.requiredPlatforms.includes('ios')) fail(`Suíte ${suite.id} não declara requisito iOS.`);
  }
}
if (mode === 'promotion') {
  for (const profile of matrix.profiles.filter((item) => item.required)) {
    if (profile.status !== 'passed' || !profile.evidenceUrl?.startsWith('https://')) fail(`Aparelho obrigatório ${profile.id} não aprovado.`);
  }
  for (const suite of tests.suites.filter((item) => item.required)) {
    if (suite.status !== 'passed' || !suite.evidenceUrl?.startsWith('https://')) fail(`Suíte obrigatória ${suite.id} não aprovada.`);
    for (const platform of suite.requiredPlatforms ?? ['android', 'ios']) {
      if (suite.platformResults?.[platform]?.status !== 'passed') fail(`Suíte ${suite.id} sem aprovação ${platform}.`);
    }
  }
}
if (failures.length) {
  console.error(`Homologação multiplataforma reprovada no modo ${mode}:`);
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Homologação multiplataforma aprovada no modo ${mode}.`);
console.log('Tehkné Solutions');
