import type { CheckIn, JournalEmotion, JournalEntry, MoodValue } from '@bemmecuida/domain';

export const journalEmotionLabels: Record<JournalEmotion, string> = {
  sadness: 'Tristeza',
  anxiety: 'Ansiedade',
  anger: 'Raiva',
  joy: 'Alegria',
  calm: 'Calma',
  fear: 'Medo',
  shame: 'Vergonha',
  guilt: 'Culpa',
  hope: 'Esperança',
  gratitude: 'Gratidão',
  confusion: 'Confusão',
};

export const moodLabels: Record<MoodValue, string> = {
  very_low: 'Muito baixo',
  low: 'Baixo',
  neutral: 'Neutro',
  good: 'Bem',
  very_good: 'Muito bem',
};

export type WeeklyInsightSummary = {
  checkInCount: number;
  journalCount: number;
  averages: {
    anxiety: number | null;
    energy: number | null;
    concentration: number | null;
    sleepHours: number | null;
  };
  dominantMood: MoodValue | null;
  topEmotions: Array<{ emotion: JournalEmotion; count: number }>;
  therapyNotes: number;
  prompts: string[];
};

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function dominantMood(checkIns: CheckIn[]): MoodValue | null {
  const counts = new Map<MoodValue, number>();
  for (const item of checkIns) counts.set(item.mood, (counts.get(item.mood) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function topEmotions(entries: JournalEntry[]): Array<{ emotion: JournalEmotion; count: number }> {
  const counts = new Map<JournalEmotion, number>();
  for (const entry of entries) {
    for (const emotion of entry.emotions) counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || journalEmotionLabels[a[0]].localeCompare(journalEmotionLabels[b[0]], 'pt-BR'))
    .slice(0, 4)
    .map(([emotion, count]) => ({ emotion, count }));
}

export function buildWeeklyInsightSummary(checkIns: CheckIn[], entries: JournalEntry[]): WeeklyInsightSummary {
  const sleepHours = checkIns
    .map((item) => item.sleepMinutes)
    .filter((value): value is number => value !== null)
    .map((minutes) => minutes / 60);
  const emotions = topEmotions(entries);
  const mood = dominantMood(checkIns);
  const prompts: string[] = [];

  if (emotions[0]) prompts.push(`Em quais situações ${journalEmotionLabels[emotions[0].emotion].toLowerCase()} apareceu com mais frequência?`);
  if (checkIns.length >= 2) prompts.push('O que estava diferente nos dias com mais energia ou menos ansiedade?');
  if (entries.some((entry) => entry.strategies.length > 0)) prompts.push('Quais estratégias ajudaram, mesmo que só um pouco?');
  if (entries.some((entry) => entry.forTherapy)) prompts.push('Quais registros marcados merecem ser levados para a próxima conversa profissional?');
  if (!prompts.length) prompts.push('O que você gostaria de observar com mais atenção nos próximos dias?');

  return {
    checkInCount: checkIns.length,
    journalCount: entries.length,
    averages: {
      anxiety: average(checkIns.map((item) => item.anxiety)),
      energy: average(checkIns.map((item) => item.energy)),
      concentration: average(checkIns.map((item) => item.concentration)),
      sleepHours: average(sleepHours),
    },
    dominantMood: mood,
    topEmotions: emotions,
    therapyNotes: entries.filter((entry) => entry.forTherapy).length,
    prompts: prompts.slice(0, 3),
  };
}
