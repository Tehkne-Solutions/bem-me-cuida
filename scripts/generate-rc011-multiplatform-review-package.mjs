import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createMultiplatformReview } from './lib/rc011-ios-multiplatform-validation.mjs';

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const outputJson = process.env.RC011_MULTIPLATFORM_REVIEW_JSON ?? 'artifacts/bemmecuida-0.11.0-rc.1-multiplatform.json';
const outputMd = process.env.RC011_MULTIPLATFORM_REVIEW_MD ?? 'artifacts/bemmecuida-0.11.0-rc.1-multiplatform.md';
const review = createMultiplatformReview({
  builds: readJson(process.env.RC011_BUILDS_PATH ?? 'release/rc-0.11.0/builds.json'),
  deviceMatrix: readJson(process.env.RC011_DEVICE_MATRIX_PATH ?? 'release/rc-0.11.0/device-matrix.json'),
  testResults: readJson(process.env.RC011_TEST_RESULTS_PATH ?? 'release/rc-0.11.0/test-results.json'),
  androidPlan: readJson(process.env.RC011_ANDROID_PLAN_PATH ?? 'release/rc-0.11.0/android-homologation-plan.json'),
  iosPlan: readJson(process.env.RC011_IOS_PLAN_PATH ?? 'release/rc-0.11.0/ios-homologation-plan.json'),
  ota: readJson(process.env.RC011_OTA_VALIDATION_PATH ?? 'release/rc-0.11.0/ota-validation.json'),
});
for (const path of [outputJson, outputMd]) mkdirSync(dirname(resolve(path)), { recursive: true });
writeFileSync(resolve(outputJson), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
const lines = [
  '# Revisão multiplataforma da RC 0.11.0-rc.1', '',
  `- Recomendação: **${review.recommendation}**`,
  `- Builds capturados: ${review.summary.buildsCaptured}/2`,
  `- Aparelhos obrigatórios: ${review.summary.passedRequiredDevices}/${review.summary.requiredDevices}`,
  `- Suítes obrigatórias: ${review.summary.passedRequiredSuites}/${review.summary.requiredSuites}`,
  '', '## Bloqueadores',
  ...(review.blockers.length ? review.blockers.map((item) => `- ${item}`) : ['- nenhum']),
  '', 'Nenhuma promoção é executada automaticamente.', '', '**Tehkné Solutions**', '',
];
writeFileSync(resolve(outputMd), lines.join('\n'), 'utf8');
console.log(`Pacote multiplataforma salvo em ${resolve(outputJson)} e ${resolve(outputMd)}.`);
