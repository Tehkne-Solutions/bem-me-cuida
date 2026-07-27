import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildFeedbackCapture, sanitizeCycle012Artifact } from './lib/cycle012-bootstrap.mjs';

const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const output = arg('output');
if (!output) throw new Error('--output é obrigatório.');
const capture = sanitizeCycle012Artifact(buildFeedbackCapture({
  sourceCommit: arg('source-commit'),
  themeCounts: arg('theme-counts'),
  impacts: { blocking: arg('blocking', '0'), high: arg('high', '0'), medium: arg('medium', '0'), low: arg('low', '0') },
  excludedSensitiveItems: arg('excluded-sensitive', '0'),
  evidenceUrl: arg('evidence-url'),
  capturedAt: new Date().toISOString(),
}));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(capture, null, 2)}\n`, 'utf8');
console.log(`Síntese anônima capturada em ${output}.`);
console.log(`Status: ${capture.status}.`);
console.log('Tehkné Solutions');
