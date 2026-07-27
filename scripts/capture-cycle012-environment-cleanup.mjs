import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildCleanupCapture, sanitizeCycle012Artifact } from './lib/cycle012-bootstrap.mjs';

const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const output = arg('output');
if (!output) throw new Error('--output é obrigatório.');
const capture = sanitizeCycle012Artifact(buildCleanupCapture({
  sourceCommit: arg('source-commit'),
  environment: arg('environment'),
  status: arg('status'),
  evidenceUrl: arg('evidence-url'),
  capturedAt: new Date().toISOString(),
}));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(capture, null, 2)}\n`, 'utf8');
console.log(`Evidência de limpeza capturada em ${output}.`);
console.log(`Environment: ${capture.environment}; status: ${capture.status}.`);
console.log('Tehkné Solutions');
