import * as Crypto from 'expo-crypto';

import {
  carePracticeCompletionSchema,
  carePracticeSchema,
  createCarePracticeInputSchema,
  type CarePractice,
  type CarePracticeCompletion,
  type CarePracticeCompletionStatus,
  type CreateCarePracticeInput,
} from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';
import { enqueueSyncRecord } from '@/data/sync-queue-repository';
import { dateAtLocalTime, endOfLocalDay, maskIncludesDate, startOfLocalDay } from '@/services/care-time';

export type TodayCarePractice = {
  practice: CarePractice;
  plannedAt: string;
  completion: CarePracticeCompletion | null;
};

function mapPractice(row: Record<string, unknown>): CarePractice {
  return carePracticeSchema.parse({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    category: row.category,
    description: row.description,
    targetMinutes: row.target_minutes,
    timeLocal: row.time_local,
    weekdaysMask: row.weekdays_mask,
    reminderEnabled: Boolean(row.reminder_enabled),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapCompletion(row: Record<string, unknown>): CarePracticeCompletion {
  return carePracticeCompletionSchema.parse({
    id: row.id,
    userId: row.user_id,
    practiceId: row.practice_id,
    plannedAt: row.planned_at,
    completedAt: row.completed_at,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function saveCarePractice(input: CreateCarePracticeInput, userId: string): Promise<CarePractice> {
  const parsed = createCarePracticeInputSchema.parse(input);
  const db = await getDatabase();
  const now = new Date().toISOString();
  const practice = carePracticeSchema.parse({
    id: Crypto.randomUUID(),
    userId,
    ...parsed,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO care_practices (
        id, user_id, title, category, description, target_minutes, time_local,
        weekdays_mask, reminder_enabled, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      practice.id,
      userId,
      practice.title,
      practice.category,
      practice.description,
      practice.targetMinutes,
      practice.timeLocal,
      practice.weekdaysMask,
      practice.reminderEnabled ? 1 : 0,
      now,
      now,
    );
    await enqueueSyncRecord(userId, 'care_practice', practice.id, practice, db);
  });
  return practice;
}

export async function getCarePractice(userId: string, practiceId: string): Promise<CarePractice | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM care_practices WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;`,
    practiceId,
    userId,
  );
  return row ? mapPractice(row) : null;
}

export async function updateCarePractice(
  practiceId: string,
  input: CreateCarePracticeInput,
  userId: string,
): Promise<CarePractice> {
  const parsed = createCarePracticeInputSchema.parse(input);
  const existing = await getCarePractice(userId, practiceId);
  if (!existing) throw new Error('care_practice_not_found');
  const db = await getDatabase();
  const now = new Date().toISOString();
  const practice = carePracticeSchema.parse({ ...existing, ...parsed, active: true, updatedAt: now });
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE care_practices SET title = ?, category = ?, description = ?, target_minutes = ?,
       time_local = ?, weekdays_mask = ?, reminder_enabled = ?, active = 1, updated_at = ?, synced_at = NULL
       WHERE id = ? AND user_id = ?;`,
      practice.title, practice.category, practice.description, practice.targetMinutes, practice.timeLocal,
      practice.weekdaysMask, practice.reminderEnabled ? 1 : 0, now, practiceId, userId,
    );
    await enqueueSyncRecord(userId, 'care_practice', practice.id, practice, db);
  });
  return practice;
}

export async function deactivateCarePractice(userId: string, practiceId: string): Promise<void> {
  const existing = await getCarePractice(userId, practiceId);
  if (!existing) return;
  const db = await getDatabase();
  const now = new Date().toISOString();
  const inactive = carePracticeSchema.parse({ ...existing, active: false, updatedAt: now });
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE care_practices SET active = 0, updated_at = ?, synced_at = NULL WHERE id = ? AND user_id = ?;',
      now, practiceId, userId,
    );
    await enqueueSyncRecord(userId, 'care_practice', practiceId, inactive, db);
  });
}

export async function listCarePractices(userId: string, includeInactive = false): Promise<CarePractice[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM care_practices
     WHERE user_id = ? AND deleted_at IS NULL AND (? = 1 OR active = 1)
     ORDER BY title COLLATE NOCASE ASC;`,
    userId,
    includeInactive ? 1 : 0,
  );
  return rows.map(mapPractice);
}

export async function listTodayCarePractices(userId: string, date = new Date()): Promise<TodayCarePractice[]> {
  const practices = await listCarePractices(userId);
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM care_practice_completions
     WHERE user_id = ? AND planned_at BETWEEN ? AND ? AND deleted_at IS NULL;`,
    userId,
    startOfLocalDay(date).toISOString(),
    endOfLocalDay(date).toISOString(),
  );
  const completions = rows.map(mapCompletion);
  return practices
    .filter((practice) => maskIncludesDate(practice.weekdaysMask, date))
    .map((practice) => {
      const plannedAt = dateAtLocalTime(date, practice.timeLocal).toISOString();
      return {
        practice,
        plannedAt,
        completion: completions.find((item) => item.practiceId === practice.id && item.plannedAt === plannedAt) ?? null,
      };
    })
    .sort((left, right) => left.plannedAt.localeCompare(right.plannedAt));
}

export async function recordCarePracticeCompletion(
  item: Pick<TodayCarePractice, 'practice' | 'plannedAt'>,
  status: CarePracticeCompletionStatus,
  userId: string,
): Promise<CarePracticeCompletion> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM care_practice_completions
     WHERE user_id = ? AND practice_id = ? AND planned_at = ? LIMIT 1;`,
    userId,
    item.practice.id,
    item.plannedAt,
  );
  const now = new Date().toISOString();
  const completion = carePracticeCompletionSchema.parse({
    id: existing?.id ?? Crypto.randomUUID(),
    userId,
    practiceId: item.practice.id,
    plannedAt: item.plannedAt,
    completedAt: status === 'completed' ? now : null,
    status,
    note: existing?.note ?? null,
    createdAt: existing?.created_at ?? now,
    updatedAt: now,
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO care_practice_completions (
        id, user_id, practice_id, planned_at, completed_at, status, note,
        created_at, updated_at, synced_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      ON CONFLICT(user_id, practice_id, planned_at) DO UPDATE SET
        completed_at = excluded.completed_at,
        status = excluded.status,
        note = excluded.note,
        updated_at = excluded.updated_at,
        synced_at = NULL,
        deleted_at = NULL;`,
      completion.id,
      userId,
      completion.practiceId,
      completion.plannedAt,
      completion.completedAt,
      completion.status,
      completion.note,
      completion.createdAt,
      completion.updatedAt,
    );
    await enqueueSyncRecord(userId, 'care_practice_completion', completion.id, completion, db);
  });
  return completion;
}

export async function listRecentCarePracticeCompletions(userId: string, limit = 30): Promise<CarePracticeCompletion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM care_practice_completions
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY planned_at DESC
     LIMIT ?;`,
    userId,
    limit,
  );
  return rows.map(mapCompletion);
}
