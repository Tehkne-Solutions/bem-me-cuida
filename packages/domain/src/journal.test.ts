import assert from 'node:assert/strict';
import test from 'node:test';

import { createJournalEntryInputSchema } from './journal';

const base = {
  occurredAt: '2026-07-25T12:00:00.000Z',
  title: 'Um dia importante',
  body: 'Hoje percebi que preciso desacelerar.',
  mood: 'neutral' as const,
  intensity: 6,
  tags: ['trabalho', 'sono'],
  flagForTherapy: true,
};

test('aceita uma entrada válida do diário', () => {
  assert.equal(createJournalEntryInputSchema.parse(base).body, base.body);
});

test('rejeita texto vazio e excesso de marcadores', () => {
  assert.equal(createJournalEntryInputSchema.safeParse({ ...base, body: ' ' }).success, false);
  assert.equal(createJournalEntryInputSchema.safeParse({ ...base, tags: Array.from({ length: 13 }, (_, index) => `tag-${index}`) }).success, false);
});
