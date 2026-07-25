import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { createTreatmentInputSchema, treatmentTypeValues, type CreateTreatmentInput, type TreatmentType } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { saveTreatment } from '@/data/treatment-repository';
import { formatLocalDate } from '@/services/care-time';
import { useSync } from '@/sync/SyncProvider';
import { spacing } from '@/theme/tokens';

const labels: Record<TreatmentType, string> = { therapy: 'Terapia', medical: 'Médico', group: 'Grupo', rehabilitation: 'Reabilitação', other: 'Outro' };

export default function NewTreatmentScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [form, setForm] = useState<CreateTreatmentInput>({ name: '', type: 'therapy', provider: null, startedAt: formatLocalDate(), endedAt: null, notes: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function update<K extends keyof CreateTreatmentInput>(key: K, value: CreateTreatmentInput[K]) { setForm((current) => ({ ...current, [key]: value })); }
  async function save() {
    if (!session) return;
    const parsed = createTreatmentInputSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Revise os dados.'); return; }
    setSaving(true); setError(null);
    try { await saveTreatment(parsed.data, session.user.id); void sync.syncNow(); Alert.alert('Tratamento cadastrado', 'O registro foi adicionado sem avaliação clínica.', [{ text: 'Concluir', onPress: () => router.back() }]); }
    catch { Alert.alert('Não foi possível salvar', 'Tente novamente.'); }
    finally { setSaving(false); }
  }
  return (
    <Screen>
      <BackHeader eyebrow="NOVO TRATAMENTO" title="Organizar o acompanhamento atual" />
      <Surface style={styles.section}>
        <TextField testID="treatment-name" label="Nome" value={form.name} onChangeText={(value) => update('name', value)} maxLength={120} />
        <AppText variant="bodyStrong">Tipo</AppText>
        <View style={styles.chips}>{treatmentTypeValues.map((type) => <ChoiceChip key={type} label={labels[type]} selected={form.type === type} onPress={() => update('type', type)} />)}</View>
        <TextField label="Profissional ou serviço" value={form.provider ?? ''} onChangeText={(value) => update('provider', value.trim() ? value : null)} placeholder="Opcional" />
        <TextField label="Início" value={form.startedAt} onChangeText={(value) => update('startedAt', value)} placeholder="AAAA-MM-DD" />
        <TextField label="Fim" value={form.endedAt ?? ''} onChangeText={(value) => update('endedAt', value.trim() ? value : null)} placeholder="Opcional" />
        <TextField label="Observações" value={form.notes ?? ''} onChangeText={(value) => update('notes', value.trim() ? value : null)} multiline maxLength={500} />
      </Surface>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <PrimaryButton testID="treatment-save" label="Salvar tratamento" loading={saving} onPress={() => void save()} />
    </Screen>
  );
}
const styles = StyleSheet.create({ section: { gap: spacing.lg, marginBottom: spacing.md }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, error: { color: '#9F3F3F', textAlign: 'center', marginBottom: spacing.md } });
