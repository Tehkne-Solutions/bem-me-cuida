import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import {
  defaultNotificationPreferences,
  readNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '@/preferences/notification-preferences';
import {
  ensureReminderPermission,
  getReminderPermissionStatus,
  refreshAllUserReminders,
  type ReminderPermissionResult,
} from '@/services/reminders';
import { normalizeTimeLocal } from '@/services/notification-policy';
import { colors, spacing } from '@/theme/tokens';

function permissionLabel(value: ReminderPermissionResult): string {
  if (value === 'granted') return 'Permitidas no aparelho';
  if (value === 'denied') return 'Bloqueadas no aparelho';
  return 'Indisponíveis nesta plataforma';
}

export default function NotificationsSettingsScreen() {
  const { session } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [permission, setPermission] = useState<ReminderPermissionResult>('unavailable');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [nextPreferences, nextPermission] = await Promise.all([
        readNotificationPreferences(session.user.id),
        getReminderPermissionStatus(),
      ]);
      setPreferences(nextPreferences);
      setPermission(nextPermission);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function updateCategory(key: keyof NotificationPreferences['categories'], value: boolean) {
    setPreferences((current) => ({
      ...current,
      categories: { ...current.categories, [key]: value },
    }));
  }

  async function save() {
    if (!session) return;
    setSaving(true);
    try {
      const normalized: NotificationPreferences = {
        ...preferences,
        quietStartLocal: normalizeTimeLocal(
          preferences.quietStartLocal,
          defaultNotificationPreferences.quietStartLocal,
        ),
        quietEndLocal: normalizeTimeLocal(
          preferences.quietEndLocal,
          defaultNotificationPreferences.quietEndLocal,
        ),
        dailyCheckInTimeLocal: normalizeTimeLocal(
          preferences.dailyCheckInTimeLocal,
          defaultNotificationPreferences.dailyCheckInTimeLocal,
        ),
      };

      if (normalized.enabled) {
        const permissionResult = await ensureReminderPermission();
        setPermission(permissionResult);
        if (permissionResult === 'denied') {
          Alert.alert(
            'Notificações bloqueadas',
            'As preferências foram salvas, mas o sistema não permitirá os lembretes até a permissão ser ativada.',
          );
        }
      }

      await saveNotificationPreferences(session.user.id, normalized);
      setPreferences(normalized);
      const scheduled = await refreshAllUserReminders(session.user.id);
      Alert.alert(
        'Preferências salvas',
        normalized.enabled
          ? `${scheduled} grupo(s) de lembretes foram revisados no aparelho.`
          : 'Os lembretes locais do BemMeCuida foram cancelados.',
      );
    } catch {
      Alert.alert('Não foi possível atualizar', 'Revise os horários e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Pressable testID="notifications-settings-back" onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>

      <AppText variant="caption" muted style={styles.eyebrow}>NOTIFICAÇÕES</AppText>
      <AppText variant="h1" testID="notifications-settings-title">Lembretes sob seu controle</AppText>
      <AppText muted style={styles.intro}>
        Escolha quais lembretes aparecem. O conteúdo permanece genérico para não expor informações emocionais ou de saúde na tela bloqueada.
      </AppText>

      {loading ? <Surface><AppText muted>Carregando preferências…</AppText></Surface> : (
        <>
          <Surface style={styles.section}>
            <View style={styles.statusRow}>
              <View style={styles.flex}>
                <AppText variant="h2">Permissão do aparelho</AppText>
                <AppText muted>{permissionLabel(permission)}</AppText>
              </View>
              <View style={[styles.statusDot, permission === 'granted' && styles.statusGranted]} />
            </View>
            {permission === 'denied' ? (
              <SecondaryButton label="Abrir configurações do aparelho" onPress={() => void Linking.openSettings()} />
            ) : null}
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Preferência geral</AppText>
            <CheckboxRow
              testID="notifications-enabled"
              checked={preferences.enabled}
              onChange={(value) => setPreferences((current) => ({ ...current, enabled: value }))}
              label="Permitir lembretes do BemMeCuida"
              description="Desativar cancela somente notificações locais; seus registros permanecem salvos."
            />
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Categorias</AppText>
            <CheckboxRow
              checked={preferences.categories.medications}
              onChange={(value) => updateCategory('medications', value)}
              label="Medicamentos programados"
              description="Segue apenas horários cadastrados por você; não recomenda dose ou alteração de tratamento."
            />
            <CheckboxRow
              checked={preferences.categories.practices}
              onChange={(value) => updateCategory('practices', value)}
              label="Práticas de cuidado"
            />
            <CheckboxRow
              checked={preferences.categories.appointments}
              onChange={(value) => updateCategory('appointments', value)}
              label="Consultas e compromissos"
            />
            <CheckboxRow
              checked={preferences.categories.refills}
              onChange={(value) => updateCategory('refills', value)}
              label="Avisos de reposição"
            />
            <CheckboxRow
              testID="notifications-daily-checkin"
              checked={preferences.categories.dailyCheckIn}
              onChange={(value) => updateCategory('dailyCheckIn', value)}
              label="Convite diário para check-in"
              description="Opcional e desligado por padrão."
            />
            {preferences.categories.dailyCheckIn ? (
              <TextField
                testID="notifications-checkin-time"
                label="Horário do convite diário"
                value={preferences.dailyCheckInTimeLocal}
                onChangeText={(value) => setPreferences((current) => ({ ...current, dailyCheckInTimeLocal: value }))}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
                placeholder="20:00"
                hint="Formato 24 horas: HH:MM"
              />
            ) : null}
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Horário silencioso</AppText>
            <CheckboxRow
              testID="notifications-quiet-hours"
              checked={preferences.quietHoursEnabled}
              onChange={(value) => setPreferences((current) => ({ ...current, quietHoursEnabled: value }))}
              label="Silenciar som e vibração"
              description="Os lembretes continuam visíveis para não ocultar cuidados programados."
            />
            {preferences.quietHoursEnabled ? (
              <View style={styles.timeRow}>
                <View style={styles.flex}>
                  <TextField
                    label="Começa"
                    value={preferences.quietStartLocal}
                    onChangeText={(value) => setPreferences((current) => ({ ...current, quietStartLocal: value }))}
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                    placeholder="22:00"
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="Termina"
                    value={preferences.quietEndLocal}
                    onChangeText={(value) => setPreferences((current) => ({ ...current, quietEndLocal: value }))}
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                    placeholder="07:00"
                  />
                </View>
              </View>
            ) : null}
          </Surface>

          <PrimaryButton
            testID="notifications-settings-save"
            label="Salvar e revisar lembretes"
            loading={saving}
            onPress={() => void save()}
          />

          <Surface style={styles.notice}>
            <AppText variant="bodyStrong">Privacidade na tela bloqueada</AppText>
            <AppText muted>
              As notificações usam textos discretos e não exibem nomes de medicamentos, diagnósticos, emoções ou conteúdo do Diário.
            </AppText>
          </Surface>
          <AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl },
  intro: { marginTop: spacing.sm, marginBottom: spacing.xl },
  section: { gap: spacing.lg, marginBottom: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.warning },
  statusGranted: { backgroundColor: colors.success },
  flex: { flex: 1 },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  notice: { gap: spacing.sm, marginTop: spacing.md, backgroundColor: colors.sand },
  signature: { textAlign: 'center', marginVertical: spacing.xl },
});
