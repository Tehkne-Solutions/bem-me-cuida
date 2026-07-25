import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { JournalEntry, MoodValue } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { listJournalEntries } from '@/data/journal-repository';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const moodEmoji: Record<MoodValue, string> = {
  very_low: '😣', low: '😟', neutral: '😐', good: '🙂', very_good: '😊',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function DiaryScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState('');
  const [therapyOnly, setTherapyOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setEntries(await listJournalEntries(session.user.id, { search, therapyOnly, includeArchived, limit: 150 }));
  }, [includeArchived, search, session, therapyOnly]);

  useFocusEffect(useCallback(() => { void load(); }, [load, sync.lastSuccessAt]));

  return (
    <Screen>
      <AppText variant="caption" muted>DIÁRIO EMOCIONAL</AppText>
      <AppText variant="h1" style={styles.title}>Um espaço para colocar em palavras</AppText>
      <Surface style={styles.notice}>
        <AppText variant="bodyStrong">Seu texto, no seu ritmo</AppText>
        <AppText variant="caption" muted>O diário não diagnostica nem envia conteúdo a profissionais. A sincronização respeita sua conta e o banco local é criptografado.</AppText>
      </Surface>

      <Link href="/journal/new" asChild>
        <Pressable testID="journal-add" accessibilityRole="button" style={styles.addButton}>
          <AppText variant="bodyStrong" style={styles.addText}>+ Escrever um novo registro</AppText>
        </Pressable>
      </Link>

      <TextField label="Buscar no diário" value={search} onChangeText={setSearch} onSubmitEditing={() => void load()} placeholder="Título, texto ou marcador" returnKeyType="search" />
      <View style={styles.filters}>
        <CheckboxRow checked={therapyOnly} onChange={setTherapyOnly} label="Separados para terapia" />
        <CheckboxRow checked={includeArchived} onChange={setIncludeArchived} label="Incluir arquivados" />
      </View>

      <View style={styles.headingRow}>
        <AppText variant="h2">Seus registros</AppText>
        <Pressable onPress={() => void load()}><AppText variant="caption" style={styles.link}>Atualizar</AppText></Pressable>
      </View>

      {entries.length ? entries.map((entry) => (
        <Pressable key={entry.id} onPress={() => router.push(`/journal/${entry.id}`)}>
          <Surface style={[styles.card, entry.archived && styles.archived]}>
            <View style={styles.rowBetween}>
              <AppText style={styles.emoji}>{moodEmoji[entry.mood]}</AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>{entry.title ?? 'Registro sem título'}</AppText>
                <AppText variant="caption" muted>{formatDate(entry.occurredAt)}{entry.intensity !== null ? ` · intensidade ${entry.intensity}/10` : ''}</AppText>
              </View>
              <AppText style={styles.arrow}>›</AppText>
            </View>
            <AppText numberOfLines={3}>{entry.body}</AppText>
            <View style={styles.tags}>
              {entry.flagForTherapy ? <AppText variant="caption" style={styles.therapy}>Para terapia</AppText> : null}
              {entry.archived ? <AppText variant="caption" muted>Arquivado</AppText> : null}
              {entry.tags.slice(0, 4).map((tag) => <AppText key={tag} variant="caption" muted>#{tag}</AppText>)}
            </View>
          </Surface>
        </Pressable>
      )) : <Surface style={styles.empty}><AppText variant="bodyStrong">Nenhum registro encontrado</AppText><AppText muted>Comece escrevendo poucas palavras sobre o momento atual.</AppText></Surface>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs, marginBottom: spacing.lg },
  notice: { gap: spacing.sm, backgroundColor: colors.lavender, marginBottom: spacing.md },
  addButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.primaryStrong, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  addText: { color: colors.white },
  filters: { marginVertical: spacing.sm },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.lg },
  link: { color: colors.primaryStrong },
  card: { gap: spacing.md, marginBottom: spacing.md },
  archived: { opacity: 0.7 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 }, emoji: { fontSize: 28 }, arrow: { fontSize: 28, color: colors.textMuted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  therapy: { color: colors.primaryStrong },
  empty: { gap: spacing.sm },
});
