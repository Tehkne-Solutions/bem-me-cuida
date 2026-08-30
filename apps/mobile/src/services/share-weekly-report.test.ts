import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWeeklyReport, type WeeklyShareFacts } from './share-weekly-report';

const facts: WeeklyShareFacts = {
  startLabel: '24/08', endLabel: '30/08', totalRecords: 22, medicationRecords: 12, practiceRecords: 5, checkInDays: 5,
  currentTotal: 22, previousTotal: 17, currentMedication: 12, previousMedication: 10, currentPractice: 5, previousPractice: 3,
  currentCheckIns: 5, previousCheckIns: 4, currentActiveDays: 6, previousActiveDays: 5,
};

test('formatWeeklyReport keeps comparison factual and numeric', () => {
  const report = formatWeeklyReport(facts);
  assert.match(report, /Medicações: 12 vs 10 \(\+2\)/);
  assert.match(report, /Total: 22 vs 17 \(\+5\)/);
  assert.doesNotMatch(report, /melhorou|piorou|melhora|piora/i);
  assert.match(report, /Tehkné Solutions/);
});

test('formatWeeklyReport preserves zero and negative variations', () => {
  const report = formatWeeklyReport({ ...facts, currentPractice: 3, previousPractice: 3, currentCheckIns: 2, previousCheckIns: 4 });
  assert.match(report, /Práticas: 3 vs 3 \(0\)/);
  assert.match(report, /Check-ins: 2 vs 4 \(-2\)/);
});
