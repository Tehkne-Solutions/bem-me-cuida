import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateSupportLanguage } from './support-language';

test('não classifica texto comum', () => {
  assert.equal(evaluateSupportLanguage('Hoje caminhei e consegui descansar.').level, 'none');
});

test('oferece apoio com linguagem de incerteza', () => {
  const result = evaluateSupportLanguage('Estou sem esperança e não aguento.');
  assert.equal(result.level, 'support');
  assert.match(result.message ?? '', /Posso ter entendido errado/);
});

test('sinaliza apoio imediato sem diagnosticar', () => {
  assert.equal(evaluateSupportLanguage('Não quero mais viver.').level, 'urgent');
});
