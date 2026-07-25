import { journalEntrySchema, type JournalEntry } from '@bemmecuida/domain';

import { getCareSyncCursor, resetCareSyncCursor, saveCareSyncCursor } from '@/data/care-sync-cursor-repository';
import { getDatabase } from '@/data/database';
import { markJournalEntrySynced } from '@/data/journal-repository';
import { supabase } from '@/services/supabase';

const PULL_PAGE_SIZE = 250;

export type JournalSyncOutcome = 'applied' | 'remote_newer';

type RemoteJournalRow = {
  id: string;
  user_id: string;
  occurred_at: string;
  title: string | null;
  body: string;
  mood: JournalEntry['mood'];
  intensity: number | null;
  tags: string[] | null;
  flag_for_therapy: boolean;
  archived: boolean;
  client_updated_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRemote(row: RemoteJournalRow): JournalEntry {
  return journalEntrySchema.parse({
    id: row.id,
    userId: row.user_id,
    occurredAt: row.occurred_at,
    title: row.title,
    body: row.body,
    mood: row.mood,
    intensity: row.intensity,
    tags: row.tags ?? [],
    flagForTherapy: row.flag_for_therapy,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.client_updated_at,
  });
}

export async function syncJournalQueueItem(payload: unknown, activeUserId: string): Promise<JournalSyncOutcome> {
  if (!supabase) throw new Error('supabase_unavailable');
  const record = journalEntrySchema.parse(payload);
  if (record.userId !== activeUserId) throw new Error('account_scope_mismatch');
  const { data, error } = await supabase.rpc('sync_journal_entry', {
    p_record: {
      id: record.id,
      user_id: record.userId,
      occurred_at: record.occurredAt,
      title: record.title,
      body: record.body,
      mood: record.mood,
      intensity: record.intensity,
      tags: record.tags,
      flag_for_therapy: record.flagForTherapy,
      archived: record.archived,
      client_updated_at: record.updatedAt,
      deleted_at: null,
    },
  });
  if (error) throw new Error(error.code ?? 'journal_sync_failed');
  if (data !== 'applied' && data !== 'remote_newer') throw new Error('unexpected_sync_outcome');
  return data;
}

export async function markJournalSynced(userId: string, entryId: string): Promise<void> {
  await markJournalEntrySynced(userId, entryId);
}

export async function resetJournalCursor(userId: string): Promise<void> {
  await resetCareSyncCursor(userId, 'journal_entry');
}

async function hasPendingLocalChange(userId: string, entryId: string): Promise<boolean> {
  const db = await getDatabase();
  const pending = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM sync_queue WHERE user_id = ? AND entity_type = 'journal_entry' AND entity_id = ? LIMIT 1;",
    userId,
    entryId,
  );
  return Boolean(pending);
}

async function applyRemote(row: RemoteJournalRow): Promise<boolean> {
  if (await hasPendingLocalChange(row.user_id, row.id)) return false;
  const db = await getDatabase();
  const syncedAt = new Date().toISOString();
  if (row.deleted_at) {
    await db.runAsync(
      'UPDATE journal_entries SET deleted_at = ?, updated_at = ?, synced_at = ? WHERE id = ? AND user_id = ?;',
      row.deleted_at,
      row.client_updated_at,
      syncedAt,
      row.id,
      row.user_id,
    );
    return true;
  }
  const record = mapRemote(row);
  await db.runAsync(
    `INSERT INTO journal_entries (
      id,user_id,occurred_at,title,body,mood,intensity,tags_json,flag_for_therapy,archived,
      created_at,updated_at,synced_at,deleted_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)
    ON CONFLICT(id) DO UPDATE SET
      occurred_at=excluded.occurred_at,title=excluded.title,body=excluded.body,mood=excluded.mood,
      intensity=excluded.intensity,tags_json=excluded.tags_json,flag_for_therapy=excluded.flag_for_therapy,
      archived=excluded.archived,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL
    WHERE excluded.updated_at >= journal_entries.updated_at;`,
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
    syncedAt,
  );
  return true;
}

export async function pullRemoteJournalEntries(userId: string): Promise<number> {
  if (!supabase) return 0;
  const initial = await getCareSyncCursor(userId, 'journal_entry');
  let cursor = initial.updatedAt ?? '1970-01-01T00:00:00.000Z';
  let cursorId = initial.id ?? '00000000-0000-0000-0000-000000000000';
  let pulled = 0;

  while (true) {
    const { data, error } = await supabase.rpc('pull_journal_entries', {
      p_cursor_updated_at: cursor,
      p_cursor_id: cursorId,
      p_limit: PULL_PAGE_SIZE,
    });
    if (error) throw new Error(error.code ?? 'journal_pull_failed');
    const rows = (data ?? []) as RemoteJournalRow[];
    if (!rows.length) break;
    let blocked = false;
    for (const row of rows) {
      if (row.user_id !== userId) throw new Error('account_scope_mismatch');
      if (!await applyRemote(row)) { blocked = true; break; }
      cursor = row.updated_at;
      cursorId = row.id;
      pulled += 1;
      await saveCareSyncCursor(userId, 'journal_entry', cursor, cursorId);
    }
    if (blocked || rows.length < PULL_PAGE_SIZE) break;
  }
  return pulled;
}
