import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { listAppointments } from '@/data/care-management-repository';
import { listCarePractices } from '@/data/care-practice-repository';
import {
  listLowStockMedications,
  listMedications,
  markRefillReminderSent,
} from '@/data/medication-repository';
import {
  clearAllNotificationBindings,
  listAllNotificationBindings,
  listNotificationBindings,
  replaceNotificationBindings,
  type ReminderEntityType,
} from '@/data/notification-repository';

const CHANNEL_ID = 'care-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

export type ReminderPermissionResult = 'granted' | 'denied' | 'unavailable';

async function ensureCareChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lembretes de cuidado', description: 'Lembretes discretos configurados por você.',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    showBadge: false, enableVibrate: true, vibrationPattern: [0, 180],
  });
}

export async function ensureReminderPermission(): Promise<ReminderPermissionResult> {
  if (Platform.OS === 'web') return 'unavailable';
  await ensureCareChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  const requested = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: false } });
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ? 'granted' : 'denied';
}

export async function cancelEntityReminders(userId: string, entityType: ReminderEntityType, entityId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const identifiers = await listNotificationBindings(userId, entityType, entityId);
  await Promise.all(identifiers.map(async (identifier) => {
    try { await Notifications.cancelScheduledNotificationAsync(identifier); } catch { /* removida pelo sistema */ }
  }));
  await replaceNotificationBindings(userId, entityType, entityId, []);
}

export async function scheduleEntityReminders(options: {
  userId: string; entityType: 'medication_schedule' | 'care_practice'; entityId: string;
  timeLocal: string; weekdaysMask: number;
}): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  if (await ensureReminderPermission() !== 'granted') throw new Error('notification_permission_denied');
  await cancelEntityReminders(options.userId, options.entityType, options.entityId);
  const [hour = 9, minute = 0] = options.timeLocal.split(':').map(Number);
  const identifiers: string[] = [];
  const content: Notifications.NotificationContentInput = {
    title: 'Lembrete de cuidado', body: 'Você tem um cuidado programado agora.',
    data: { route: '/(tabs)/care', entityType: options.entityType },
  };
  if (options.weekdaysMask === 127) {
    identifiers.push(await Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID } }));
  } else {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      if ((options.weekdaysMask & (1 << dayIndex)) === 0) continue;
      identifiers.push(await Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: dayIndex + 1, hour, minute, channelId: CHANNEL_ID } }));
    }
  }
  await replaceNotificationBindings(options.userId, options.entityType, options.entityId, identifiers);
  return identifiers;
}

export async function scheduleAppointmentReminder(userId: string, appointmentId: string, scheduledAt: string): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  if (await ensureReminderPermission() !== 'granted') throw new Error('notification_permission_denied');
  await cancelEntityReminders(userId, 'appointment', appointmentId);
  const reminderAt = new Date(new Date(scheduledAt).getTime() - 60 * 60 * 1000);
  if (reminderAt.getTime() <= Date.now()) return [];
  const identifier = await Notifications.scheduleNotificationAsync({
    content: { title: 'Lembrete de cuidado', body: 'Você tem um compromisso de cuidado em breve.', data: { route: '/appointments' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderAt, channelId: CHANNEL_ID },
  });
  await replaceNotificationBindings(userId, 'appointment', appointmentId, [identifier]);
  return [identifier];
}

export async function reconcileCareReminders(userId: string): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) return 0;
  const [medications, practices, appointments] = await Promise.all([
    listMedications(userId), listCarePractices(userId), listAppointments(userId),
  ]);
  let scheduled = 0;
  for (const medication of medications) for (const schedule of medication.schedules) {
    if (!schedule.reminderEnabled) continue;
    if ((await listNotificationBindings(userId, 'medication_schedule', schedule.id)).length) continue;
    await scheduleEntityReminders({ userId, entityType: 'medication_schedule', entityId: schedule.id, timeLocal: schedule.timeLocal, weekdaysMask: schedule.weekdaysMask });
    scheduled += 1;
  }
  for (const practice of practices) {
    if (!practice.reminderEnabled || !practice.timeLocal) continue;
    if ((await listNotificationBindings(userId, 'care_practice', practice.id)).length) continue;
    await scheduleEntityReminders({ userId, entityType: 'care_practice', entityId: practice.id, timeLocal: practice.timeLocal, weekdaysMask: practice.weekdaysMask });
    scheduled += 1;
  }
  for (const appointment of appointments) {
    if (!appointment.reminderEnabled || appointment.status !== 'scheduled') continue;
    if ((await listNotificationBindings(userId, 'appointment', appointment.id)).length) continue;
    const ids = await scheduleAppointmentReminder(userId, appointment.id, appointment.scheduledAt);
    if (ids.length) scheduled += 1;
  }
  scheduled += await reconcileRefillReminders(userId);
  return scheduled;
}

export async function reconcileRefillReminders(userId: string): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const due = await listLowStockMedications(userId);
  let sent = 0;
  for (const medication of due) {
    const lastSent = medication.refillReminderLastSentAt ? new Date(medication.refillReminderLastSentAt).getTime() : 0;
    if (Date.now() - lastSent < 24 * 60 * 60 * 1000) continue;
    const identifier = await Notifications.scheduleNotificationAsync({
      content: { title: 'Lembrete de cuidado', body: 'Revise um item do seu plano de cuidado.', data: { route: '/medications' } },
      trigger: null,
    });
    await replaceNotificationBindings(userId, 'medication_refill', medication.id, [identifier]);
    await markRefillReminderSent(userId, medication.id);
    sent += 1;
  }
  return sent;
}

export async function cancelAllUserReminders(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const identifiers = await listAllNotificationBindings(userId);
  await Promise.all(identifiers.map(async (identifier) => {
    try { await Notifications.cancelScheduledNotificationAsync(identifier); } catch { /* removida pelo sistema */ }
  }));
  await clearAllNotificationBindings(userId);
}
