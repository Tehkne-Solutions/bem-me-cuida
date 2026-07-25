import { router } from 'expo-router';
import { Alert } from 'react-native';
import type { CreateMedicationInput } from '@bemmecuida/domain';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { Screen } from '@/components/Screen';
import { saveMedication } from '@/data/medication-repository';
import { MedicationEditor } from '@/features/care/MedicationEditor';
import { EVERY_DAY_MASK, formatLocalDate } from '@/services/care-time';
import { scheduleEntityReminders } from '@/services/reminders';
import { useSync } from '@/sync/SyncProvider';
import { spacing } from '@/theme/tokens';
const initialForm:CreateMedicationInput={name:'',dosageText:'',instructions:null,prescriber:null,startDate:formatLocalDate(),endDate:null,stockQuantity:null,lowStockThreshold:null,unitsPerDose:1,stockReminderEnabled:false,schedules:[{timeLocal:'09:00',weekdaysMask:EVERY_DAY_MASK,reminderEnabled:false}]};
export default function NewMedicationScreen(){const{session}=useAuth();const sync=useSync();async function save(value:CreateMedicationInput){if(!session)return;try{const medication=await saveMedication(value,session.user.id);for(const schedule of medication.schedules){if(!schedule.reminderEnabled)continue;try{await scheduleEntityReminders({userId:session.user.id,entityType:'medication_schedule',entityId:schedule.id,timeLocal:schedule.timeLocal,weekdaysMask:schedule.weekdaysMask})}catch{}}void sync.syncNow();Alert.alert('Medicamento cadastrado','O plano foi salvo sem alterar ou interpretar a prescrição.',[{text:'Concluir',onPress:()=>router.back()}])}catch{Alert.alert('Não foi possível salvar','Revise os dados e tente novamente.')}}return <Screen><BackHeader eyebrow="NOVO MEDICAMENTO" title="Registrar o plano prescrito" titleTestID="new-medication-title"/><MedicationEditor initialValue={initialForm} submitLabel="Salvar medicamento" testID="medication-save" onSubmit={save}/><AppText variant="caption" muted style={{textAlign:'center',marginTop:spacing.md,marginBottom:spacing.xl}}>O BemMeCuida não recomenda mudanças de dose ou tratamento.</AppText></Screen>}
