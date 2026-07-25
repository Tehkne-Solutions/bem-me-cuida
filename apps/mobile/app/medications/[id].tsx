import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import type { CreateMedicationInput, MedicationSchedule } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { deactivateMedication, getMedication, updateMedication } from '@/data/medication-repository';
import { MedicationEditor } from '@/features/care/MedicationEditor';
import { cancelEntityReminders, scheduleEntityReminders } from '@/services/reminders';
import { useSync } from '@/sync/SyncProvider';
import { spacing } from '@/theme/tokens';

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const sync = useSync();
  const [initial, setInitial] = useState<CreateMedicationInput | null>(null);
  const [oldSchedules, setOldSchedules] = useState<MedicationSchedule[]>([]);

  useEffect(() => {
    if (!session || !id) return;
    void getMedication(session.user.id, id).then((item) => {
      if (!item) return;
      setOldSchedules(item.schedules);
      setInitial({
        name: item.name, dosageText: item.dosageText, instructions: item.instructions,
        prescriber: item.prescriber, startDate: item.startDate, endDate: item.endDate,
        stockQuantity: item.stockQuantity, lowStockThreshold: item.lowStockThreshold,
        unitsPerDose: item.unitsPerDose, stockReminderEnabled: item.stockReminderEnabled,
        schedules: item.schedules.map((schedule) => ({ id: schedule.id, timeLocal: schedule.timeLocal, weekdaysMask: schedule.weekdaysMask, reminderEnabled: schedule.reminderEnabled })),
      });
    });
  }, [id, session]);

  async function save(value: CreateMedicationInput) {
    if (!session || !id) return;
    try {
      for (const schedule of oldSchedules) await cancelEntityReminders(session.user.id, 'medication_schedule', schedule.id);
      const medication = await updateMedication(id, value, session.user.id);
      for (const schedule of medication.schedules) {
        if (!schedule.reminderEnabled) continue;
        try { await scheduleEntityReminders({ userId: session.user.id, entityType: 'medication_schedule', entityId: schedule.id, timeLocal: schedule.timeLocal, weekdaysMask: schedule.weekdaysMask }); } catch { /* reconciliação posterior */ }
      }
      void sync.syncNow();
      Alert.alert('Alterações salvas', 'Os registros anteriores foram preservados.', [{ text: 'Concluir', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Não foi possível atualizar', 'Nenhuma alteração parcial foi mantida.');
    }
  }

  function confirmDeactivate() {
    if (!session || !id) return;
    Alert.alert('Desativar medicamento?', 'O histórico será preservado e novos horários deixarão de aparecer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desativar', style: 'destructive', onPress: () => void (async () => {
        for (const schedule of oldSchedules) await cancelEntityReminders(session.user.id, 'medication_schedule', schedule.id);
        await deactivateMedication(session.user.id, id);
        void sync.syncNow();
        router.back();
      })() },
    ]);
  }

  return (
    <Screen>
      <BackHeader eyebrow="EDITAR MEDICAMENTO" title="Atualizar sem apagar o histórico" />
      {initial ? <MedicationEditor initialValue={initial} submitLabel="Salvar alterações" testID="medication-update" onSubmit={save} /> : <Surface><AppText muted>Carregando cuidado…</AppText></Surface>}
      <Surface style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <AppText variant="bodyStrong">Encerrar este registro</AppText>
        <AppText variant="caption" muted>Desativar não apaga tomadas anteriores.</AppText>
        <PrimaryButton tone="danger" label="Desativar medicamento" onPress={confirmDeactivate} />
      </Surface>
    </Screen>
  );
}
