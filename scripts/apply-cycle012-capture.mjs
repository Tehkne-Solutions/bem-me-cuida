import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyCleanupCapture, applyFeedbackCapture, sanitizeCycle012Artifact } from './lib/cycle012-bootstrap.mjs';

const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const capturePath = arg('capture');
const currentPath = arg('current');
const outputPath = arg('output');
if (!capturePath || !currentPath || !outputPath) throw new Error('--capture, --current e --output são obrigatórios.');
const capture = JSON.parse(readFileSync(capturePath, 'utf8'));
const current = JSON.parse(readFileSync(currentPath, 'utf8'));
let updated;
if (capture.captureType === 'cycle012-feedback-summary') updated = applyFeedbackCapture(current, capture);
else if (capture.captureType === 'cycle012-environment-cleanup') updated = applyCleanupCapture(current, capture);
else throw new Error(`captureType desconhecido: ${capture.captureType ?? 'ausente'}.`);
sanitizeCycle012Artifact(updated);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
console.log(`Captura ${capture.captureType} aplicada em ${outputPath}.`);
console.log('Tehkné Solutions');
