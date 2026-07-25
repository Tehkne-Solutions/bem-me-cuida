import {
  appointmentSchema,
  carePracticeCompletionSchema,
  carePracticeSchema,
  medicationIntakeSchema,
  medicationScheduleSchema,
  medicationSchema,
  professionalSchema,
  treatmentSchema,
} from '@bemmecuida/domain';

import { getCareSyncCursor, resetCareSyncCursor, saveCareSyncCursor } from '@/data/care-sync-cursor-repository';
import { getDatabase } from '@/data/database';
import { supabase } from '@/services/supabase';

export const careEntityTypes = ['medication','medication_schedule','medication_intake','care_practice','care_practice_completion','professional','appointment','treatment'] as const;
export type CareEntityType = (typeof careEntityTypes)[number];

const tableByEntity: Record<CareEntityType, string> = {
  medication: 'medications', medication_schedule: 'medication_schedules', medication_intake: 'medication_intakes',
  care_practice: 'care_practices', care_practice_completion: 'care_practice_completions',
  professional: 'professionals', appointment: 'appointments', treatment: 'treatments',
};

function isCareEntityType(value: string): value is CareEntityType { return (careEntityTypes as readonly string[]).includes(value); }
function parseCarePayload(entityType: CareEntityType, payload: unknown): { userId: string } {
  switch (entityType) {
    case 'medication': return medicationSchema.parse(payload);
    case 'medication_schedule': return medicationScheduleSchema.parse(payload);
    case 'medication_intake': return medicationIntakeSchema.parse(payload);
    case 'care_practice': return carePracticeSchema.parse(payload);
    case 'care_practice_completion': return carePracticeCompletionSchema.parse(payload);
    case 'professional': return professionalSchema.parse(payload);
    case 'appointment': return appointmentSchema.parse(payload);
    case 'treatment': return treatmentSchema.parse(payload);
  }
}

export async function syncCareQueueItem(entityTypeValue: string, payload: unknown, activeUserId: string): Promise<'applied' | 'remote_newer'> {
  if (!supabase || !isCareEntityType(entityTypeValue)) throw new Error('unsupported_care_entity');
  const record = parseCarePayload(entityTypeValue, payload);
  if (record.userId !== activeUserId) throw new Error('account_scope_mismatch');
  const { data, error } = await supabase.rpc('sync_care_record', { p_entity_type: entityTypeValue, p_record: record });
  if (error) throw new Error(error.code ?? 'care_sync_failed');
  if (data !== 'applied' && data !== 'remote_newer') throw new Error('unexpected_sync_outcome');
  return data;
}

export async function markCareEntitySynced(entityTypeValue: string, entityId: string, userId: string): Promise<void> {
  if (!isCareEntityType(entityTypeValue)) return;
  const db = await getDatabase();
  await db.runAsync(`UPDATE ${tableByEntity[entityTypeValue]} SET synced_at = ? WHERE id = ? AND user_id = ?;`, new Date().toISOString(), entityId, userId);
}

type PullRow = { entity_type: CareEntityType; entity_id: string; server_updated_at: string; payload: Record<string, unknown> };

async function hasPendingLocalChange(userId: string, entityType: CareEntityType, entityId: string): Promise<boolean> {
  const db = await getDatabase();
  return Boolean(await db.getFirstAsync<{ id: string }>('SELECT id FROM sync_queue WHERE user_id = ? AND entity_type = ? AND entity_id = ? LIMIT 1;', userId, entityType, entityId));
}

async function markDeleted(table: string, payload: Record<string, unknown>, syncedAt: string): Promise<boolean> {
  const deletedAt = payload.deleted_at as string | null;
  if (!deletedAt) return false;
  const db = await getDatabase();
  await db.runAsync(`UPDATE ${table} SET deleted_at = ?, synced_at = ?, updated_at = ? WHERE id = ? AND user_id = ?;`, deletedAt, syncedAt, payload.client_updated_at ?? syncedAt, payload.id, payload.user_id);
  return true;
}

