import type {
  Appointment,
  CarePractice,
  CarePracticeCompletion,
  CheckIn,
  JournalEmotion,
  JournalEntry,
  Medication,
  MedicationIntake,
  MoodValue,
  Treatment,
} from '@bemmecuida/domain';

import { journalEmotionLabels, moodLabels } from '@/services/insights';

export type ReportPeriodDays = 1 | 7 | 30 | 90;

export type ReportPrivacyOptions = {
  includeMoodAndSymptoms: boolean;
  includeSleep: boolean;
  includeJournalThemes: boolean;
  includeCareAdherence: boolean;
  includeMedicationNames: boolean;
  includeTreatmentNames: boolean;
};

export type LongitudinalReport = {
  generatedAt: string;
  from: string;
  to: string;
  periodDays: ReportPeriodDays;
  checkIns: {
    count: number;
    dominantMood: MoodValue | null;
    averageAnxiety: number | null;
    averageEnergy: number | null;
    averageConcentration: number | null;
    averageIrritability: number | null;
    averageAgitation: number | null;
    averageImpulsivity: number | null;
    averageCraving: number | null;
    averageSleepHours: number | null;
  };
  journal: {
    count: number;
    therapyNotes: number;
    topEmotions: Array<{ emotion: JournalEmotion; count: number }>;
    topTriggers: Array<{ label: string; count: number }>;
    topStrategies: Array<{ label: string; count: number }>;
  };
  medication: {
    recorded: number;
    taken: number;
    skipped: number;
    adherencePercent: number | null;
    active: Array<{ name: string; dosageText: string }>;
  };
  practices: {
    recorded: number;
    completed: number;
    skipped: number;
    completionPercent: number | null;
    activeTitles: string[];
  };
  appointments: {
    completed: number;
    scheduled: number;
    cancelled: number;
  };
  treatments: Array<{ name: string; status: Treatment['status'] }>;
  dataCoverage: {
    daysWithCheckIn: number;
    daysWithJournal: number;
  };
};

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function percent(part: number, total: number): number | null {
  return total ? Math.round((part / total) * 100) : null;
}

