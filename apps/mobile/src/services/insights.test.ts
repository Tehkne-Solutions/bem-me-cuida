import assert from 'node:assert/strict';
import test from 'node:test';

import type { CheckIn, JournalEntry } from '@bemmecuida/domain';

import { buildWeeklyInsightSummary } from '@/services/insights';

const now = '2026-07-25T12:00:00.000Z';

const checkIns: CheckIn[] = [
  {
    id: '11111111-1111-4111-8111-111111111111', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', occurredAt: now,
    mood: 'neutral', anxiety: 6, energy: 4, irritability: 3, agitation: 4, impulsivity: 2,
    concentration: 5, craving: 0, sleepQuality: 'partial', sleepMinutes: 360, note: null,
    createdAt: now, updatedAt: now,
  },
  {
    id: '22222222-2222-4222-8222-222222222222', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', occurredAt: now,
    mood: 'good', anxiety: 2, energy: 8, irritability: 1, agitation: 1, impulsivity: 1,
    concentration: 7, craving: 0, sleepQuality: 'good', sleepMinutes: 480, note: null,
    createdAt: now, updatedAt: now,
  },
];

const entries: JournalEntry[] = [{
  id: '33333333-3333-4333-8333-333333333333', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', occurredAt: now,
  title: null, body: 'Registro', emotions: ['anxiety', 'hope'], intensity: 6,
  triggers: ['Conversa'], strategies: ['Respiração'], forTherapy: true, linkedCheckInId: null,
  createdAt: now, updatedAt: now,
}];

test('resumo calcula médias e emoções mais frequentes', () => {
  const summary = buildWeeklyInsightSummary(checkIns, entries);
  assert.equal(summary.averages.anxiety, 4);
  assert.equal(summary.averages.sleepHours, 7);
  assert.equal(summary.topEmotions.length, 2);
  assert.equal(summary.therapyNotes, 1);
});

test('resumo vazio oferece pergunta de observação', () => {
  const summary = buildWeeklyInsightSummary([], []);
  assert.equal(summary.checkInCount, 0);
  assert.equal(summary.prompts.length, 1);
});
