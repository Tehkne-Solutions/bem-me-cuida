import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  journalEmotionValues,
  type JournalEmotion,
  type JournalEntry,
} from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScaleInput } from '@/components/ScaleInput';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { listRecentJournalEntries, saveJournalEntry } from '@/data/journal-repository';
import { journalEmotionLabels } from '@/services/insights';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function DiaryScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [emotions, setEmotions] = useState<JournalEmotion[]>([]);
  const [intensity, setIntensity] = useState(4);
  const [triggers, setTriggers] = useState('');
  const [strategies, setStrategies] = useState('');
  const [forTherapy, setForTherapy] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setEntries(await listRecentJournalEntries(session.user.id));
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load, sync.lastSuccessAt]));

  const canSave = useMemo(() => body.trim().length > 0 && emotions.length > 0 && !saving, [body, emotions, saving]);

  function toggleEmotion(emotion: JournalEmotion) {
    setEmotions((current) => current.includes(emotion)
      ? current.filter((item) => item !== emotion)
      : current.length < 6 ? [...current, emotion] : current);
  }

  async function save() {
    if (!session || !canSave) return;
    setSaving(true);
    try {
      await saveJournalEntry({
        title: title.trim() || null,
        body: body.trim(),
        emotions,
        intensity,
        triggers: splitList(triggers),
        strategies: splitList(strategies),
        forTherapy,
        linkedCheckInId: null,
      }, session.user.id);
      setTitle('');
      setBody('');
      setEmotions([]);
      setIntensity(4);
      setTriggers('');
      setStrategies('');
      setForTherapy(false);
      await load();
      void sync.syncNow();
      Alert.alert('Registro salvo', 'Seu diário foi guardado com segurança neste dispositivo.');
    } catch {
      Alert.alert('Não foi possível salvar', 'Revise o texto e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppText variant="caption" muted>DIÁRIO EMOCIONAL</AppText>
      <AppText variant="h1" style={styles.title}>Um espaço para colocar em palavras</AppText>
      <AppText muted style={styles.intro}>Registre o que aconteceu sem precisar transformar o momento em diagnóstico ou julgamento.</AppText>

      <Surface style={styles.form}>
        <TextField
          testID="journal-title"
          label="Título opcional"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          placeholder="Ex.: Depois da consulta"
        />
        <TextField
          testID="journal-body"
          label="O que você quer registrar?"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={5000}
          placeholder="Escreva no seu ritmo..."
          style={styles.bodyInput}
        />

        <View style={styles.group}>
          <AppText variant="bodyStrong">Emoções percebidas</AppText>
          <AppText variant="caption" muted>Escolha de uma a seis.</AppText>
          <View style={styles.chips}>
            {journalEmotionValues.map((emotion) => (
              <ChoiceChip
                key={emotion}
                label={journalEmotionLabels[emotion]}
                selected={emotions.includes(emotion)}
                onPress={() => toggleEmotion(emotion)}
              />
            ))}
          </View>
        </View>

        <ScaleInput
          testIDPrefix="journal-intensity"
          label="Intensidade percebida"
          value={intensity}
          onChange={setIntensity}
          lowLabel="Leve"
          highLabel="Muito intensa"
        />
        <TextField
          label="Possíveis gatilhos"
          value={triggers}
          onChangeText={setTriggers}
          maxLength={640}
          placeholder="Separe por vírgulas"
        />
        <TextField
          label="O que ajudou ou foi tentado"
          value={strategies}
          onChangeText={setStrategies}
          maxLength={640}
          placeholder="Ex.: respiração, caminhada, conversar"
        />
        <CheckboxRow
          checked={forTherapy}
          onChange={setForTherapy}
          label="Levar para uma conversa profissional"
          description="Marca o registro para ser encontrado com facilidade nos insights."
        />
        <PrimaryButton testID="journal-save" label="Salvar no diário" loading={saving} disabled={!canSave} onPress={() => void save()} />
      </Surface>

      <View style={styles.sectionHeader}>
        <AppText variant="h2">Registros recentes</AppText>
        <AppText variant="caption" muted>{entries.length} exibidos</AppText>
      </View>
      {entries.length ? entries.map((entry) => (
        <Surface key={entry.id} style={styles.entryCard}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{entry.title ?? 'Registro emocional'}</AppText>
              <AppText variant="caption" muted>{formatDate(entry.occurredAt)} · intensidade {entry.intensity}/10</AppText>
            </View>
            {entry.forTherapy ? <View style={styles.badge}><AppText variant="caption">Para conversar</AppText></View> : null}
          </View>
          <View style={styles.chips}>
            {entry.emotions.map((emotion) => <View key={emotion} style={styles.emotionTag}><AppText variant="caption">{journalEmotionLabels[emotion]}</AppText></View>)}
          </View>
          <AppText>{entry.body}</AppText>
          {entry.strategies.length ? <AppText variant="caption" muted>O que ajudou: {entry.strategies.join(', ')}</AppText> : null}
        </Surface>
      )) : <Surface><AppText muted>O primeiro registro aparecerá aqui.</AppText></Surface>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs, marginBottom: spacing.sm },
  intro: { marginBottom: spacing.xl },
  form: { gap: spacing.xl, marginBottom: spacing.xxl },
  bodyInput: { minHeight: 144, textAlignVertical: 'top' },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  entryCard: { gap: spacing.md, marginBottom: spacing.md },
  rowBetween: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', justifyContent: 'space-between' },
  flex: { flex: 1 },
  badge: { backgroundColor: colors.lavender, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  emotionTag: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
