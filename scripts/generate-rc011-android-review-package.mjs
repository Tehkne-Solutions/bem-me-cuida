import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createAndroidGateProposal, createAndroidHomologationReport } from './lib/rc011-android-physical-validation.mjs';

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
for (const name of ['plan', 'gate-map', 'output-proposal', 'output-report-json', 'output-report-md']) {
  if (!args[name]) throw new Error(`Argumento obrigatório ausente: --${name}.`);
}
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const saveJson = (path, value) => {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const plan = readJson(args.plan);
const proposal = createAndroidGateProposal({ plan, gateMap: readJson(args['gate-map']) });
const report = createAndroidHomologationReport({ plan, proposal });
saveJson(args['output-proposal'], proposal);
saveJson(args['output-report-json'], report);

const markdown = `# Pacote de revisão Android — BemMeCuida 0.11.0-rc.1

- Build ID: \`${report.buildId ?? 'pendente'}\`
- Estado: **${report.status}**
- Sessões: **${report.sessionCount}**
- Aparelhos obrigatórios: **${report.summary?.passedRequiredDevices ?? 0}/${report.summary?.requiredDevices ?? 0}**
- Suítes obrigatórias: **${report.summary?.passedRequiredSuites ?? 0}/${report.summary?.requiredSuites ?? 0}**
- Retestes obrigatórios: **${report.retests.length}**
- Pronto para revisão Android: **${report.readyForAndroidReview ? 'sim' : 'não'}**
- Aprovação global automática: **não**

## Gates Android

${proposal.gates.map((gate) => `- \`${gate.gateKey}\`: **${gate.recommendedStatus}** (${gate.passedSourceCount}/${gate.sourceCount})`).join('\n')}

## Retestes

${report.retests.length ? report.retests.map((item) => `- ${item.type}: \`${item.id}\` — ${item.status}`).join('\n') : '- Nenhum reteste obrigatório registrado.'}

Este pacote é informativo. O payload global e a revisão humana continuam sendo as autoridades de promoção.

**Tehkné Solutions**
`;
const markdownOutput = resolve(args['output-report-md']);
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(markdownOutput, markdown, 'utf8');
console.log(`Pacote de revisão Android gerado em ${markdownOutput}.`);
console.log('Nenhum gate global foi alterado automaticamente.');
console.log('Tehkné Solutions');
