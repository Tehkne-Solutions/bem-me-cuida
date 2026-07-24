import { z } from 'zod';

export const weekdayMaskSchema = z.number().int().min(1).max(127);
export const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use o horário no formato HH:mm.');
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data válida.');

export const medicationSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().trim().min(1).max(120),
  dosageText: z.string().trim().min(1).max(80),
  instructions: z.string().trim().max(300).nullable(),
  prescriber: z.string().trim().max(120).nullable(),
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullable(),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const medicationScheduleSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  medicationId: z.uuid(),
  timeLocal: localTimeSchema,
  weekdaysMask: weekdayMaskSchema,
  reminderEnabled: z.boolean(),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const medicationIntakeStatusValues = ['taken', 'skipped'] as const;
export const medicationIntakeSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  medicationId: z.uuid(),
  scheduleId: z.uuid().nullable(),
  plannedAt: z.iso.datetime(),
  occurredAt: z.iso.datetime().nullable(),
  status: z.enum(medicationIntakeStatusValues),
  note: z.string().trim().max(200).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const carePracticeCategoryValues = [
  'breathing',
  'exercise',
  'sleep',
  'therapy',
  'hydration',
  'mindfulness',
  'custom',
] as const;

export const carePracticeSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string().trim().min(1).max(120),
  category: z.enum(carePracticeCategoryValues),
  description: z.string().trim().max(300).nullable(),
  targetMinutes: z.number().int().min(1).max(720).nullable(),
  timeLocal: localTimeSchema.nullable(),
  weekdaysMask: weekdayMaskSchema,
  reminderEnabled: z.boolean(),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const carePracticeCompletionStatusValues = ['completed', 'skipped'] as const;
export const carePracticeCompletionSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  practiceId: z.uuid(),
  plannedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  status: z.enum(carePracticeCompletionStatusValues),
  note: z.string().trim().max(200).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const createMedicationInputSchema = z.object({
  name: medicationSchema.shape.name,
  dosageText: medicationSchema.shape.dosageText,
  instructions: medicationSchema.shape.instructions,
  prescriber: medicationSchema.shape.prescriber,
  startDate: medicationSchema.shape.startDate,
  endDate: medicationSchema.shape.endDate,
  timeLocal: medicationScheduleSchema.shape.timeLocal,
  weekdaysMask: medicationScheduleSchema.shape.weekdaysMask,
  reminderEnabled: medicationScheduleSchema.shape.reminderEnabled,
}).refine((value) => !value.endDate || value.endDate >= value.startDate, {
  path: ['endDate'],
  message: 'A data final não pode ser anterior à inicial.',
});

export const createCarePracticeInputSchema = z.object({
  title: carePracticeSchema.shape.title,
  category: carePracticeSchema.shape.category,
  description: carePracticeSchema.shape.description,
  targetMinutes: carePracticeSchema.shape.targetMinutes,
  timeLocal: carePracticeSchema.shape.timeLocal,
  weekdaysMask: carePracticeSchema.shape.weekdaysMask,
  reminderEnabled: carePracticeSchema.shape.reminderEnabled,
});

export type Medication = z.infer<typeof medicationSchema>;
export type MedicationSchedule = z.infer<typeof medicationScheduleSchema>;
export type MedicationIntake = z.infer<typeof medicationIntakeSchema>;
export type MedicationIntakeStatus = (typeof medicationIntakeStatusValues)[number];
export type CarePractice = z.infer<typeof carePracticeSchema>;
export type CarePracticeCategory = (typeof carePracticeCategoryValues)[number];
export type CarePracticeCompletion = z.infer<typeof carePracticeCompletionSchema>;
export type CarePracticeCompletionStatus = (typeof carePracticeCompletionStatusValues)[number];
export type CreateMedicationInput = z.infer<typeof createMedicationInputSchema>;
export type CreateCarePracticeInput = z.infer<typeof createCarePracticeInputSchema>;
