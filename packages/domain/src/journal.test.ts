import assert from 'node:assert/strict';
import test from 'node:test';

import { createJournalEntryInputSchema } from './journal';

const valid = {
  title: 'Depois da consulta',
  body: 'Consegui perceber melhor o que aumentou minha ansiedade hoje.',
  emotions: ['anxiety', 'hope'],
  intensity: 6,
  triggers: ['Conversa difícil'],
  strategies: ['Respiração', 'Pausa curta'],
  forTherapy: true,
  linkedCheckInId: null,
} as const;

test('diário aceita entrada estruturada válida', () => {
  assert.equal(createJournalEntryInputSchema.safeParse(valid).success, true);
});

test('diário exige pelo menos uma emoção', () => {
  assert.equal(createJournalEntryInputSchema.safeParse({ ...valid, emotions: [] }).success, false);
});

test('diário limita o texto principal', () => {
  assert.equal(createJournalEntryInputSchema.safeParse({ ...valid, body: 'a'.repeat(5001) }).success, false);
});
