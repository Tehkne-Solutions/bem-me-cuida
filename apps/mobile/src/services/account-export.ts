import type { Profile } from '@bemmecuida/domain';

import type { ConsentState } from '@/data/account-repository';
import { getDatabase } from '@/data/database';

const exportTables = [
  'mood_checkins',
  'medications',
  'medication_schedules',
  'medication_intakes',
  'care_practices',
  'care_practice_completions',
  'professionals',
  'appointments',
  'treatments',
  'journal_entries',
  'support_plans',
  'support_contacts',
] as const;

export type AccountExport = {
  exportVersion: '1.0';
  generatedAt: string;
  generatedBy: 'Tehkné Solutions';
  account: {
    id: string;
    email: string | null;
    profile: Profile | null;
    consents: ConsentState;
  };
  data: Record<string, Array<Record<string, unknown>>>;
  notice: string;
};

export async function buildAccountExport(input: {
  userId: string;
  email: string | null;
  profile: Profile | null;
  consents: ConsentState;
}): Promise<AccountExport> {
  const db = await getDatabase();
  const data: Record<string, Array<Record<string, unknown>>> = {};

  for (const table of exportTables) {
    data[table] = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE user_id = ? ORDER BY updated_at ASC;`,
      input.userId,
    );
  }

  return {
    exportVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'Tehkné Solutions',
    account: {
      id: input.userId,
      email: input.email,
      profile: input.profile,
      consents: input.consents,
    },
    data,
    notice: 'Exportação solicitada pelo titular. O arquivo pode conter dados emocionais e de saúde sensíveis.',
  };
}

export function formatAccountExport(value: AccountExport): string {
  return JSON.stringify(value, null, 2);
}
