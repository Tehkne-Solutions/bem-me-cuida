import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import type { CreateJournalEntryInput, JournalEntry } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { JournalEditor } from '@/components/JournalEditor';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { archiveJournalEntry, getJournalEntry, updateJournalEntry } from '@/data/journal-repository';
import { evaluateSupportLanguage } from '@/services/support-language';
import { useSync } from '@/sync/SyncProvider';

export default function EditJournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const sync = useSync();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session || !id) return;
    void getJournalEntry(session.user.id, id).then(setEntry).finally(() => setLoading(false));
  }, [id, session]);

  const initial = useMemo<Partial<CreateJournalEntryInput> | undefined>(() => entry ? ({
    occurredAt: entry.occurredAt,
    title: entry.title,
    body: entry.body,
    mood: entry.mood,
    intensity: entry.intensity,
    tags: entry.tags,
    flagForTherapy: entry.flagForTherapy,
  }) : undefined, [entry]);

  async function save(input: CreateJournalEntryInput) {
    if (!session || !entry) return;
    setSaving(true);
    try {
      await updateJournalEntry({ ...input, id: entry.id, archived: entry.archived }, session.user.id);
      void sync.syncNow();
      const signal = evaluateSupportLanguage(`${input.title ?? ''}\n${input.body}`);
      if (signal.level !== 'none') {
        Alert.alert('Seu registro foi salvo', signal.message ?? '', [
          { text: 'Concluir', onPress: () => router.back() },
          { text: 'Ver opções de apoio', onPress: () => router.replace('/crisis') },
        ]);
      } else {
        router.back();
      }
    } catch {
      Alert.alert('Não foi possível atualizar', 'O registro anterior foi preservado.');
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!session || !entry) return;
    Alert.alert('Arquivar registro?', 'O texto continuará disponível quando você incluir itens arquivados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Arquivar', onPress: () => void archiveJournalEntry(session.user.id, entry.id, true).then(() => { void sync.syncNow(); router.back(); }) },
    ]);
  }

  return (
    <Screen>
      <BackHeader eyebrow="EDITAR REGISTRO" title={entry?.title ?? 'Diário emocional'} />
      {loading ? <Surface><AppText muted>Carregando registro…</AppText></Surface> : entry && initial ? (
        <JournalEditor initial={initial} submitLabel="Salvar alterações" saving={saving} onSubmit={save} onArchive={entry.archived ? undefined : archive} />
      ) : <Surface><AppText muted>Registro não encontrado neste aparelho.</AppText></Surface>}
    </Screen>
  );
}
