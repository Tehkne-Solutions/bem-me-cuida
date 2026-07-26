import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2] ?? 'promotion';
if (!['structure', 'capture', 'promotion'].includes(mode)) throw new Error('Modo inválido. Use structure, capture ou promotion.');
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const builds = readJson(process.env.RC011_BUILDS_PATH ?? 'release/rc-0.11.0/builds.json');
const ota = readJson(process.env.RC011_OTA_VALIDATION_PATH ?? 'release/rc-0.11.0/ota-validation.json');
const matrix = readJson(process.env.RC011_DEVICE_MATRIX_PATH ?? 'release/rc-0.11.0/device-matrix.json');
const tests = readJson(process.env.RC011_TEST_RESULTS_PATH ?? 'release/rc-0.11.0/test-results.json');
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);

for (const [name, document] of Object.entries({ builds, ota, matrix, tests })) {
  if (document.release !== '0.11.0-rc.1') fail(`${name} não referencia 0.11.0-rc.1.`);
  if (document.generatedBy !== 'Tehkné Solutions') fail(`${name} sem assinatura Tehkné Solutions.`);
  if (document.privacy?.containsPersonalData !== false || document.privacy?.containsClinicalData !== false) {
    fail(`${name} não declara ausência de dados pessoais e clínicos.`);
  }
}

if (ota.runtimeVersion !== '0.11.0' || ota.channel !== 'rc-0-11') fail('Registro OTA com runtime ou canal divergente.');
if (!builds.platforms?.android || !builds.platforms?.ios) fail('Registro de builds precisa conter Android e iOS.');
if (!Array.isArray(matrix.profiles) || matrix.profiles.length < 6) fail('Matriz de aparelhos incompleta.');
if (!Array.isArray(tests.suites) || tests.suites.length < 8) fail('Registro de suítes incompleto.');

if (mode !== 'structure') {
  const requiredBuilds = process.env.RC011_REQUIRE_IOS?.toLowerCase() === 'false' ? ['android'] : ['android', 'ios'];
  for (const platform of requiredBuilds) {
    const build = builds.platforms?.[platform];
    if (build?.status !== 'captured') fail(`Build ${platform} ainda não foi capturado.`);
    if (!build?.buildId) fail(`Build ID ${platform} ausente.`);
    if (!build?.buildNumber) fail(`Número do build ${platform} ausente.`);
    if (!build?.artifactUrl?.startsWith('https://')) fail(`URL HTTPS do build ${platform} ausente.`);
    if (!/^[a-f0-9]{64}$/i.test(build?.artifactSha256 ?? '')) fail(`SHA-256 do build ${platform} inválido.`);
  }
  if (!/^[a-f0-9]{40}$/i.test(builds.sourceCommit ?? '')) fail('Commit de origem dos builds inválido.');
}

if (mode === 'promotion') {
  for (const profile of matrix.profiles.filter((item) => item.required)) {
    if (profile.status !== 'passed') fail(`Aparelho obrigatório ${profile.id} não aprovado.`);
    if (!profile.evidenceUrl?.startsWith('https://')) fail(`Aparelho ${profile.id} sem evidência HTTPS.`);
  }
  for (const suite of tests.suites.filter((item) => item.required)) {
    if (suite.status !== 'passed') fail(`Suíte obrigatória ${suite.id} não aprovada.`);
    if (!suite.evidenceUrl?.startsWith('https://')) fail(`Suíte ${suite.id} sem evidência HTTPS.`);
  }
  if (ota.publish?.status !== 'passed') fail('Publicação OTA de validação não aprovada.');
  if (!ota.publish?.groupId) fail('Group ID da publicação OTA ausente.');
  if (!ota.publish?.evidenceUrl?.startsWith('https://')) fail('Publicação OTA sem evidência HTTPS.');
  if (ota.rollback?.status !== 'passed') fail('Rollback OTA não aprovado.');
  if (!ota.rollback?.rollbackGroupId) fail('Group ID do rollback ausente.');
  if (!ota.rollback?.evidenceUrl?.startsWith('https://')) fail('Rollback OTA sem evidência HTTPS.');
}

if (failures.length) {
  console.error(`Homologação RC 0.11 reprovada no modo ${mode}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

ok('Estrutura e privacidade dos registros conferidas.');
if (mode !== 'structure') ok('Builds obrigatórios, URLs e checksums conferidos.');
if (mode === 'promotion') ok('Matriz, suítes, OTA e rollback aprovados com evidências HTTPS.');
console.log(`Homologação RC 0.11 aprovada no modo ${mode}:`);
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Tehkné Solutions');
