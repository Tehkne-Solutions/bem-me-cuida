import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPersonalSummary } from './insights';

test('resume somente dados fornecidos e inclui limite clínico', () => {
  const summary = buildPersonalSummary({
    period: 'week',
    from: '2026-07-20T00:00:00.000Z',
    to: '2026-07-27T00:00:00.000Z',
    journalEntries: [{
      id: '13d80865-5378-4b47-92a0-f71df56a8b54', userId: '23414c2a-3836-4d4c-bf4b-f773f93e5241',
      occurredAt: '2026-07-25T12:00:00.000Z', title: null, body: 'Um registro', mood: 'low', intensity: 7,
      tags: ['sono'], flagForTherapy: true, archived: false, createdAt: '2026-07-25T12:00:00.000Z', updatedAt: '2026-07-25T12:00:00.000Z',
    }],
    checkIns: [], medicationIntakes: [], practiceCompletions: [],
  });
  assert.equal(summary.dominantMood, 'low');
  assert.equal(summary.topTags[0]?.tag, 'sono');
  assert.match(summary.observations.at(-1) ?? '', /não representam diagnóstico/);
});
