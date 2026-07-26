import * as LocalAuthentication from 'expo-local-authentication';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import {
  cancelAccountDeletion,
  getAccountDeletionRequest,
  listConsentState,
  requestAccountDeletion,
  setOptionalConsent,
  updateProfile,
  type AccountDeletionRequest,
  type ConsentState,
} from '@/data/account-repository';
import { isReleaseOperator } from '@/data/release-operations-repository';
import {
  defaultAppSecurityPreferences,
  readAppSecurityPreferences,
  saveAppSecurityPreferences,
  type AppSecurityPreferences,
  type LockAfterSeconds,
} from '@/security/account-preferences';
import { buildAccountExport, formatAccountExport } from '@/services/account-export';
import { colors, spacing } from '@/theme/tokens';

const emptyConsents: ConsentState = {
  terms: false,
  privacy: false,
  health_data: false,
  analytics: false,
  ai_processing: false,
};

const lockOptions: Array<{ value: LockAfterSeconds; label: string }> = [
  { value: 0, label: 'Imediatamente' },
  { value: 30, label: '30 s' },
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
];

function deletionDate(value: AccountDeletionRequest): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(value.requestedAt));
}

export default function SettingsScreen() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const operatorAccess = isReleaseOperator(session);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [consents, setConsents] = useState<ConsentState>(emptyConsents);
  const [security, setSecurity] = useState<AppSecurityPreferences>(defaultAppSecurityPreferences);
  const [deletion, setDeletion] = useState<AccountDeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [nextConsents, nextSecurity, nextDeletion] = await Promise.all([
        listConsentState(session.user.id),
        readAppSecurityPreferences(session.user.id),
        getAccountDeletionRequest(session.user.id),
      ]);
      setConsents(nextConsents);
      setSecurity(nextSecurity);
      setDeletion(nextDeletion);
      setDisplayName(profile?.displayName ?? '');
    } finally {
      setLoading(false);
    }
  }, [profile?.displayName, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function saveName() {
    if (!session) return;
    setSavingName(true);
    try {
      await updateProfile(session.user.id, displayName);
      await refreshProfile();
      Alert.alert('Perfil atualizado', 'O nome de exibição foi salvo.');
    } catch {
      Alert.alert('Não foi possível salvar', 'Use entre 2 e 80 caracteres e tente novamente.');
    } finally {
      setSavingName(false);
    }
  }

  async function toggleConsent(type: 'analytics' | 'ai_processing', value: boolean) {
    if (!session) return;
    try {
      await setOptionalConsent(session.user.id, type, value);
      setConsents((current) => ({ ...current, [type]: value }));
    } catch {
      Alert.alert('Não foi possível atualizar', 'A preferência será mantida como estava.');
    }
  }

  async function toggleBiometric(value: boolean) {
    if (!session) return;
    if (!value) {
      const next = { ...security, biometricEnabled: false };
      await saveAppSecurityPreferences(session.user.id, next);
      setSecurity(next);
      return;
    }

    try {
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hardware || !enrolled) {
        Alert.alert('Biometria indisponível', 'Cadastre uma biometria ou proteção de tela nas configurações do aparelho.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ativar bloqueio do BemMeCuida',
        promptDescription: 'Confirme sua identidade antes de ativar esta proteção.',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar código do aparelho',
        biometricsSecurityLevel: 'strong',
      });
      if (!result.success) return;
      const next = { ...security, biometricEnabled: true };
      await saveAppSecurityPreferences(session.user.id, next);
      setSecurity(next);
      Alert.alert('Proteção ativada', 'O aplicativo será bloqueado após o intervalo escolhido.');
    } catch {
      Alert.alert('Não foi possível ativar', 'Tente novamente usando um development build no aparelho.');
    }
  }

  async function changeLockInterval(value: LockAfterSeconds) {
    if (!session) return;
    const next = { ...security, lockAfterSeconds: value };
    await saveAppSecurityPreferences(session.user.id, next);
    setSecurity(next);
  }

  async function exportData() {
    if (!session) return;
    setExporting(true);
    try {
      const value = await buildAccountExport({
        userId: session.user.id,
        email: session.user.email ?? null,
        profile,
        consents,
      });
      await Share.share({
        title: 'Exportação de dados BemMeCuida',
        message: formatAccountExport(value),
      });
    } catch {
      Alert.alert('Não foi possível exportar', 'Confirme que o banco local está disponível e tente novamente.');
    } finally {
      setExporting(false);
    }
  }

  function confirmDeletionRequest() {
    if (!session) return;
    Alert.alert(
      'Solicitar exclusão da conta?',
      'A solicitação será registrada para processamento seguro. Exporte seus dados antes. A conta não será apagada imediatamente pelo aplicativo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar exclusão',
          style: 'destructive',
          onPress: () => {
            void requestAccountDeletion(session.user.id)
              .then(load)
              .catch(() => Alert.alert('Não foi possível solicitar', 'Tente novamente.'));
          },
        },
      ],
    );
  }

  async function cancelDeletion() {
    if (!session) return;
    try {
      await cancelAccountDeletion(session.user.id);
      await load();
    } catch {
      Alert.alert('Não foi possível cancelar', 'Tente novamente.');
    }
  }

  return (
    <Screen>
      <Pressable testID="settings-back" onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>

      <AppText variant="caption" muted style={styles.eyebrow}>CONTA E PRIVACIDADE</AppText>
      <AppText variant="h1" testID="settings-title">Seu espaço, suas escolhas</AppText>
      <AppText muted style={styles.intro}>Gerencie identidade, consentimentos, proteção do aparelho e seus direitos sobre os dados.</AppText>

      {loading ? <Surface><AppText muted>Carregando preferências…</AppText></Surface> : (
        <>
          <Surface style={styles.section}>
            <AppText variant="h2">Perfil</AppText>
            <AppText variant="caption" muted>{session?.user.email ?? 'Conta autenticada'}</AppText>
            <TextField
              testID="settings-display-name"
              label="Como deseja ser chamado"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={80}
            />
            <PrimaryButton label="Salvar perfil" loading={savingName} disabled={displayName.trim().length < 2} onPress={() => void saveName()} />
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Consentimentos</AppText>
            <AppText muted>Termos, privacidade e tratamento de dados de saúde são necessários para manter a conta ativa.</AppText>
            <View style={styles.requiredRow}><AppText variant="bodyStrong">Termos de Uso</AppText><AppText variant="caption" style={styles.active}>Ativo</AppText></View>
            <View style={styles.requiredRow}><AppText variant="bodyStrong">Política de Privacidade</AppText><AppText variant="caption" style={styles.active}>Ativo</AppText></View>
            <View style={styles.requiredRow}><AppText variant="bodyStrong">Dados de saúde</AppText><AppText variant="caption" style={styles.active}>Ativo</AppText></View>
            <CheckboxRow checked={consents.analytics} onChange={(value) => void toggleConsent('analytics', value)} label="Métricas opcionais" description="Permite métricas técnicas sem conteúdo emocional." />
            <CheckboxRow checked={consents.ai_processing} onChange={(value) => void toggleConsent('ai_processing', value)} label="Processamento opcional por IA" description="Permanece desligado por padrão. Os recursos atuais não enviam textos do Diário para IA." />
            <View style={styles.buttonGroup}>
              <SecondaryButton label="Ler Política de Privacidade" onPress={() => router.push('/legal/privacy')} />
              <SecondaryButton label="Ler Termos de Uso" onPress={() => router.push('/legal/terms')} />
            </View>
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Bloqueio do aplicativo</AppText>
            <CheckboxRow
              checked={security.biometricEnabled}
              onChange={(value) => void toggleBiometric(value)}
              label="Proteger com biometria ou código do aparelho"
              description="Requer development build para Face ID no iOS."
            />
            <AppText variant="bodyStrong">Bloquear depois de</AppText>
            <View style={styles.chips}>
              {lockOptions.map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={option.label}
                  selected={security.lockAfterSeconds === option.value}
                  onPress={() => void changeLockInterval(option.value)}
                />
              ))}
            </View>
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Experiência do aplicativo</AppText>
            <AppText muted>Controle lembretes, leitura, contraste, movimento e a operação da versão de teste.</AppText>
            <View style={styles.buttonGroup}>
              <SecondaryButton testID="settings-open-notifications" label="Notificações e horário silencioso" onPress={() => router.push('/notifications-settings')} />
              <SecondaryButton testID="settings-open-accessibility" label="Acessibilidade" onPress={() => router.push('/accessibility-settings')} />
              <SecondaryButton testID="settings-open-beta" label="Central da beta e feedback" onPress={() => router.push('/beta-center')} />
              {operatorAccess ? (
                <>
                  <SecondaryButton testID="settings-open-operator-console" label="Console operacional de releases" onPress={() => router.push('/operator-console')} />
                  <SecondaryButton testID="settings-open-production-console" label="Produção, rollout e incidentes" onPress={() => router.push('/production-console')} />
                  <SecondaryButton testID="settings-open-maintenance-console" label="Sustentação, hotfix e OTA" onPress={() => router.push('/maintenance-console')} />
                </>
              ) : null}
            </View>
          </Surface>

          <Surface style={styles.section}>
            <AppText variant="h2">Seus dados</AppText>
            <AppText muted>A exportação é preparada localmente e pode conter informações emocionais e de saúde. Revise o destino antes de compartilhar.</AppText>
            <PrimaryButton testID="settings-export" label="Exportar todos os meus dados" loading={exporting} onPress={() => void exportData()} />
          </Surface>

          <Surface style={[styles.section, styles.dangerSection]}>
            <AppText variant="h2">Exclusão da conta</AppText>
            {deletion?.status === 'requested' ? (
              <>
                <AppText>Solicitação registrada em {deletionDate(deletion)}.</AppText>
                <AppText muted>Ela será processada de forma controlada. Você pode cancelar enquanto o status estiver pendente.</AppText>
                <SecondaryButton label="Cancelar solicitação" onPress={() => void cancelDeletion()} />
              </>
            ) : (
              <>
                <AppText muted>Exporte seus dados antes. A solicitação não apaga imediatamente os registros do aparelho ou da nuvem.</AppText>
                <PrimaryButton tone="danger" label="Solicitar exclusão da conta" onPress={confirmDeletionRequest} />
              </>
            )}
          </Surface>

          <SecondaryButton testID="settings-sign-out" label="Sair desta conta" onPress={() => void signOut()} />
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
  requiredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  active: { color: colors.primaryStrong },
  buttonGroup: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dangerSection: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  signature: { textAlign: 'center', marginVertical: spacing.xl },
});
