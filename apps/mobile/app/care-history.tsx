import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CarePractice, Medication } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { listCarePractices, listRecentCarePracticeCompletions } from '@/data/care-practice-repository';
import { listMedications, listRecentMedicationIntakes } from '@/data/medication-repository';
import { careCategoryEmoji, medicationIntakeLabel, practiceCompletionLabel } from '@/services/care-labels';
import { colors, radius, spacing } from '@/theme/tokens';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

type HistoryItem = {
  id: string;
  occurredAt: string;
  icon: string;
  title: string;
  subtitle: string;
  positive: boolean;
};

export default function CareHistoryScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);

  const load = useCallback(async () => {
    if (!session) return;
    const [medications, intakes, practices, completions] = await Promise.all([
      listMedications(session.user.id),
      listRecentMedicationIntakes(session.user.id, 40),
      listCarePractices(session.user.id),
      listRecentCarePracticeCompletions(session.user.id, 40),
    ]);
    const medicationMap = new Map<string, Medication>(
      medications.map((item): [string, Medication] => [item.id, item]),
    );
    const practiceMap = new Map<string, CarePractice>(
      practices.map((item): [string, CarePractice] => [item.id, item]),
    );
    const history: HistoryItem[] = [
      ...intakes.map((item) => ({
        id: `med-${item.id}`,
        occurredAt: item.occurredAt ?? item.plannedAt,
        icon: '💊',
        title: medicationMap.get(item.medicationId)?.name ?? 'Medicamento',
        subtitle: medicationIntakeLabel[item.status] ?? 'Registrado',
        positive: item.status === 'taken',
      })),
      ...completions.map((item) => {
        const practice = practiceMap.get(item.practiceId);
        return {
          id: `practice-${item.id}`,
          occurredAt: item.completedAt ?? item.plannedAt,
          icon: practice ? (careCategoryEmoji[practice.category] ?? '🌿') : '🌿',
          title: practice?.title ?? 'Prática de cuidado',
          subtitle: practiceCompletionLabel[item.status] ?? 'Registrado',
          positive: item.status === 'completed',
        };
      }),
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    setItems(history);
  }, [session]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const groups = useMemo(() => {
    const result = new Map<string, HistoryItem[]>();
    for (const item of items) {
      const key = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(item.occurredAt));
      result.set(key, [...(result.get(key) ?? []), item]);
    }
    return [...result.entries()];
  }, [items]);

  return (
    <Screen>
      <BackHeader eyebrow="HISTÓRICO DE CUIDADO" title="O que aconteceu, sem julgamentos" />
      {groups.length ? groups.map(([date, dateItems]) => (
        <View key={date} style={styles.group}>
          <AppText variant="h2" style={styles.date}>{date}</AppText>
          <Surface style={styles.list}>
            {dateItems.map((item, index) => (
              <View key={item.id} style={[styles.row, index > 0 && styles.divider]}>
                <View style={styles.icon}><AppText>{item.icon}</AppText></View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{item.title}</AppText>
                  <AppText variant="caption" muted>{formatDate(item.occurredAt)}</AppText>
                </View>
                <View style={[styles.badge, item.positive ? styles.good : styles.neutral]}>
                  <AppText variant="caption" style={item.positive ? styles.goodText : styles.neutralText}>{item.subtitle}</AppText>
                </View>
              </View>
            ))}
          </Surface>
        </View>
      )) : (
        <Surface><AppText muted>Seu histórico aparecerá quando você registrar medicamentos ou práticas.</AppText></Surface>
      )}
      <AppText variant="caption" muted style={styles.footer}>Este histórico descreve registros feitos por você. Ele não avalia eficácia ou segurança do tratamento.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.xl },
  date: { marginBottom: spacing.md, textTransform: 'capitalize' },
  list: { paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  good: { backgroundColor: colors.primarySoft },
  neutral: { backgroundColor: colors.sand },
  goodText: { color: colors.primaryStrong },
  neutralText: { color: colors.textMuted },
  footer: { textAlign: 'center', marginBottom: spacing.xl },
});
