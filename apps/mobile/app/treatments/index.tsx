import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import type { Treatment } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { deactivateTreatment, listTreatments } from '@/data/treatment-repository';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const typeLabel: Record<Treatment['type'], string> = { therapy: 'Terapia', medical: 'Acompanhamento médico', group: 'Grupo', rehabilitation: 'Reabilitação', other: 'Outro' };

export default function TreatmentsScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [items, setItems] = useState<Treatment[]>([]);
  const load = useCallback(async () => { if (session) setItems(await listTreatments(session.user.id, true)); }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load, sync.lastSuccessAt]));
  function finish(item: Treatment) {
    if (!session) return;
    Alert.alert('Encerrar tratamento?', 'O histórico e as datas serão preservados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: () => void (async () => { await deactivateTreatment(session.user.id, item.id); await load(); void sync.syncNow(); })() },
    ]);
  }
  return (
    <Screen>
      <BackHeader eyebrow="TRATAMENTOS" title="Acompanhar sem avaliar eficácia" titleTestID="treatments-title" />
      <Link href="/treatments/new" asChild><Pressable testID="treatments-add" accessibilityRole="button" style={styles.addButton}><AppText variant="bodyStrong" style={styles.addText}>+ Novo tratamento</AppText></Pressable></Link>
      <AppText variant="h2" style={styles.sectionTitle}>Em andamento</AppText>
      {items.filter((item) => item.active).length ? items.filter((item) => item.active).map((item) => (
        <Surface key={item.id} style={styles.card}>
          <View style={styles.row}><View style={styles.flex}><AppText variant="bodyStrong">{item.name}</AppText><AppText variant="caption" muted>{typeLabel[item.type]} · desde {item.startedAt}</AppText></View></View>
          {item.provider ? <AppText muted>{item.provider}</AppText> : null}
          <PrimaryButton tone="danger" label="Encerrar registro" onPress={() => finish(item)} />
        </Surface>
      )) : <Surface><AppText muted>Nenhum tratamento ativo cadastrado.</AppText></Surface>}
      <AppText variant="h2" style={styles.sectionTitle}>Encerrados</AppText>
      {items.filter((item) => !item.active).map((item) => <Surface key={item.id} style={styles.card}><AppText variant="bodyStrong">{item.name}</AppText><AppText variant="caption" muted>{item.startedAt} — {item.endedAt ?? 'encerrado'}</AppText></Surface>)}
    </Screen>
  );
}
const styles = StyleSheet.create({
  addButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md },
  addText: { color: colors.primaryStrong }, sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  card: { gap: spacing.sm, marginBottom: spacing.md }, row: { flexDirection: 'row' }, flex: { flex: 1 },
});
