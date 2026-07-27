import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2] ?? 'structure';
if (!['structure', 'capture'].includes(mode)) throw new Error('Modo inválido. Use structure ou capture.');
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const builds = readJson(process.env.RC011_BUILDS_PATH ?? 'release/rc-0.11.0/builds.json');
const plan = readJson(process.env.RC011_IOS_PLAN_PATH ?? 'release/rc-0.11.0/ios-homologation-plan.json');
const failures = [];
const fail = (message) => failures.push(message);
if (builds.release !== '0.11.0-rc.1' || plan.release !== '0.11.0-rc.1') fail('Registros não referenciam 0.11.0-rc.1.');
if (builds.generatedBy !== 'Tehkné Solutions' || plan.generatedBy !== 'Tehkné Solutions') fail('Assinatura Tehkné Solutions ausente.');
if (builds.privacy?.containsPersonalData !== false || builds.privacy?.containsClinicalData !== false) fail('Privacidade do registro de builds inválida.');
if (plan.privacy?.containsPersonalData !== false || plan.privacy?.containsClinicalData !== false) fail('Privacidade do plano iOS inválida.');
if (!builds.platforms?.ios) fail('Plataforma iOS ausente no registro de builds.');
if (plan.platform !== 'ios') fail('Plano iOS com plataforma divergente.');
if (mode === 'capture') {
  const ios = builds.platforms.ios;
  if (ios?.status !== 'captured') fail('Build iOS ainda não foi capturado.');
  if (!/^[0-9a-f-]{36}$/i.test(ios?.buildId ?? '')) fail('Build ID iOS inválido.');
  if (!/^[a-f0-9]{64}$/i.test(ios?.artifactSha256 ?? '')) fail('SHA-256 iOS inválido.');
  if (!String(ios?.artifactUrl ?? '').startsWith('https://')) fail('URL HTTPS do artefato iOS ausente.');
  if (plan.status !== 'pending-physical-validation' && !['in-progress', 'retest-required', 'ready-for-review'].includes(plan.status)) fail('Plano iOS não foi materializado.');
  if (plan.build?.buildId !== ios.buildId || plan.build?.artifactSha256 !== ios.artifactSha256) fail('Plano iOS não corresponde ao build capturado.');
}
if (failures.length) {
  console.error(`Custódia iOS reprovada no modo ${mode}:`);
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Custódia iOS aprovada no modo ${mode}.`);
console.log('Tehkné Solutions');
