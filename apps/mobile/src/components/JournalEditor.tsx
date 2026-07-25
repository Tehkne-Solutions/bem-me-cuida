import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CreateJournalEntryInput, MoodValue } from '@bemmecuida/domain';

import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { MoodSelector } from '@/components/MoodSelector';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScaleInput } from '@/components/ScaleInput';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  initial?: Partial<CreateJournalEntryInput>;
  submitLabel: string;
  saving?: boolean;
  onSubmit: (input: CreateJournalEntryInput) => Promise<void>;
  onArchive?: () => Promise<void>;
};

function parseTags(value: string): string[] {
  const unique = new Set(
    value.split(',').map((item) => item.trim().toLocaleLowerCase('pt-BR')).filter(Boolean),
  );
  return [...unique].slice(0, 12);
}

export function JournalEditor({ initial, submitLabel, saving = false, onSubmit, onArchive }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [mood, setMood] = useState<MoodValue>(initial?.mood ?? 'neutral');
  const [intensity, setIntensity] = useState(initial?.intensity ?? 5);
  const [includeIntensity, setIncludeIntensity] = useState(initial?.intensity !== null && initial?.intensity !== undefined);
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(', '));
  const [flagForTherapy, setFlagForTherapy] = useState(initial?.flagForTherapy ?? false);
  const [error, setError] = useState<string | null>(null);
  const tags = useMemo(() => parseTags(tagsText), [tagsText]);

  async function submit() {
    const normalizedBody = body.trim();
    if (!normalizedBody) {
      setError('Escreva ao menos uma palavra antes de salvar.');
      return;
    }
    setError(null);
    await onSubmit({
      occurredAt: initial?.occurredAt ?? new Date().toISOString(),
      title: title.trim() || null,
      body: normalizedBody,
      mood,
      intensity: includeIntensity ? intensity : null,
      tags,
      flagForTherapy,
    });
  }

  return (
    <View style={styles.wrapper}>
      <Surface style={styles.section}>
        <AppText variant="h2">Como este momento se apresenta?</AppText>
        <MoodSelector value={mood} onChange={setMood} testIDPrefix="journal-mood" />
        <CheckboxRow
          checked={includeIntensity}
          onChange={setIncludeIntensity}
          label="Registrar intensidade"
          description="Opcional. Ajuda a comparar seus próprios registros ao longo do tempo."
        />
        {includeIntensity ? <ScaleInput label="Intensidade do momento" value={intensity} onChange={setIntensity} lowLabel="Leve" highLabel="Muito intensa" /> : null}
      </Surface>

      <Surface style={styles.section}>
        <TextField label="Título (opcional)" value={title} onChangeText={setTitle} maxLength={120} placeholder="Ex.: Depois da consulta" />
        <TextField
          testID="journal-body"
          label="O que aconteceu?"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={10_000}
          style={styles.body}
          placeholder="Escreva no seu ritmo. Este texto não será interpretado como diagnóstico."
        />
        <TextField
          label="Marcadores (opcional)"
          value={tagsText}
          onChangeText={setTagsText}
          maxLength={300}
          placeholder="sono, trabalho, terapia"
          hint={`${tags.length}/12 marcadores · separe por vírgulas`}
        />
        <CheckboxRow
          checked={flagForTherapy}
          onChange={setFlagForTherapy}
          label="Separar para conversar em terapia"
          description="Apenas organiza seus registros. O conteúdo não é enviado ao profissional."
        />
      </Surface>

      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <PrimaryButton testID="journal-save" label={submitLabel} loading={saving} onPress={() => void submit()} />
      {onArchive ? <SecondaryButton label="Arquivar sem apagar" onPress={() => void onArchive()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md, paddingBottom: spacing.xxl },
  section: { gap: spacing.lg },
  body: { minHeight: 180, textAlignVertical: 'top' },
  error: { color: colors.danger },
});
