import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2] ?? 'structure';
if (!['structure', 'capture'].includes(mode)) throw new Error('Use structure ou capture.');

const failures = [];
const fail = (message) => failures.push(message);
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const templatePath = resolve('release/rc-0.11.0/android-homologation-plan.template.json');

if (!existsSync(templatePath)) fail('Modelo de homologação Android ausente.');
else {
  const template = readJson(templatePath);
  if (template.release !== '0.11.0-rc.1') fail('Modelo não referencia 0.11.0-rc.1.');
  if (template.generatedBy !== 'Tehkné Solutions') fail('Modelo sem assinatura Tehkné Solutions.');
  if (template.rules?.automaticApproval !== false) fail('Modelo não pode permitir aprovação automática.');
  if (template.privacy?.containsSecrets !== false) fail('Modelo não declara ausência de secrets.');
}

if (mode === 'capture') {
  const buildsPath = process.env.RC011_BUILDS_PATH ?? 'release/rc-0.11.0/builds.json';
  const planPath = process.env.RC011_ANDROID_PLAN_PATH ?? 'release/rc-0.11.0/android-homologation-plan.json';
  if (!existsSync(resolve(buildsPath))) fail(`Registro de builds ausente: ${buildsPath}`);
  if (!existsSync(resolve(planPath))) fail(`Plano Android ausente: ${planPath}`);

  if (failures.length === 0) {
    const builds = readJson(buildsPath);
    const plan = readJson(planPath);
    const android = builds.platforms?.android;
    if (android?.status !== 'captured') fail('Build Android ainda não está capturado.');
    if (!/^[0-9a-f-]{36}$/i.test(android?.buildId ?? '')) fail('Build ID Android inválido.');
    if (!/^[a-f0-9]{64}$/i.test(android?.artifactSha256 ?? '')) fail('SHA-256 Android inválido.');
    if (!String(android?.artifactUrl ?? '').startsWith('https://')) fail('URL do artefato Android não usa HTTPS.');
    if (!String(android?.evidenceUrl ?? '').startsWith('https://')) fail('Evidência do build Android não usa HTTPS.');
    if (plan.release !== '0.11.0-rc.1' || plan.platform !== 'android') fail('Plano Android referencia release ou plataforma divergente.');
    if (plan.build?.buildId !== android?.buildId) fail('Plano físico não corresponde ao build capturado.');
    if (plan.build?.artifactSha256 !== android?.artifactSha256) fail('Plano físico não corresponde ao checksum capturado.');
    if (plan.status !== 'pending-physical-validation') fail('Plano deve iniciar pendente de validação física.');
    if ((plan.devices ?? []).some((item) => item.status !== 'pending')) fail('Todos os aparelhos precisam iniciar pendentes.');
    if ((plan.suites ?? []).some((item) => item.status !== 'pending')) fail('Todas as suítes precisam iniciar pendentes.');
    if ((plan.devices ?? []).filter((item) => item.required).length < 3) fail('Plano precisa cobrir ao menos três perfis Android obrigatórios.');
    if (plan.privacy?.containsPersonalData !== false || plan.privacy?.containsClinicalData !== false) {
      fail('Declaração de privacidade do plano está incompleta.');
    }
    if (plan.generatedBy !== 'Tehkné Solutions') fail('Plano sem assinatura Tehkné Solutions.');
  }
}

if (failures.length) {
  console.error(`Artefato Android RC 0.11 ${mode} reprovado:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Artefato Android RC 0.11 ${mode} aprovado.`);
console.log('Nenhum aparelho, suíte ou gate foi aprovado automaticamente.');
console.log('Tehkné Solutions');
