import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createFinalRcDecision } from './lib/rc011-ota-final-validation.mjs';

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const payload = createFinalRcDecision({
  infrastructure: readJson(process.env.RC011_INFRASTRUCTURE_PATH ?? 'release/rc-0.11.0/infrastructure-readiness.json'),
  builds: readJson(process.env.RC011_BUILDS_PATH ?? 'release/rc-0.11.0/builds.json'),
  deviceMatrix: readJson(process.env.RC011_DEVICE_MATRIX_PATH ?? 'release/rc-0.11.0/device-matrix.json'),
  testResults: readJson(process.env.RC011_TEST_RESULTS_PATH ?? 'release/rc-0.11.0/test-results.json'),
  androidPlan: readJson(process.env.RC011_ANDROID_PLAN_PATH ?? 'release/rc-0.11.0/android-homologation-plan.json'),
  iosPlan: readJson(process.env.RC011_IOS_PLAN_PATH ?? 'release/rc-0.11.0/ios-homologation-plan.json'),
  ota: readJson(process.env.RC011_OTA_VALIDATION_PATH ?? 'release/rc-0.11.0/ota-validation.json'),
  otaDeviceValidation: readJson(process.env.RC011_OTA_DEVICE_VALIDATION_PATH ?? 'release/rc-0.11.0/ota-device-validation.json'),
});
const jsonOutput = resolve(process.env.RC011_FINAL_DECISION_OUTPUT ?? 'artifacts/bemmecuida-0.11.0-rc.1-final-decision.json');
const markdownOutput = resolve(process.env.RC011_FINAL_DECISION_MARKDOWN_OUTPUT ?? 'artifacts/bemmecuida-0.11.0-rc.1-final-decision.md');
mkdirSync(dirname(jsonOutput), { recursive: true });
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(jsonOutput, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const markdown = [
  '# BemMeCuida 0.11.0-rc.1 — decisão final da candidata', '',
  `- Recomendação: **${payload.recommendation === 'promote' ? 'PROMOVER PARA APROVAÇÃO HUMANA' : 'MANTER EM HOLD'}**`,
  `- Bloqueadores: ${payload.blockerCount}`,
  `- Builds capturados: ${payload.summary.buildsCaptured}/2`,
  `- Aparelhos obrigatórios: ${payload.summary.requiredDevicesPassed}/${payload.summary.requiredDevicesTotal}`,
  `- Suítes obrigatórias: ${payload.summary.requiredSuitesPassed}/${payload.summary.requiredSuitesTotal}`,
  `- OTA publicado: ${payload.summary.otaPublishStatus}`,
  `- Rollback OTA: ${payload.summary.otaRollbackStatus}`,
  `- Validação física OTA: ${payload.summary.otaPhysicalStatus}`, '',
  '## Bloqueadores', '', ...(payload.blockers.length ? payload.blockers.map((item) => `- ${item}`) : ['- Nenhum bloqueador técnico registrado.']), '',
  '> A recomendação não altera gates, não publica a versão e não executa promoção automática.', '',
  '**Tehkné Solutions**', '',
].join('\n');
writeFileSync(markdownOutput, markdown, 'utf8');
console.log(`Pacote final salvo em ${jsonOutput} e ${markdownOutput}.`);
console.log(`Recomendação: ${payload.recommendation}.`);
console.log('Tehkné Solutions');
