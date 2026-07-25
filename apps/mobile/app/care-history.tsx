import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CarePractice, Medication } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { ChoiceChip } from '@/components/ChoiceChip';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { listAppointments } from '@/data/care-management-repository';
import { listCarePractices, listRecentCarePracticeCompletions } from '@/data/care-practice-repository';
import { listMedications, listRecentMedicationIntakes } from '@/data/medication-repository';
import { careCategoryEmoji, medicationIntakeLabel, practiceCompletionLabel } from '@/services/care-labels';
import { colors, radius, spacing } from '@/theme/tokens';

type HistoryType = 'all' | 'medication' | 'practice' | 'appointment';
type Period = 7 | 30 | 90;
type HistoryItem = { id: string; occurredAt: string; type: Exclude<HistoryType, 'all'>; icon: string; title: string; subtitle: string; positive: boolean };

function formatDate(value: string): string { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

export default function CareHistoryScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [type, setType] = useState<HistoryType>('all');
  const [period, setPeriod] = useState<Period>(30);

  const load = useCallback(async () => {
    if (!session) return;
    const [medications, intakes, practices, completions, appointments] = await Promise.all([
      listMedications(session.user.id, true), listRecentMedicationIntakes(session.user.id, 250),
      listCarePractices(session.user.id, true), listRecentCarePracticeCompletions(session.user.id, 250),
      listAppointments(session.user.id, { includePast: true, limit: 250 }),
    ]);
    const medicationMap = new Map<string, Medication>(medications.map((item) => [item.id, item]));
    const practiceMap = new Map<string, CarePractice>(practices.map((item) => [item.id, item]));
    setItems([
      ...intakes.map((item): HistoryItem => ({ id: `med-${item.id}`, occurredAt: item.occurredAt ?? item.plannedAt, type: 'medication', icon: '💊', title: medicationMap.get(item.medicationId)?.name ?? 'Medicamento', subtitle: medicationIntakeLabel[item.status] ?? 'Registrado', positive: item.status === 'taken' })),
      ...completions.map((item): HistoryItem => { const practice = practiceMap.get(item.practiceId); return { id: `practice-${item.id}`, occurredAt: item.completedAt ?? item.plannedAt, type: 'practice', icon: practice ? careCategoryEmoji[practice.category] : '🌿', title: practice?.title ?? 'Prática de cuidado', subtitle: practiceCompletionLabel[item.status] ?? 'Registrado', positive: item.status === 'completed' }; }),
      ...appointments.filter((item) => item.status !== 'scheduled' || new Date(item.scheduledAt).getTime() < Date.now()).map((item): HistoryItem => ({ id: `appointment-${item.id}`, occurredAt: item.scheduledAt, type: 'appointment', icon: '🗓️', title: item.title, subtitle: item.status === 'completed' ? 'Concluída' : item.status === 'cancelled' ? 'Cancelada' : 'Agendada', positive: item.status === 'completed' })),
    ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const cutoff = Date.now() - period * 86_400_000;
    return items.filter((item) => (type === 'all' || item.type === type) && new Date(item.occurredAt).getTime() >= cutoff);
  }, [items, period, type]);
  const groups = useMemo(() => { const result = new Map<string, HistoryItem[]>(); for (const item of filtered) { const key = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(item.occurredAt)); result.set(key, [...(result.get(key) ?? []), item]); } return [...result.entries()]; }, [filtered]);

  return <Screen><BackHeader eyebrow="HISTÓRICO DE CUIDADO" title="O que aconteceu, sem julgamentos" />
    <Surface style={styles.filters}><AppText variant="bodyStrong">Mostrar</AppText><View style={styles.chips}><ChoiceChip label="Tudo" selected={type==='all'} onPress={()=>setType('all')}/><ChoiceChip label="Medicamentos" selected={type==='medication'} onPress={()=>setType('medication')}/><ChoiceChip label="Práticas" selected={type==='practice'} onPress={()=>setType('practice')}/><ChoiceChip label="Consultas" selected={type==='appointment'} onPress={()=>setType('appointment')}/></View><AppText variant="bodyStrong">Período</AppText><View style={styles.chips}>{([7,30,90] as const).map((value)=><ChoiceChip key={value} label={`${value} dias`} selected={period===value} onPress={()=>setPeriod(value)}/>)}</View></Surface>
    {groups.length ? groups.map(([date,dateItems])=><View key={date} style={styles.group}><AppText variant="h2" style={styles.date}>{date}</AppText><Surface style={styles.list}>{dateItems.map((item,index)=><View key={item.id} style={[styles.row,index>0&&styles.divider]}><View style={styles.icon}><AppText>{item.icon}</AppText></View><View style={styles.flex}><AppText variant="bodyStrong">{item.title}</AppText><AppText variant="caption" muted>{formatDate(item.occurredAt)}</AppText></View><View style={[styles.badge,item.positive?styles.good:styles.neutral]}><AppText variant="caption" style={item.positive?styles.goodText:styles.neutralText}>{item.subtitle}</AppText></View></View>)}</Surface></View>) : <Surface><AppText muted>Nenhum registro corresponde aos filtros escolhidos.</AppText></Surface>}
    <AppText variant="caption" muted style={styles.footer}>Este histórico descreve registros feitos por você. Ele não avalia eficácia ou segurança do tratamento.</AppText>
  </Screen>;
}
const styles=StyleSheet.create({filters:{gap:spacing.md,marginBottom:spacing.xl},chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},group:{marginBottom:spacing.xl},date:{marginBottom:spacing.md,textTransform:'capitalize'},list:{paddingVertical:spacing.sm},row:{flexDirection:'row',alignItems:'center',gap:spacing.md,paddingVertical:spacing.md},divider:{borderTopWidth:1,borderTopColor:colors.border},icon:{width:40,height:40,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},flex:{flex:1},badge:{borderRadius:radius.pill,paddingHorizontal:spacing.md,paddingVertical:spacing.xs},good:{backgroundColor:colors.primarySoft},neutral:{backgroundColor:colors.sand},goodText:{color:colors.primaryStrong},neutralText:{color:colors.textMuted},footer:{textAlign:'center',marginBottom:spacing.xl}});