function countTop<T extends string>(values: T[], limit = 5): Array<{ label: T; count: number }> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function dominantMood(checkIns: CheckIn[]): MoodValue | null {
  const counts = new Map<MoodValue, number>();
  for (const item of checkIns) counts.set(item.mood, (counts.get(item.mood) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function distinctDays(values: string[]): number {
  return new Set(values.map((value) => value.slice(0, 10))).size;
}

export function buildLongitudinalReport(input: {
  periodDays: ReportPeriodDays;
  from: string;
  to: string;
  checkIns: CheckIn[];
  journalEntries: JournalEntry[];
  medicationIntakes: MedicationIntake[];
  medications: Medication[];
  practiceCompletions: CarePracticeCompletion[];
  practices: CarePractice[];
  appointments: Appointment[];
  treatments: Treatment[];
}): LongitudinalReport {
  const taken = input.medicationIntakes.filter((item) => item.status === 'taken').length;
  const completed = input.practiceCompletions.filter((item) => item.status === 'completed').length;
  const emotionCounts = countTop(input.journalEntries.flatMap((entry) => entry.emotions));

  return {
    generatedAt: new Date().toISOString(),
    from: input.from,
    to: input.to,
    periodDays: input.periodDays,
    checkIns: {
      count: input.checkIns.length,
      dominantMood: dominantMood(input.checkIns),
      averageAnxiety: average(input.checkIns.map((item) => item.anxiety)),
      averageEnergy: average(input.checkIns.map((item) => item.energy)),
      averageConcentration: average(input.checkIns.map((item) => item.concentration)),
      averageIrritability: average(input.checkIns.map((item) => item.irritability)),
      averageAgitation: average(input.checkIns.map((item) => item.agitation)),
      averageImpulsivity: average(input.checkIns.map((item) => item.impulsivity)),
      averageCraving: average(input.checkIns.map((item) => item.craving)),
      averageSleepHours: average(input.checkIns.flatMap((item) => item.sleepMinutes === null ? [] : [item.sleepMinutes / 60])),
    },
    journal: {
      count: input.journalEntries.length,
      therapyNotes: input.journalEntries.filter((entry) => entry.forTherapy).length,
      topEmotions: emotionCounts.map(({ label, count }) => ({ emotion: label, count })),
      topTriggers: countTop(input.journalEntries.flatMap((entry) => entry.triggers)),
      topStrategies: countTop(input.journalEntries.flatMap((entry) => entry.strategies)),
    },
    medication: {
      recorded: input.medicationIntakes.length,
      taken,
      skipped: input.medicationIntakes.length - taken,
      adherencePercent: percent(taken, input.medicationIntakes.length),
      active: input.medications.filter((item) => item.active).map((item) => ({ name: item.name, dosageText: item.dosageText })),
    },
    practices: {
      recorded: input.practiceCompletions.length,
      completed,
      skipped: input.practiceCompletions.length - completed,
      completionPercent: percent(completed, input.practiceCompletions.length),
      activeTitles: input.practices.filter((item) => item.active).map((item) => item.title),
    },
    appointments: {
      completed: input.appointments.filter((item) => item.status === 'completed').length,
      scheduled: input.appointments.filter((item) => item.status === 'scheduled').length,
      cancelled: input.appointments.filter((item) => item.status === 'cancelled').length,
    },
    treatments: input.treatments.map((item) => ({ name: item.name, status: item.status })),
    dataCoverage: {
      daysWithCheckIn: distinctDays(input.checkIns.map((item) => item.occurredAt)),
      daysWithJournal: distinctDays(input.journalEntries.map((item) => item.occurredAt)),
    },
  };
}

function formatValue(value: number | null, suffix = ''): string {
  return value === null ? 'sem dados' : `${value}${suffix}`;
}

function periodLabel(days: ReportPeriodDays): string {
  if (days === 1) return 'Hoje';
  return `Últimos ${days} dias`;
}

export function formatLongitudinalReport(report: LongitudinalReport, options: ReportPrivacyOptions): string {
  const lines = [
    'BemMeCuida — Relatório de acompanhamento',
    `Período: ${periodLabel(report.periodDays)}`,
    `Gerado em: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.generatedAt))}`,
    '',
    `Cobertura: ${report.dataCoverage.daysWithCheckIn} dia(s) com check-in e ${report.dataCoverage.daysWithJournal} dia(s) com diário.`,
  ];

  if (options.includeMoodAndSymptoms) {
    lines.push('', 'HUMOR E INDICADORES REGISTRADOS');
    lines.push(`Check-ins: ${report.checkIns.count}`);
    lines.push(`Humor mais registrado: ${report.checkIns.dominantMood ? moodLabels[report.checkIns.dominantMood] : 'sem dados'}`);
    lines.push(`Ansiedade média: ${formatValue(report.checkIns.averageAnxiety, '/10')}`);
    lines.push(`Energia média: ${formatValue(report.checkIns.averageEnergy, '/10')}`);
    lines.push(`Concentração média: ${formatValue(report.checkIns.averageConcentration, '/10')}`);
    lines.push(`Irritabilidade média: ${formatValue(report.checkIns.averageIrritability, '/10')}`);
    lines.push(`Agitação média: ${formatValue(report.checkIns.averageAgitation, '/10')}`);
    lines.push(`Impulsividade média: ${formatValue(report.checkIns.averageImpulsivity, '/10')}`);
    lines.push(`Vontade de usar substâncias: ${formatValue(report.checkIns.averageCraving, '/10')}`);
  }

  if (options.includeSleep) {
    lines.push('', 'SONO');
    lines.push(`Média registrada: ${formatValue(report.checkIns.averageSleepHours, ' h')}`);
  }

  if (options.includeJournalThemes) {
    lines.push('', 'DIÁRIO — SOMENTE TEMAS, SEM TEXTOS');
    lines.push(`Entradas: ${report.journal.count}`);
    lines.push(`Marcadas para conversa profissional: ${report.journal.therapyNotes}`);
    lines.push(`Emoções recorrentes: ${report.journal.topEmotions.length ? report.journal.topEmotions.map((item) => `${journalEmotionLabels[item.emotion]} (${item.count})`).join(', ') : 'sem dados'}`);
    lines.push(`Possíveis gatilhos registrados: ${report.journal.topTriggers.length ? report.journal.topTriggers.map((item) => `${item.label} (${item.count})`).join(', ') : 'sem dados'}`);
    lines.push(`Estratégias registradas: ${report.journal.topStrategies.length ? report.journal.topStrategies.map((item) => `${item.label} (${item.count})`).join(', ') : 'sem dados'}`);
  }

  if (options.includeCareAdherence) {
    lines.push('', 'ROTINA DE CUIDADO');
    lines.push(`Medicamentos registrados: ${report.medication.recorded} · tomados ${report.medication.taken} · não tomados ${report.medication.skipped}`);
    lines.push(`Adesão registrada: ${formatValue(report.medication.adherencePercent, '%')}`);
    lines.push(`Práticas registradas: ${report.practices.recorded} · concluídas ${report.practices.completed} · não realizadas ${report.practices.skipped}`);
    lines.push(`Conclusão de práticas: ${formatValue(report.practices.completionPercent, '%')}`);
  }

  if (options.includeMedicationNames) {
    lines.push('', 'MEDICAMENTOS ATIVOS — INCLUSÃO AUTORIZADA PELO USUÁRIO');
    lines.push(...(report.medication.active.length ? report.medication.active.map((item) => `• ${item.name} — ${item.dosageText}`) : ['Nenhum medicamento ativo registrado.']));
  }

  if (options.includeTreatmentNames) {
    lines.push('', 'TRATAMENTOS E ACOMPANHAMENTO — INCLUSÃO AUTORIZADA PELO USUÁRIO');
    lines.push(...(report.treatments.length ? report.treatments.map((item) => `• ${item.name} — ${item.status}`) : ['Nenhum tratamento registrado.']));
    lines.push(`Consultas no período: ${report.appointments.completed} concluídas, ${report.appointments.scheduled} agendadas e ${report.appointments.cancelled} canceladas.`);
  }

  lines.push('', 'Este relatório descreve apenas registros inseridos pelo usuário. Não é diagnóstico, prescrição ou avaliação clínica.', 'Tehkné Solutions');
  return lines.join('\n');
}
