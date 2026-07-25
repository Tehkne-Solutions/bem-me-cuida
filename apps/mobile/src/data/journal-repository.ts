import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createJournalEntryInputSchema,
  journalEntrySchema,
  updateJournalEntryInputSchema,
  type CreateJournalEntryInput,
  type JournalEntry,
  type UpdateJournalEntryInput,
} from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';
import { enqueueSyncRecord } from '@/data/sync-queue-repository';

export type JournalListOptions = {
  search?: string;
  includeArchived?: boolean;
  therapyOnly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
};

function parseTags(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
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
    mood: row.mood,
    intensity: row.intensity,
    tags: parseTags(row.tags_json),
    flagForTherapy: Boolean(row.flag_for_therapy),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function persistJournalEntry(db: SQLiteDatabase, record: JournalEntry): Promise<void> {
  await db.runAsync(
    `INSERT INTO journal_entries (
      id,user_id,occurred_at,title,body,mood,intensity,tags_json,flag_for_therapy,
      archived,created_at,updated_at,synced_at,deleted_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)
    ON CONFLICT(id) DO UPDATE SET
      occurred_at=excluded.occurred_at,title=excluded.title,body=excluded.body,mood=excluded.mood,
      intensity=excluded.intensity,tags_json=excluded.tags_json,flag_for_therapy=excluded.flag_for_therapy,
      archived=excluded.archived,updated_at=excluded.updated_at,synced_at=NULL,deleted_at=NULL;`,
    record.id,
    record.userId,
    record.occurredAt,
    record.title,
    record.body,
    record.mood,
    record.intensity,
    JSON.stringify(record.tags),
    record.flagForTherapy ? 1 : 0,
    record.archived ? 1 : 0,
    record.createdAt,
    record.updatedAt,
  );
  await enqueueSyncRecord(record.userId, 'journal_entry', record.id, record, db);
}

export async function createJournalEntry(input: CreateJournalEntryInput, userId: string): Promise<JournalEntry> {
  const parsed = createJournalEntryInputSchema.parse(input);
  const now = new Date().toISOString();
  const record = journalEntrySchema.parse({
    id: Crypto.randomUUID(),
    userId,
    ...parsed,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });
  const db = await getDatabase();
  await db.withTransactionAsync(async () => persistJournalEntry(db, record));
  return record;
}

export async function updateJournalEntry(input: UpdateJournalEntryInput, userId: string): Promise<JournalEntry> {
  const parsed = updateJournalEntryInputSchema.parse(input);
  const current = await getJournalEntry(userId, parsed.id);
  if (!current) throw new Error('journal_entry_not_found');
  const record = journalEntrySchema.parse({ ...current, ...parsed, userId, updatedAt: new Date().toISOString() });
  const db = await getDatabase();
  await db.withTransactionAsync(async () => persistJournalEntry(db, record));
  return record;
}

export async function archiveJournalEntry(userId: string, entryId: string, archived = true): Promise<JournalEntry> {
  const current = await getJournalEntry(userId, entryId);
  if (!current) throw new Error('journal_entry_not_found');
  return updateJournalEntry({
    id: current.id,
    occurredAt: current.occurredAt,
    title: current.title,
    body: current.body,
    mood: current.mood,
    intensity: current.intensity,
    tags: current.tags,
    flagForTherapy: current.flagForTherapy,
    archived,
  }, userId);
}

export async function getJournalEntry(userId: string, entryId: string): Promise<JournalEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM journal_entries WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;',
    entryId,
    userId,
  );
  return row ? mapRow(row) : null;
}

export async function listJournalEntries(userId: string, options: JournalListOptions = {}): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const clauses = ['user_id = ?', 'deleted_at IS NULL'];
  const values: Array<string | number> = [userId];
  if (!options.includeArchived) clauses.push('archived = 0');
  if (options.therapyOnly) clauses.push('flag_for_therapy = 1');
  if (options.from) { clauses.push('occurred_at >= ?'); values.push(options.from); }
  if (options.to) { clauses.push('occurred_at < ?'); values.push(options.to); }
  const search = options.search?.trim();
  if (search) {
    clauses.push("(COALESCE(title, '') LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\' OR tags_json LIKE ? ESCAPE '\\')");
    const escaped = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    values.push(escaped, escaped, escaped);
  }
  values.push(options.limit ?? 100);
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM journal_entries WHERE ${clauses.join(' AND ')} ORDER BY occurred_at DESC LIMIT ?;`,
    ...values,
  );
  return rows.map(mapRow);
}

export async function markJournalEntrySynced(userId: string, entryId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE journal_entries SET synced_at = ? WHERE id = ? AND user_id = ?;',
    new Date().toISOString(),
    entryId,
    userId,
  );
}
