import type { CheckIn, JournalEntry, MedicationIntake, CarePracticeCompletion, MoodValue } from '@bemmecuida/domain';

export type InsightPeriod = 'day' | 'week';

export type PersonalSummary = {
  period: InsightPeriod;
  from: string;
  to: string;
  journalCount: number;
  checkInCount: number;
  dominantMood: MoodValue | null;
  averageIntensity: number | null;
  topTags: Array<{ tag: string; count: number }>;
  therapyFlagCount: number;
  medicationRecorded: number;
  practicesRecorded: number;
  observations: string[];
};

const moodOrder: MoodValue[] = ['very_low', 'low', 'neutral', 'good', 'very_good'];

export const moodSummaryLabel: Record<MoodValue, string> = {
  very_low: 'muito difícil',
  low: 'difícil',
  neutral: 'neutro',
  good: 'bem',
  very_good: 'muito bem',
};

function dominantMood(entries: JournalEntry[], checkIns: CheckIn[]): MoodValue | null {
  const counts = new Map<MoodValue, number>();
  for (const mood of [...entries.map((entry) => entry.mood), ...checkIns.map((item) => item.mood)]) {
    counts.set(mood, (counts.get(mood) ?? 0) + 1);
  }
  return moodOrder.reduce<MoodValue | null>((best, mood) => {
    if ((counts.get(mood) ?? 0) > (best ? counts.get(best) ?? 0 : 0)) return mood;
    return best;
  }, null);
}

export function buildPersonalSummary(input: {
  period: InsightPeriod;
  from: string;
  to: string;
  journalEntries: JournalEntry[];
  checkIns: CheckIn[];
  medicationIntakes: MedicationIntake[];
  practiceCompletions: CarePracticeCompletion[];
}): PersonalSummary {
  const intensities = input.journalEntries
    .map((entry) => entry.intensity)
    .filter((value): value is number => value !== null);
  const tagCounts = new Map<string, number>();
  for (const entry of input.journalEntries) {
    for (const tag of entry.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'pt-BR'))
    .slice(0, 5);
  const mood = dominantMood(input.journalEntries, input.checkIns);
  const observations: string[] = [];
  if (!input.journalEntries.length && !input.checkIns.length) {
    observations.push('Ainda não há registros emocionais suficientes neste período.');
  } else {
    observations.push(`Você fez ${input.journalEntries.length} registro${input.journalEntries.length === 1 ? '' : 's'} no diário e ${input.checkIns.length} check-in${input.checkIns.length === 1 ? '' : 's'}.`);
    if (mood) observations.push(`O estado mais frequente nos seus registros foi “${moodSummaryLabel[mood]}”.`);
    if (topTags.length) observations.push(`Os marcadores mais usados foram ${topTags.map((item) => item.tag).join(', ')}.`);
  }
  const therapyFlagCount = input.journalEntries.filter((entry) => entry.flagForTherapy).length;
  if (therapyFlagCount) observations.push(`${therapyFlagCount} registro${therapyFlagCount === 1 ? ' foi separado' : 's foram separados'} para conversar em terapia.`);
  observations.push('Esses dados descrevem apenas o que você registrou e não representam diagnóstico ou relação de causa.');

  return {
    period: input.period,
    from: input.from,
    to: input.to,
    journalCount: input.journalEntries.length,
    checkInCount: input.checkIns.length,
    dominantMood: mood,
    averageIntensity: intensities.length ? Math.round((intensities.reduce((sum, value) => sum + value, 0) / intensities.length) * 10) / 10 : null,
    topTags,
    therapyFlagCount,
    medicationRecorded: input.medicationIntakes.length,
    practicesRecorded: input.practiceCompletions.length,
    observations,
  };
}

export function formatPersonalSummary(summary: PersonalSummary): string {
  const heading = summary.period === 'day' ? 'Resumo do dia' : 'Resumo da semana';
  return [
    `BemMeCuida — ${heading}`,
    ...summary.observations.map((item) => `• ${item}`),
    `• Cuidados registrados: ${summary.medicationRecorded} medicamentos e ${summary.practicesRecorded} práticas.`,
    '',
    'Resumo gerado apenas a partir dos registros do usuário. Não é diagnóstico.',
    'Tehkné Solutions',
  ].join('\n');
}
