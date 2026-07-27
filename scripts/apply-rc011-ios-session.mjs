import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { applyIosPhysicalSession, createMultiplatformReview } from './lib/rc011-ios-multiplatform-validation.mjs';

function argsMap(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Argumento inválido próximo de ${key ?? 'fim'}.`);
    result[key.slice(2)] = value;
  }
  return result;
}
const args = argsMap(process.argv.slice(2));
const required = ['plan', 'matrix', 'tests', 'session', 'builds', 'android-plan', 'ota', 'output-plan', 'output-matrix', 'output-tests', 'output-session', 'output-review'];
for (const key of required) if (!args[key]) throw new Error(`Argumento obrigatório ausente: --${key}.`);
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const save = (path, value) => {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const session = readJson(args.session);
const result = applyIosPhysicalSession({ plan: readJson(args.plan), deviceMatrix: readJson(args.matrix), testResults: readJson(args.tests), session });
if (!result.duplicate) {
  save(args['output-plan'], result.plan);
  save(args['output-matrix'], result.deviceMatrix);
  save(args['output-tests'], result.testResults);
  save(args['output-session'], session);
}
const review = createMultiplatformReview({
  builds: readJson(args.builds), deviceMatrix: result.deviceMatrix, testResults: result.testResults,
  androidPlan: readJson(args['android-plan']), iosPlan: result.plan, ota: readJson(args.ota),
});
save(args['output-review'], review);
console.log(result.duplicate ? 'Sessão iOS já registrada; nenhuma duplicação criada.' : 'Sessão iOS aplicada aos registros revisáveis.');
console.log(`Recomendação multiplataforma: ${review.recommendation}.`);
console.log('Tehkné Solutions');
