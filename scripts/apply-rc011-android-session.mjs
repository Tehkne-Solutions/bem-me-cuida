import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  applyAndroidPhysicalSession,
  createAndroidGateProposal,
  createAndroidHomologationReport,
} from './lib/rc011-android-physical-validation.mjs';

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
const required = [
  'plan', 'matrix', 'tests', 'session', 'gate-map', 'output-plan', 'output-matrix', 'output-tests',
  'output-session', 'output-proposal', 'output-report-json', 'output-report-md',
];
for (const name of required) if (!args[name]) throw new Error(`Argumento obrigatório ausente: --${name}.`);

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const saveJson = (path, value) => {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const session = readJson(args.session);
const applied = applyAndroidPhysicalSession({
  plan: readJson(args.plan),
  deviceMatrix: readJson(args.matrix),
  testResults: readJson(args.tests),
  session,
});
const proposal = createAndroidGateProposal({ plan: applied.plan, gateMap: readJson(args['gate-map']) });
const report = createAndroidHomologationReport({ plan: applied.plan, proposal });

saveJson(args['output-plan'], applied.plan);
saveJson(args['output-matrix'], applied.deviceMatrix);
saveJson(args['output-tests'], applied.testResults);
saveJson(args['output-session'], session);
saveJson(args['output-proposal'], proposal);
saveJson(args['output-report-json'], report);

const markdown = `# Homologação Android — BemMeCuida 0.11.0-rc.1

- Build ID: \`${report.buildId}\`
- Status da matriz Android: **${report.status}**
- Sessões registradas: **${report.sessionCount}**
- Aparelhos obrigatórios aprovados: **${report.summary.passedRequiredDevices}/${report.summary.requiredDevices}**
- Suítes obrigatórias aprovadas: **${report.summary.passedRequiredSuites}/${report.summary.requiredSuites}**
- Itens obrigatórios falhos ou bloqueados: **${report.summary.failedOrBlockedRequiredItems}**
- Pronto para revisão Android: **${report.readyForAndroidReview ? 'sim' : 'não'}**
- Gate global alterado automaticamente: **não**

## Retestes

${report.retests.length ? report.retests.map((item) => `- ${item.type}: \`${item.id}\` — ${item.status}`).join('\n') : '- Nenhum reteste obrigatório registrado.'}

As evidências usam contas sintéticas e não devem conter dados pessoais, clínicos, secrets, IMEI, número de série ou identificadores únicos do aparelho.

**Tehkné Solutions**
`;
const markdownOutput = resolve(args['output-report-md']);
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(markdownOutput, markdown, 'utf8');

console.log(applied.duplicate ? 'Sessão já existia; registros preservados.' : `Sessão ${session.sessionId} consolidada.`);
console.log(`Recomendação Android pronta para revisão: ${proposal.readyForAndroidReview ? 'sim' : 'não'}.`);
console.log('Nenhum gate global foi aprovado automaticamente.');
console.log('Tehkné Solutions');