async function applyRemoteMedication(payload: Record<string, unknown>, syncedAt: string) {
  if (await markDeleted('medications', payload, syncedAt)) return;
  const r = medicationSchema.parse({
    id: payload.id, userId: payload.user_id, name: payload.name, dosageText: payload.dosage_text,
    instructions: payload.instructions, prescriber: payload.prescriber, startDate: payload.start_date,
    endDate: payload.end_date, active: payload.active,
    stockTrackingEnabled: payload.stock_tracking_enabled ?? false,
    stockQuantity: payload.stock_quantity ?? null, unitsPerIntake: payload.units_per_intake ?? null,
    refillThreshold: payload.refill_threshold ?? null, refillReminderEnabled: payload.refill_reminder_enabled ?? false,
    refillReminderLastSentAt: payload.refill_reminder_last_sent_at ?? null,
    createdAt: payload.created_at, updatedAt: payload.client_updated_at,
  });
  const db = await getDatabase();
  await db.runAsync(`INSERT INTO medications (id,user_id,name,dosage_text,instructions,prescriber,start_date,end_date,active,stock_tracking_enabled,stock_quantity,units_per_intake,refill_threshold,refill_reminder_enabled,refill_reminder_last_sent_at,created_at,updated_at,synced_at,deleted_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET name=excluded.name,dosage_text=excluded.dosage_text,instructions=excluded.instructions,prescriber=excluded.prescriber,start_date=excluded.start_date,end_date=excluded.end_date,active=excluded.active,stock_tracking_enabled=excluded.stock_tracking_enabled,stock_quantity=excluded.stock_quantity,units_per_intake=excluded.units_per_intake,refill_threshold=excluded.refill_threshold,refill_reminder_enabled=excluded.refill_reminder_enabled,refill_reminder_last_sent_at=excluded.refill_reminder_last_sent_at,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL WHERE excluded.updated_at >= medications.updated_at;`,
    r.id,r.userId,r.name,r.dosageText,r.instructions,r.prescriber,r.startDate,r.endDate,r.active?1:0,r.stockTrackingEnabled?1:0,r.stockQuantity,r.unitsPerIntake,r.refillThreshold,r.refillReminderEnabled?1:0,r.refillReminderLastSentAt,r.createdAt,r.updatedAt,syncedAt);
}

async function applyRemoteMedicationSchedule(payload: Record<string, unknown>, syncedAt: string) {
  if (await markDeleted('medication_schedules', payload, syncedAt)) return;
  const r=medicationScheduleSchema.parse({id:payload.id,userId:payload.user_id,medicationId:payload.medication_id,timeLocal:String(payload.time_local).slice(0,5),weekdaysMask:payload.weekdays_mask,reminderEnabled:payload.reminder_enabled,active:payload.active,createdAt:payload.created_at,updatedAt:payload.client_updated_at});
  const db=await getDatabase(); await db.runAsync(`INSERT INTO medication_schedules (id,user_id,medication_id,time_local,weekdays_mask,reminder_enabled,active,created_at,updated_at,synced_at,deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET medication_id=excluded.medication_id,time_local=excluded.time_local,weekdays_mask=excluded.weekdays_mask,reminder_enabled=excluded.reminder_enabled,active=excluded.active,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL WHERE excluded.updated_at >= medication_schedules.updated_at;`,r.id,r.userId,r.medicationId,r.timeLocal,r.weekdaysMask,r.reminderEnabled?1:0,r.active?1:0,r.createdAt,r.updatedAt,syncedAt);
}

async function applyRemoteMedicationIntake(payload: Record<string, unknown>, syncedAt: string) {
  if (await markDeleted('medication_intakes', payload, syncedAt)) return;
  const r=medicationIntakeSchema.parse({id:payload.id,userId:payload.user_id,medicationId:payload.medication_id,scheduleId:payload.schedule_id,plannedAt:payload.planned_at,occurredAt:payload.occurred_at,status:payload.status,note:payload.note,createdAt:payload.created_at,updatedAt:payload.client_updated_at});
  const db=await getDatabase(); await db.runAsync(`INSERT INTO medication_intakes (id,user_id,medication_id,schedule_id,planned_at,occurred_at,status,note,created_at,updated_at,synced_at,deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET medication_id=excluded.medication_id,schedule_id=excluded.schedule_id,planned_at=excluded.planned_at,occurred_at=excluded.occurred_at,status=excluded.status,note=excluded.note,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL WHERE excluded.updated_at >= medication_intakes.updated_at;`,r.id,r.userId,r.medicationId,r.scheduleId,r.plannedAt,r.occurredAt,r.status,r.note,r.createdAt,r.updatedAt,syncedAt);
}

