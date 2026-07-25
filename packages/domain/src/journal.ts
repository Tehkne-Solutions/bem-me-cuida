import { z } from 'zod';

import { moodValues } from './check-in';

export const journalTagSchema = z.string().trim().min(1).max(32);

export const journalEntrySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  occurredAt: z.iso.datetime(),
  title: z.string().trim().max(120).nullable(),
  body: z.string().trim().min(1, 'Escreva ao menos uma palavra.').max(10_000),
  mood: z.enum(moodValues),
  intensity: z.number().int().min(0).max(10).nullable(),
  tags: z.array(journalTagSchema).max(12),
  flagForTherapy: z.boolean(),
  archived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const createJournalEntryInputSchema = journalEntrySchema.pick({
  occurredAt: true,
  title: true,
  body: true,
  mood: true,
  intensity: true,
  tags: true,
  flagForTherapy: true,
});

export const updateJournalEntryInputSchema = createJournalEntryInputSchema.extend({
  id: z.uuid(),
  archived: z.boolean(),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntryInputSchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntryInputSchema>;
