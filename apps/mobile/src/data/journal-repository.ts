import * as Crypto from 'expo-crypto';

import {
  createJournalEntryInputSchema,
  journalEntrySchema,
  type CreateJournalEntryInput,
  type JournalEntry,
} from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';

function parseStringList(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapRow(row: Record<string, unknown>): JournalEntry {
  return journalEntrySchema.parse({
    id: row.id,
    userId: row.user_id,
    occurredAt: row.occurred_at,
    title: row.title,
    body: row.body,
    emotions: parseStringList(row.emotions_json),
    intensity: row.intensity,
    triggers: parseStringList(row.triggers_json),
    strategies: parseStringList(row.strategies_json),
    forTherapy: Boolean(row.for_therapy),
    linkedCheckInId: row.linked_checkin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function saveJournalEntry(input: CreateJournalEntryInput, userId: string): Promise<JournalEntry> {
  const parsed = createJournalEntryInputSchema.parse(input);
  const db = await getDatabase();
  const now = new Date().toISOString();
  const record = journalEntrySchema.parse({
    ...parsed,
    id: Crypto.randomUUID(),
    userId,
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO journal_entries (
        id, user_id, occurred_at, title, body, emotions_json, intensity,
        triggers_json, strategies_json, for_therapy, linked_checkin_id,
        created_at, updated_at, synced_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL);`,
      record.id,
      record.userId,
      record.occurredAt,
      record.title,
      record.body,
      JSON.stringify(record.emotions),
      record.intensity,
      JSON.stringify(record.triggers),
      JSON.stringify(record.strategies),
      record.forTherapy ? 1 : 0,
      record.linkedCheckInId,
      record.createdAt,
      record.updatedAt,
    );

    await db.runAsync(
      `INSERT INTO sync_queue (
        id, user_id, entity_type, entity_id, operation, payload, attempt_count,
        available_at, created_at, updated_at
      ) VALUES (?, ?, 'journal_entry', ?, 'upsert', ?, 0, ?, ?, ?)
      ON CONFLICT(entity_type, entity_id, operation)
      DO UPDATE SET payload = excluded.payload, available_at = excluded.available_at, updated_at = excluded.updated_at;`,
      Crypto.randomUUID(),
      record.userId,
      record.id,
      JSON.stringify(record),
      now,
      now,
      now,
    );
  });

  return record;
}

export async function listRecentJournalEntries(userId: string, limit = 20): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM journal_entries
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY occurred_at DESC
     LIMIT ?;`,
    userId,
    limit,
  );
  return rows.map(mapRow);
}

export async function listJournalEntriesSince(userId: string, since: string): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM journal_entries
     WHERE user_id = ? AND deleted_at IS NULL AND occurred_at >= ?
     ORDER BY occurred_at DESC;`,
    userId,
    since,
  );
  return rows.map(mapRow);
}