async function applyRemotePractice(payload: Record<string, unknown>, syncedAt: string) {
  if (await markDeleted('care_practices', payload, syncedAt)) return;
  const r=carePracticeSchema.parse({id:payload.id,userId:payload.user_id,title:payload.title,category:payload.category,description:payload.description,targetMinutes:payload.target_minutes,timeLocal:payload.time_local?String(payload.time_local).slice(0,5):null,weekdaysMask:payload.weekdays_mask,reminderEnabled:payload.reminder_enabled,active:payload.active,createdAt:payload.created_at,updatedAt:payload.client_updated_at});
  const db=await getDatabase(); await db.runAsync(`INSERT INTO care_practices (id,user_id,title,category,description,target_minutes,time_local,weekdays_mask,reminder_enabled,active,created_at,updated_at,synced_at,deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,description=excluded.description,target_minutes=excluded.target_minutes,time_local=excluded.time_local,weekdays_mask=excluded.weekdays_mask,reminder_enabled=excluded.reminder_enabled,active=excluded.active,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL WHERE excluded.updated_at >= care_practices.updated_at;`,r.id,r.userId,r.title,r.category,r.description,r.targetMinutes,r.timeLocal,r.weekdaysMask,r.reminderEnabled?1:0,r.active?1:0,r.createdAt,r.updatedAt,syncedAt);
}

async function applyRemotePracticeCompletion(payload: Record<string, unknown>, syncedAt: string) {
  if (await markDeleted('care_practice_completions', payload, syncedAt)) return;
  const r=carePracticeCompletionSchema.parse({id:payload.id,userId:payload.user_id,practiceId:payload.practice_id,plannedAt:payload.planned_at,completedAt:payload.completed_at,status:payload.status,note:payload.note,createdAt:payload.created_at,updatedAt:payload.client_updated_at});
  const db=await getDatabase(); await db.runAsync(`INSERT INTO care_practice_completions (id,user_id,practice_id,planned_at,completed_at,status,note,created_at,updated_at,synced_at,deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET practice_id=excluded.practice_id,planned_at=excluded.planned_at,completed_at=excluded.completed_at,status=excluded.status,note=excluded.note,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL WHERE excluded.updated_at >= care_practice_completions.updated_at;`,r.id,r.userId,r.practiceId,r.plannedAt,r.completedAt,r.status,r.note,r.createdAt,r.updatedAt,syncedAt);
}

async function applyRemoteProfessional(payload: Record<string, unknown>, syncedAt: string) {
  if (await markDeleted('professionals',payload,syncedAt)) return;
  const r=professionalSchema.parse({id:payload.id,userId:payload.user_id,name:payload.name,specialty:payload.specialty,phone:payload.phone,email:payload.email,notes:payload.notes,active:payload.active,createdAt:payload.created_at,updatedAt:payload.client_updated_at});
  const db=await getDatabase(); await db.runAsync(`INSERT INTO professionals (id,user_id,name,specialty,phone,email,notes,active,created_at,updated_at,synced_at,deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET name=excluded.name,specialty=excluded.specialty,phone=excluded.phone,email=excluded.email,notes=excluded.notes,active=excluded.active,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL WHERE excluded.updated_at >= professionals.updated_at;`,r.id,r.userId,r.name,r.specialty,r.phone,r.email,r.notes,r.active?1:0,r.createdAt,r.updatedAt,syncedAt);
}

async function applyRemoteAppointment(payload: Record<string, unknown>, syncedAt: string) {
  if (await markDeleted('appointments',payload,syncedAt)) return;
  const r=appointmentSchema.parse({id:payload.id,userId:payload.user_id,professionalId:payload.professional_id,title:payload.title,scheduledAt:payload.scheduled_at,durationMinutes:payload.duration_minutes,location:payload.location,notes:payload.notes,status:payload.status,reminderEnabled:payload.reminder_enabled,createdAt:payload.created_at,updatedAt:payload.client_updated_at});
  const db=await getDatabase(); await db.runAsync(`INSERT INTO appointments (id,user_id,professional_id,title,scheduled_at,duration_minutes,location,notes,status,reminder_enabled,created_at,updated_at,synced_at,deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET professional_id=excluded.professional_id,title=excluded.title,scheduled_at=excluded.scheduled_at,duration_minutes=excluded.duration_minutes,location=excluded.location,notes=excluded.notes,status=excluded.status,reminder_enabled=excluded.reminder_enabled,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL WHERE excluded.updated_at >= appointments.updated_at;`,r.id,r.userId,r.professionalId,r.title,r.scheduledAt,r.durationMinutes,r.location,r.notes,r.status,r.reminderEnabled?1:0,r.createdAt,r.updatedAt,syncedAt);
}

