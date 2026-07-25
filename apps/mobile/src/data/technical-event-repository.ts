import * as Crypto from 'expo-crypto';

import { getDatabase } from '@/data/database';

export type TechnicalEventName =
  | 'app_session_started'
  | 'app_backgrounded'
  | 'app_foregrounded'
  | 'diagnostics_completed'
  | 'feedback_submitted'
  | 'feedback_failed';

export type TechnicalEventContext = Record<string, number | boolean | null>;

export type TechnicalEvent = {
  id: string;
  eventName: TechnicalEventName;
  context: TechnicalEventContext;
  occurredAt: string;
};

function parseContext(raw: string): TechnicalEventContext {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const output: TechnicalEventContext = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' || typeof value === 'boolean' || value === null) output[key] = value;
    }
    return output;
  } catch {
    return {};
  }
}

export async function recordTechnicalEvent(
  userId: string,
  eventName: TechnicalEventName,
  context: TechnicalEventContext = {},
): Promise<void> {
  const db = await getDatabase();
  const occurredAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO technical_events (id, user_id, event_name, context_json, occurred_at)
     VALUES (?, ?, ?, ?, ?);`,
    Crypto.randomUUID(),
    userId,
    eventName,
    JSON.stringify(context),
    occurredAt,
  );
  await db.runAsync(
    `DELETE FROM technical_events
     WHERE user_id = ? AND id NOT IN (
       SELECT id FROM technical_events WHERE user_id = ? ORDER BY occurred_at DESC LIMIT 200
     );`,
    userId,
    userId,
  );
}

export async function listRecentTechnicalEvents(userId: string, limit = 40): Promise<TechnicalEvent[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    event_name: TechnicalEventName;
    context_json: string;
    occurred_at: string;
  }>(
    `SELECT id, event_name, context_json, occurred_at
     FROM technical_events WHERE user_id = ? ORDER BY occurred_at DESC LIMIT ?;`,
    userId,
    safeLimit,
  );
  return rows.map((row) => ({
    id: row.id,
    eventName: row.event_name,
    context: parseContext(row.context_json),
    occurredAt: row.occurred_at,
  }));
}

export async function countTechnicalEvents(userId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM technical_events WHERE user_id = ?;',
    userId,
  );
  return Number(row?.total ?? 0);
}

export async function clearTechnicalEvents(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM technical_events WHERE user_id = ?;', userId);
}
