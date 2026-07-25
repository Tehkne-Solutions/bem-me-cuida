import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { CreateJournalEntryInput } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { BackHeader } from '@/components/BackHeader';
import { JournalEditor } from '@/components/JournalEditor';
import { Screen } from '@/components/Screen';
import { createJournalEntry } from '@/data/journal-repository';
import { evaluateSupportLanguage } from '@/services/support-language';
import { useSync } from '@/sync/SyncProvider';

export default function NewJournalEntryScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [saving, setSaving] = useState(false);

  async function save(input: CreateJournalEntryInput) {
    if (!session) return;
    setSaving(true);
    try {
      await createJournalEntry(input, session.user.id);
      void sync.syncNow();
      const signal = evaluateSupportLanguage(`${input.title ?? ''}\n${input.body}`);
      if (signal.level === 'none') {
        router.back();
        return;
      }
      Alert.alert(
        signal.level === 'urgent' ? 'Você não precisa atravessar isso sozinho' : 'Talvez seja hora de buscar apoio',
        `${signal.message ?? ''}\n\nSeu texto foi salvo neste aparelho.`,
        [
          { text: 'Voltar ao diário', onPress: () => router.back() },
          { text: 'Abrir opções de apoio', onPress: () => router.replace('/crisis') },
        ],
      );
    } catch {
      Alert.alert('Não foi possível salvar', 'Seu texto não foi alterado. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <BackHeader eyebrow="NOVO REGISTRO" title="Escrever no diário" titleTestID="new-journal-title" />
      <JournalEditor submitLabel="Salvar no diário" saving={saving} onSubmit={save} />
    </Screen>
  );
}