async function applyRemoteTreatment(payload: Record<string, unknown>, syncedAt: string) {
  if (await markDeleted('treatments',payload,syncedAt)) return;
  const r=treatmentSchema.parse({id:payload.id,userId:payload.user_id,professionalId:payload.professional_id,name:payload.name,description:payload.description,startDate:payload.start_date,endDate:payload.end_date,status:payload.status,notes:payload.notes,createdAt:payload.created_at,updatedAt:payload.client_updated_at});
  const db=await getDatabase(); await db.runAsync(`INSERT INTO treatments (id,user_id,professional_id,name,description,start_date,end_date,status,notes,created_at,updated_at,synced_at,deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET professional_id=excluded.professional_id,name=excluded.name,description=excluded.description,start_date=excluded.start_date,end_date=excluded.end_date,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at,synced_at=excluded.synced_at,deleted_at=NULL WHERE excluded.updated_at >= treatments.updated_at;`,r.id,r.userId,r.professionalId,r.name,r.description,r.startDate,r.endDate,r.status,r.notes,r.createdAt,r.updatedAt,syncedAt);
}

async function applyRemoteCareRecord(row: PullRow): Promise<void> {
  switch(row.entity_type){case'medication':return applyRemoteMedication(row.payload,row.server_updated_at);case'medication_schedule':return applyRemoteMedicationSchedule(row.payload,row.server_updated_at);case'medication_intake':return applyRemoteMedicationIntake(row.payload,row.server_updated_at);case'care_practice':return applyRemotePractice(row.payload,row.server_updated_at);case'care_practice_completion':return applyRemotePracticeCompletion(row.payload,row.server_updated_at);case'professional':return applyRemoteProfessional(row.payload,row.server_updated_at);case'appointment':return applyRemoteAppointment(row.payload,row.server_updated_at);case'treatment':return applyRemoteTreatment(row.payload,row.server_updated_at);}
}

export async function pullCareEntity(userId: string, entityType: CareEntityType): Promise<number> {
  if (!supabase) return 0;
  const state=await getCareSyncCursor(userId,entityType); let cursor=state.updatedAt??'1970-01-01T00:00:00.000Z'; let cursorId=state.id??'00000000-0000-0000-0000-000000000000'; let pulled=0;
  while(true){const {data,error}=await supabase.rpc('pull_care_records',{p_entity_type:entityType,p_cursor_updated_at:cursor,p_cursor_id:cursorId,p_limit:500}); if(error)throw new Error(error.code??'care_pull_failed'); const rows=(data??[]) as PullRow[]; if(!rows.length)break; let pageCursor=cursor,pageCursorId=cursorId,blocked=false; for(const row of rows){if(row.entity_type!==entityType)throw new Error('care_entity_type_mismatch'); if(await hasPendingLocalChange(userId,entityType,row.entity_id)){blocked=true;break;} await applyRemoteCareRecord(row); pulled+=1; pageCursor=row.server_updated_at; pageCursorId=row.entity_id;} if(pageCursor!==cursor||pageCursorId!==cursorId){cursor=pageCursor;cursorId=pageCursorId;await saveCareSyncCursor(userId,entityType,cursor,cursorId);} if(blocked||rows.length<500)break;}
  return pulled;
}
export async function pullAllCareRecords(userId:string):Promise<number>{let pulled=0;for(const type of careEntityTypes)pulled+=await pullCareEntity(userId,type);return pulled;}
export async function resetCareEntityCursor(userId:string,entityTypeValue:string):Promise<void>{if(isCareEntityType(entityTypeValue))await resetCareSyncCursor(userId,entityTypeValue);}
