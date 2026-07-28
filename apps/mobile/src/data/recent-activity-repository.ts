import { getDatabase } from '@/data/database';

export type RecentActivityKind = 'medication' | 'practice' | 'check_in';
export type RecentActivityHref = '/medications' | '/routines' | '/(tabs)/check-in';

export type RecentActivity = {
  id: string;
  kind: RecentActivityKind;
  title: string;
  detail: string;
  occurredAt: string;
  synced: boolean;
  href: RecentActivityHref;
};

type ActivityRow = {
  id: string;
  kind: RecentActivityKind;
  title: string;
  detail: string;
  occurred_at: string;
  synced_at: string | null;
};

const moodLabels: Record<string, string> = {
  very_low: 'Humor muito difícil',
  low: 'Humor difícil',
  neutral: 'Humor neutro',
  good: 'Humor bem',
  very_good: 'Humor muito bem',
};

function hrefFor(kind: RecentActivityKind): RecentActivityHref {
  if (kind === 'medication') return '/medications';
  if (kind === 'practice') return '/routines';
  return '/(tabs)/check-in';
}

export async function listRecentActivities(userId: string, limit = 6): Promise<RecentActivity[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ActivityRow>(
    `SELECT * FROM (
      SELECT
        i.id AS id,
        'medication' AS kind,
        m.name AS title,
        CASE WHEN i.status = 'taken'
          THEN m.dosage_text
          ELSE 'Dose registrada como não tomada'
        END AS detail,
        COALESCE(i.occurred_at, i.updated_at) AS occurred_at,
        i.synced_at AS synced_at
      FROM medication_intakes i
      INNER JOIN medications m ON m.id = i.medication_id AND m.user_id = i.user_id
      WHERE i.user_id = ? AND i.deleted_at IS NULL AND m.deleted_at IS NULL

      UNION ALL

      SELECT
        c.id AS id,
        'practice' AS kind,
        p.title AS title,
        CASE WHEN c.status = 'completed'
          THEN CAST(p.target_minutes AS TEXT) || ' min concluídos'
          ELSE 'Prática registrada como não concluída'
        END AS detail,
        COALESCE(c.completed_at, c.updated_at) AS occurred_at,
        c.synced_at AS synced_at
      FROM care_practice_completions c
      INNER JOIN care_practices p ON p.id = c.practice_id AND p.user_id = c.user_id
      WHERE c.user_id = ? AND c.deleted_at IS NULL AND p.deleted_at IS NULL

      UNION ALL

      SELECT
        id,
        'check_in' AS kind,
        'Check-in emocional' AS title,
        mood AS detail,
        occurred_at,
        synced_at
      FROM mood_checkins
      WHERE user_id = ? AND deleted_at IS NULL
    ) activity
    ORDER BY occurred_at DESC
    LIMIT ?;`,
    userId,
    userId,
    userId,
    Math.max(1, limit),
  );

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    detail: row.kind === 'check_in' ? (moodLabels[row.detail] ?? 'Check-in registrado') : row.detail,
    occurredAt: row.occurred_at,
    synced: Boolean(row.synced_at),
    href: hrefFor(row.kind),
  }));
}
