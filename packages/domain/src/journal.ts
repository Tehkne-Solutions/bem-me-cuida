import { z } from 'zod';

export const journalEmotionValues = [
  'sadness',
  'anxiety',
  'anger',
  'joy',
  'calm',
  'fear',
  'shame',
  'guilt',
  'hope',
  'gratitude',
  'confusion',
] as const;

const shortListItemSchema = z.string().trim().min(1).max(80);

export const journalEntrySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  occurredAt: z.iso.datetime(),
  title: z.string().trim().min(1).max(120).nullable(),
  body: z.string().trim().min(1).max(5000),
  emotions: z.array(z.enum(journalEmotionValues)).min(1).max(6),
  intensity: z.number().int().min(0).max(10),
  triggers: z.array(shortListItemSchema).max(8),
  strategies: z.array(shortListItemSchema).max(8),
  forTherapy: z.boolean(),
  linkedCheckInId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const createJournalEntryInputSchema = journalEntrySchema.omit({
  id: true,
  userId: true,
  occurredAt: true,
  createdAt: true,
  updatedAt: true,
});

export type JournalEmotion = (typeof journalEmotionValues)[number];
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntryInputSchema>;
