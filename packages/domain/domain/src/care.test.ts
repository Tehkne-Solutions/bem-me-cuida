import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCarePracticeInputSchema,
  createMedicationInputSchema,
  localTimeSchema,
  weekdayMaskSchema,
} from './care';

test('aceita horário local válido e rejeita valores fora do relógio', () => {
  assert.equal(localTimeSchema.safeParse('08:30').success, true);
  assert.equal(localTimeSchema.safeParse('25:10').success, false);
});

test('máscara semanal precisa selecionar ao menos um dia', () => {
  assert.equal(weekdayMaskSchema.safeParse(127).success, true);
  assert.equal(weekdayMaskSchema.safeParse(0).success, false);
});

test('medicação rejeita data final anterior ao início', () => {
  const parsed = createMedicationInputSchema.safeParse({
    name: 'Medicação de teste',
    dosageText: '1 unidade',
    instructions: null,
    prescriber: null,
    startDate: '2026-07-24',
    endDate: '2026-07-23',
    timeLocal: '09:00',
    weekdaysMask: 127,
    reminderEnabled: true,
  });
  assert.equal(parsed.success, false);
});

test('prática exige título e categoria permitida', () => {
  const parsed = createCarePracticeInputSchema.safeParse({
    title: 'Respiração guiada',
    category: 'breathing',
    description: null,
    targetMinutes: 5,
    timeLocal: '18:00',
    weekdaysMask: 127,
    reminderEnabled: false,
  });
  assert.equal(parsed.success, true);
});
