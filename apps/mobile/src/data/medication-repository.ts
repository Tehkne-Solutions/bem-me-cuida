import * as Crypto from 'expo-crypto';

import {
  createMedicationInputSchema,
  medicationIntakeSchema,
  medicationScheduleSchema,
  medicationSchema,
  type CreateMedicationInput,
  type Medication,
  type MedicationIntake,
  type MedicationIntakeStatus,
  type MedicationSchedule,
} from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';
import { enqueueSyncRecord } from '@/data/sync-queue-repository';
import { dateAtLocalTime, endOfLocalDay, formatLocalDate, maskIncludesDate, startOfLocalDay } from '@/services/care-time';
import { calculateStockAfterStatusChange } from '@/services/stock-policy';

export type MedicationWithSchedules = Medication & { schedules: MedicationSchedule[] };
export type TodayMedicationDose = {
  medication: Medication;
  schedule: MedicationSchedule;
  plannedAt: string;
  intake: MedicationIntake | null;
};

function mapMedication(row: Record<string, unknown>): Medication {
  return medicationSchema.parse({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    dosageText: row.dosage_text,
    instructions: row.instructions,
    prescriber: row.prescriber,
    startDate: row.start_date,
    endDate: row.end_date,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    unitsPerDose: row.units_per_dose ?? 1,
    stockReminderEnabled: Boolean(row.stock_reminder_enabled),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapSchedule(row: Record<string, unknown>): MedicationSchedule {
  return medicationScheduleSchema.parse({
    id: row.id,
    userId: row.user_id,
    medicationId: row.medication_id,
    timeLocal: row.time_local,
    weekdaysMask: row.weekdays_mask,
    reminderEnabled: Boolean(row.reminder_enabled),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapIntake(row: Record<string, unknown>): MedicationIntake {
  return medicationIntakeSchema.parse({
    id: row.id,
    userId: row.user_id,
    medicationId: row.medication_id,
    scheduleId: row.schedule_id,
    plannedAt: row.planned_at,
    occurredAt: row.occurred_at,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function loadSchedules(userId: string, medicationId?: string): Promise<MedicationSchedule[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM medication_schedules
     WHERE user_id = ? AND active = 1 AND deleted_at IS NULL
       AND (? IS NULL OR medication_id = ?)
     ORDER BY time_local ASC;`,
    userId,
    medicationId ?? null,
    medicationId ?? null,
  );
  return rows.map(mapSchedule);
}

export async function saveMedication(
  input: CreateMedicationInput,
  userId: string,
): Promise<MedicationWithSchedules> {
  const parsed = createMedicationInputSchema.parse(input);
  const db = await getDatabase();
  const now = new Date().toISOString();
  const medication = medicationSchema.parse({
    id: Crypto.randomUUID(), userId, name: parsed.name, dosageText: parsed.dosageText,
    instructions: parsed.instructions, prescriber: parsed.prescriber, startDate: parsed.startDate,
    endDate: parsed.endDate, stockQuantity: parsed.stockQuantity, lowStockThreshold: parsed.lowStockThreshold,
    unitsPerDose: parsed.unitsPerDose, stockReminderEnabled: parsed.stockReminderEnabled,
    active: true, createdAt: now, updatedAt: now,
  });
  const schedules = parsed.schedules.map((item) => medicationScheduleSchema.parse({
    id: item.id ?? Crypto.randomUUID(), userId, medicationId: medication.id,
    timeLocal: item.timeLocal, weekdaysMask: item.weekdaysMask,
    reminderEnabled: item.reminderEnabled, active: true, createdAt: now, updatedAt: now,
  }));

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO medications (
        id, user_id, name, dosage_text, instructions, prescriber, start_date, end_date,
        stock_quantity, low_stock_threshold, units_per_dose, stock_reminder_enabled,
        active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      medication.id, userId, medication.name, medication.dosageText, medication.instructions,
      medication.prescriber, medication.startDate, medication.endDate, medication.stockQuantity,
      medication.lowStockThreshold, medication.unitsPerDose, medication.stockReminderEnabled ? 1 : 0, now, now,
    );
    for (const schedule of schedules) {
      await db.runAsync(
        `INSERT INTO medication_schedules (
          id, user_id, medication_id, time_local, weekdays_mask, reminder_enabled,
          active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        schedule.id, userId, medication.id, schedule.timeLocal, schedule.weekdaysMask,
        schedule.reminderEnabled ? 1 : 0, now, now,
      );
      await enqueueSyncRecord(userId, 'medication_schedule', schedule.id, schedule, db);
    }
    await enqueueSyncRecord(userId, 'medication', medication.id, medication, db);
  });
  return { ...medication, schedules };
}

export const saveMedicationWithSchedule = saveMedication;

export async function getMedication(userId: string, medicationId: string): Promise<MedicationWithSchedules | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM medications WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;',
    medicationId,
    userId,
  );
  if (!row) return null;
  return { ...mapMedication(row), schedules: await loadSchedules(userId, medicationId) };
}

export async function updateMedication(
  medicationId: string,
  input: CreateMedicationInput,
  userId: string,
): Promise<MedicationWithSchedules> {
  const parsed = createMedicationInputSchema.parse(input);
  const existing = await getMedication(userId, medicationId);
  if (!existing) throw new Error('medication_not_found');
  const db = await getDatabase();
  const now = new Date().toISOString();
  const medication = medicationSchema.parse({
    ...existing,
    name: parsed.name,
    dosageText: parsed.dosageText,
    instructions: parsed.instructions,
    prescriber: parsed.prescriber,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    stockQuantity: parsed.stockQuantity,
    lowStockThreshold: parsed.lowStockThreshold,
    unitsPerDose: parsed.unitsPerDose,
    stockReminderEnabled: parsed.stockReminderEnabled,
    updatedAt: now,
  });
  const existingById = new Map(existing.schedules.map((item) => [item.id, item]));
  const schedules = parsed.schedules.map((item) => {
    const current = item.id ? existingById.get(item.id) : null;
    return medicationScheduleSchema.parse({
      id: item.id ?? Crypto.randomUUID(), userId, medicationId,
      timeLocal: item.timeLocal, weekdaysMask: item.weekdaysMask,
      reminderEnabled: item.reminderEnabled, active: true,
      createdAt: current?.createdAt ?? now, updatedAt: now,
    });
  });
  const activeIds = new Set(schedules.map((item) => item.id));
  const removed = existing.schedules.filter((item) => !activeIds.has(item.id));

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE medications SET name = ?, dosage_text = ?, instructions = ?, prescriber = ?,
       start_date = ?, end_date = ?, stock_quantity = ?, low_stock_threshold = ?, units_per_dose = ?,
       stock_reminder_enabled = ?, stock_alerted_at = CASE
         WHEN ? IS NULL OR ? IS NULL OR ? > ? THEN NULL ELSE stock_alerted_at END,
       updated_at = ?, synced_at = NULL
       WHERE id = ? AND user_id = ?;`,
      medication.name, medication.dosageText, medication.instructions, medication.prescriber,
      medication.startDate, medication.endDate, medication.stockQuantity, medication.lowStockThreshold,
      medication.unitsPerDose, medication.stockReminderEnabled ? 1 : 0,
      medication.stockQuantity, medication.lowStockThreshold, medication.stockQuantity, medication.lowStockThreshold,
      now, medicationId, userId,
    );
    for (const schedule of schedules) {
      await db.runAsync(
        `INSERT INTO medication_schedules (
          id, user_id, medication_id, time_local, weekdays_mask, reminder_enabled,
          active, created_at, updated_at, synced_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, NULL, NULL)
        ON CONFLICT(id) DO UPDATE SET time_local = excluded.time_local,
          weekdays_mask = excluded.weekdays_mask, reminder_enabled = excluded.reminder_enabled,
          active = 1, updated_at = excluded.updated_at, synced_at = NULL, deleted_at = NULL;`,
        schedule.id, userId, medicationId, schedule.timeLocal, schedule.weekdaysMask,
        schedule.reminderEnabled ? 1 : 0, schedule.createdAt, now,
      );
      await enqueueSyncRecord(userId, 'medication_schedule', schedule.id, schedule, db);
    }
    for (const schedule of removed) {
      const inactive = medicationScheduleSchema.parse({ ...schedule, active: false, updatedAt: now });
      await db.runAsync(
        'UPDATE medication_schedules SET active = 0, updated_at = ?, synced_at = NULL WHERE id = ? AND user_id = ?;',
        now, schedule.id, userId,
      );
      await enqueueSyncRecord(userId, 'medication_schedule', schedule.id, inactive, db);
    }
    await enqueueSyncRecord(userId, 'medication', medication.id, medication, db);
  });
  return { ...medication, schedules };
}

export async function deactivateMedication(userId: string, medicationId: string): Promise<void> {
  const existing = await getMedication(userId, medicationId);
  if (!existing) return;
  const db = await getDatabase();
  const now = new Date().toISOString();
  const inactive = medicationSchema.parse({ ...existing, active: false, updatedAt: now });
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE medications SET active = 0, updated_at = ?, synced_at = NULL WHERE id = ? AND user_id = ?;', now, medicationId, userId);
    await db.runAsync('UPDATE medication_schedules SET active = 0, updated_at = ?, synced_at = NULL WHERE medication_id = ? AND user_id = ?;', now, medicationId, userId);
    await enqueueSyncRecord(userId, 'medication', medicationId, inactive, db);
    for (const schedule of existing.schedules) {
      await enqueueSyncRecord(userId, 'medication_schedule', schedule.id, { ...schedule, active: false, updatedAt: now }, db);
    }
  });
}

export async function listMedications(userId: string, includeInactive = false): Promise<MedicationWithSchedules[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM medications WHERE user_id = ? AND deleted_at IS NULL AND (? = 1 OR active = 1) ORDER BY name COLLATE NOCASE ASC;`,
    userId, includeInactive ? 1 : 0,
  );
  const schedules = await loadSchedules(userId);
  return rows.map((row) => {
    const medication = mapMedication(row);
    return { ...medication, schedules: schedules.filter((item) => item.medicationId === medication.id) };
  });
}

export async function listLowStockMedications(userId: string): Promise<MedicationWithSchedules[]> {
  const all = await listMedications(userId);
  return all.filter((item) => item.stockQuantity !== null && item.lowStockThreshold !== null && item.stockQuantity <= item.lowStockThreshold);
}

export async function listTodayMedicationDoses(userId: string, date = new Date()): Promise<TodayMedicationDose[]> {
  const medications = await listMedications(userId);
  const db = await getDatabase();
  const intakeRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM medication_intakes WHERE user_id = ? AND planned_at BETWEEN ? AND ? AND deleted_at IS NULL;`,
    userId, startOfLocalDay(date).toISOString(), endOfLocalDay(date).toISOString(),
  );
  const intakes = intakeRows.map(mapIntake);
  const dateKey = formatLocalDate(date);
  return medications
    .filter((item) => item.startDate <= dateKey && (!item.endDate || item.endDate >= dateKey))
    .flatMap((medication) => medication.schedules
      .filter((schedule) => maskIncludesDate(schedule.weekdaysMask, date))
      .map((schedule) => {
        const plannedAt = dateAtLocalTime(date, schedule.timeLocal).toISOString();
        return { medication, schedule, plannedAt, intake: intakes.find((item) => item.scheduleId === schedule.id && item.plannedAt === plannedAt) ?? null };
      }))
    .sort((left, right) => left.plannedAt.localeCompare(right.plannedAt));
}

export async function recordMedicationIntake(
  dose: Pick<TodayMedicationDose, 'medication' | 'schedule' | 'plannedAt'>,
  status: MedicationIntakeStatus,
  userId: string,
): Promise<MedicationIntake> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM medication_intakes WHERE user_id = ? AND medication_id = ? AND schedule_id = ? AND planned_at = ? LIMIT 1;`,
    userId, dose.medication.id, dose.schedule.id, dose.plannedAt,
  );
  const now = new Date().toISOString();
  const intake = medicationIntakeSchema.parse({
    id: existing?.id ?? Crypto.randomUUID(), userId, medicationId: dose.medication.id,
    scheduleId: dose.schedule.id, plannedAt: dose.plannedAt,
    occurredAt: status === 'taken' ? now : null, status, note: existing?.note ?? null,
    createdAt: existing?.created_at ?? now, updatedAt: now,
  });
  const previousStatus = existing?.status as MedicationIntakeStatus | undefined;
  const nextStock = calculateStockAfterStatusChange({
    currentStock: dose.medication.stockQuantity,
    unitsPerDose: dose.medication.unitsPerDose,
    previousStatus,
    nextStatus: status,
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO medication_intakes (
        id, user_id, medication_id, schedule_id, planned_at, occurred_at, status, note,
        created_at, updated_at, synced_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      ON CONFLICT(user_id, medication_id, schedule_id, planned_at) DO UPDATE SET
        occurred_at = excluded.occurred_at, status = excluded.status, note = excluded.note,
        updated_at = excluded.updated_at, synced_at = NULL, deleted_at = NULL;`,
      intake.id, userId, intake.medicationId, intake.scheduleId, intake.plannedAt,
      intake.occurredAt, intake.status, intake.note, intake.createdAt, intake.updatedAt,
    );
    await enqueueSyncRecord(userId, 'medication_intake', intake.id, intake, db);
    if (nextStock !== dose.medication.stockQuantity && nextStock !== null) {
      await db.runAsync(
        `UPDATE medications SET stock_quantity = ?, updated_at = ?, synced_at = NULL,
         stock_alerted_at = CASE WHEN low_stock_threshold IS NULL OR ? > low_stock_threshold THEN NULL ELSE stock_alerted_at END
         WHERE id = ? AND user_id = ?;`,
        nextStock, now, nextStock, dose.medication.id, userId,
      );
      const updated = medicationSchema.parse({ ...dose.medication, stockQuantity: nextStock, updatedAt: now });
      await enqueueSyncRecord(userId, 'medication', updated.id, updated, db);
    }
  });
  return intake;
}

export async function listRecentMedicationIntakes(userId: string, limit = 60): Promise<MedicationIntake[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM medication_intakes WHERE user_id = ? AND deleted_at IS NULL ORDER BY planned_at DESC LIMIT ?;`,
    userId, limit,
  );
  return rows.map(mapIntake);
}

export async function claimLowStockAlert(userId: string, medicationId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    stock_quantity: number | null;
    low_stock_threshold: number | null;
    stock_reminder_enabled: number;
    stock_alerted_at: string | null;
  }>(
    `SELECT stock_quantity, low_stock_threshold, stock_reminder_enabled, stock_alerted_at
     FROM medications WHERE id = ? AND user_id = ? AND active = 1 AND deleted_at IS NULL LIMIT 1;`,
    medicationId,
    userId,
  );
  const shouldAlert = Boolean(
    row?.stock_reminder_enabled
      && row.stock_quantity !== null
      && row.low_stock_threshold !== null
      && row.stock_quantity <= row.low_stock_threshold
      && !row.stock_alerted_at,
  );
  if (!shouldAlert) return false;
  await db.runAsync(
    'UPDATE medications SET stock_alerted_at = ? WHERE id = ? AND user_id = ? AND stock_alerted_at IS NULL;',
    new Date().toISOString(),
    medicationId,
    userId,
  );
  return true;
}
