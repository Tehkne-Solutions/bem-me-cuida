import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { getAppMetadata } from '@/config/app-metadata';
import {
  getBetaTesterEnrollment,
  listBetaFeedback,
  setBetaTesterEnrollment,
  submitBetaFeedback,
  type BetaFeedback,
  type BetaFeedbackCategory,
  type BetaFeedbackImpact,
  type BetaTesterEnrollment,
} from '@/data/beta-feedback-repository';
import {
  clearTechnicalEvents,
  countTechnicalEvents,
  listRecentTechnicalEvents,
} from '@/data/technical-event-repository';
import { runDeviceDiagnostics } from '@/diagnostics/device-diagnostics';
import { useTechnicalObservability } from '@/observability/TechnicalObservabilityProvider';
import { colors, spacing } from '@/theme/tokens';

const categories: Array<{ value: BetaFeedbackCategory; label: string }> = [
  { value: 'bug', label: 'Erro' },
  { value: 'usability', label: 'Usabilidade' },
  { value: 'accessibility', label: 'Acessibilidade' },
  { value: 'performance', label: 'Desempenho' },
  { value: 'idea', label: 'Ideia' },
  { value: 'other', label: 'Outro' },
];

const impacts: Array<{ value: BetaFeedbackImpact; label: string }> = [
  { value: 'low', label: 'Baixo' },
  { value: 'medium', label: 'Médio' },
  { value: 'high', label: 'Alto' },
  { value: 'blocking', label: 'Bloqueia o uso' },
];

const statusLabels: Record<BetaFeedback['status'], string> = {
  received: 'Recebido',
  triaged: 'Em análise',
  planned: 'Planejado',
  resolved: 'Resolvido',
  closed: 'Encerrado',
};

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function BetaCenterScreen() {
  const { session } = useAuth();
  const { preferences, updatePreferences, record } = useTechnicalObservability();
  const metadata = useMemo(() => getAppMetadata(), []);
  const [category, setCategory] = useState<BetaFeedbackCategory>('bug');
  const [impact, setImpact] = useState<BetaFeedbackImpact>('medium');
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState('');
  const [confirmedSafeText, setConfirmedSafeText] = useState(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(preferences.includeDiagnosticsByDefault);
  const [includeEvents, setIncludeEvents] = useState(preferences.includeTechnicalEventsByDefault);
  const [feedback, setFeedback] = useState<BetaFeedback[]>([]);
  const [enrollment, setEnrollment] = useState<BetaTesterEnrollment | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [nextFeedback, nextEnrollment, nextEventCount] = await Promise.all([
        listBetaFeedback(session.user.id),
        getBetaTesterEnrollment(session.user.id),
        countTechnicalEvents(session.user.id),
      ]);
      setFeedback(nextFeedback);
      setEnrollment(nextEnrollment);
      setEventCount(nextEventCount);
    } catch {
      setFeedback([]);
      setEnrollment(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function toggleTechnicalLog(value: boolean) {
    const next = { ...preferences, technicalLogEnabled: value };
    try {
      await updatePreferences(next);
      if (!value) setIncludeEvents(false);
      Alert.alert(
        value ? 'Log técnico ativado' : 'Log técnico pausado',
        value
          ? 'Somente eventos operacionais pré-definidos serão mantidos localmente.'
          : 'Nenhum novo evento será registrado. Os eventos existentes continuam no aparelho até você apagá-los.',
      );
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente novamente.');
    }
  }

  async function eraseTechnicalLog() {
    if (!session) return;
    try {
      await clearTechnicalEvents(session.user.id);
      setEventCount(0);
      Alert.alert('Log técnico apagado', 'Os eventos locais foram removidos deste aparelho.');
    } catch {
      Alert.alert('Não foi possível apagar', 'Tente novamente.');
    }
  }

  async function changeEnrollment(status: 'active' | 'paused') {
    if (!session) return;
    setSavingEnrollment(true);
    try {
      await setBetaTesterEnrollment({
        userId: session.user.id,
        status,
        appVersion: metadata.releaseLabel,
        appVariant: metadata.variant,
        platform: metadata.platform,
      });
      await load();
      Alert.alert(
        status === 'active' ? 'Participação confirmada' : 'Participação pausada',
        status === 'active'
          ? 'Esta instalação está registrada para a beta fechada.'
          : 'Você poderá reativar a participação quando desejar.',
      );
    } catch {
      Alert.alert('Não foi possível atualizar', 'Confirme sua conexão e tente novamente.');
    } finally {
      setSavingEnrollment(false);
    }
  }

  async function submit() {
    if (!session) return;
    if (message.trim().length < 20) {
      Alert.alert('Descreva melhor', 'Use pelo menos 20 caracteres para que o time consiga investigar.');
      return;
    }
    if (!confirmedSafeText) {
      Alert.alert('Confirmação necessária', 'Confirme que o texto não contém informações emocionais, clínicas ou de terceiros.');
      return;
    }

    setSubmitting(true);
    try {
      const diagnostics = includeDiagnostics ? await runDeviceDiagnostics(session.user.id) : null;
      const technicalEvents = includeEvents && preferences.technicalLogEnabled
        ? await listRecentTechnicalEvents(session.user.id, 40)
        : [];
      await submitBetaFeedback({
        userId: session.user.id,
        category,
        impact,
        message,
        reproductionSteps: steps.trim() || null,
        diagnostics,
        technicalEvents,
        appVersion: metadata.releaseLabel,
        appVariant: metadata.variant,
        platform: metadata.platform,
      });
      await record('feedback_submitted', {
        diagnosticsIncluded: diagnostics !== null,
        technicalEventCount: technicalEvents.length,
      });
      setMessage('');
      setSteps('');
      setConfirmedSafeText(false);
      await load();
      Alert.alert('Feedback enviado', 'Obrigado. O status poderá ser acompanhado nesta central.');
    } catch {
      await record('feedback_failed');
      Alert.alert('Não foi possível enviar', 'O texto não foi salvo na nuvem. Confirme a conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Pressable testID="beta-center-back" onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>

      <AppText variant="caption" muted style={styles.eyebrow}>BETA FECHADA</AppText>
      <AppText variant="h1" testID="beta-center-title">Central da versão de teste</AppText>
      <AppText muted style={styles.intro}>
        Confirme sua participação, envie feedback e escolha exatamente quais dados técnicos podem acompanhar cada relato.
      </AppText>

      <Surface style={styles.section}>
        <AppText variant="h2">Versão instalada</AppText>
        <View style={styles.metadataRow}><AppText variant="bodyStrong">Release</AppText><AppText>{metadata.releaseLabel}</AppText></View>
        <View style={styles.metadataRow}><AppText variant="bodyStrong">Canal</AppText><AppText>{metadata.variant}</AppText></View>
        <View style={styles.metadataRow}><AppText variant="bodyStrong">Plataforma</AppText><AppText>{metadata.platform}</AppText></View>
        <SecondaryButton label="Abrir diagnóstico do aparelho" onPress={() => router.push('/diagnostics')} />
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Participação</AppText>
        <AppText muted>
          {enrollment?.status === 'active'
            ? `Ativa desde ${formattedDate(enrollment.enrolledAt)}.`
            : enrollment?.status === 'paused'
              ? 'Pausada nesta conta.'
              : 'Esta conta ainda não confirmou participação nesta instalação.'}
        </AppText>
        <PrimaryButton
          testID="beta-enrollment-toggle"
          label={enrollment?.status === 'active' ? 'Pausar participação' : 'Confirmar participação'}
          loading={savingEnrollment}
          onPress={() => void changeEnrollment(enrollment?.status === 'active' ? 'paused' : 'active')}
        />
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Observabilidade local</AppText>
        <CheckboxRow
          testID="beta-technical-log"
          checked={preferences.technicalLogEnabled}
          onChange={(value) => void toggleTechnicalLog(value)}
          label="Registrar eventos técnicos neste aparelho"
          description="Desligado por padrão. Registra somente abertura, segundo plano, retorno, diagnóstico e envio de feedback. Não aceita texto emocional."
        />
        <AppText variant="caption" muted>{eventCount} evento(s) técnico(s) armazenado(s), limitado(s) aos 200 mais recentes.</AppText>
        {eventCount > 0 ? <SecondaryButton label="Apagar log técnico local" onPress={() => void eraseTechnicalLog()} /> : null}
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Enviar feedback</AppText>
        <AppText variant="bodyStrong">Categoria</AppText>
        <View style={styles.chips}>
          {categories.map((option) => (
            <ChoiceChip key={option.value} label={option.label} selected={category === option.value} onPress={() => setCategory(option.value)} />
          ))}
        </View>
        <AppText variant="bodyStrong">Impacto</AppText>
        <View style={styles.chips}>
          {impacts.map((option) => (
            <ChoiceChip key={option.value} label={option.label} selected={impact === option.value} onPress={() => setImpact(option.value)} />
          ))}
        </View>
        <TextField
          testID="beta-feedback-message"
          label="O que aconteceu ou pode melhorar?"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={2000}
          style={styles.multiline}
          hint={`${message.trim().length}/2000 caracteres. Não inclua diagnóstico, medicação, relato emocional ou dados de terceiros.`}
        />
        <TextField
          testID="beta-feedback-steps"
          label="Passos para reproduzir, sem dados sensíveis"
          value={steps}
          onChangeText={setSteps}
          multiline
          maxLength={2000}
          style={styles.multiline}
        />
        <CheckboxRow
          checked={includeDiagnostics}
          onChange={setIncludeDiagnostics}
          label="Anexar diagnóstico técnico"
          description="Inclui plataforma, estado do banco, rede, notificações e sincronização. Não inclui nome, e-mail ou textos pessoais."
        />
        <CheckboxRow
          checked={includeEvents}
          onChange={setIncludeEvents}
          label="Anexar até 40 eventos técnicos recentes"
          description={preferences.technicalLogEnabled ? 'Inclui somente eventos pré-definidos e contagens numéricas.' : 'Ative o log técnico local para usar esta opção.'}
        />
        <CheckboxRow
          testID="beta-feedback-safe-confirmation"
          checked={confirmedSafeText}
          onChange={setConfirmedSafeText}
          label="Revisei o texto e removi dados sensíveis"
          description="Confirme que não há informações emocionais, clínicas, de saúde ou de outras pessoas."
        />
        <PrimaryButton
          testID="beta-feedback-submit"
          label="Enviar feedback para a Tehkné Solutions"
          loading={submitting}
          disabled={message.trim().length < 20 || !confirmedSafeText || (includeEvents && !preferences.technicalLogEnabled)}
          onPress={() => void submit()}
        />
      </Surface>

      <Surface style={styles.section}>
        <AppText variant="h2">Meus relatos</AppText>
        {loading ? <AppText muted>Atualizando…</AppText> : null}
        {!loading && feedback.length === 0 ? <AppText muted>Nenhum feedback enviado por esta conta.</AppText> : null}
        {feedback.map((item) => (
          <View key={item.id} style={styles.feedbackRow}>
            <View style={styles.feedbackCopy}>
              <AppText variant="bodyStrong" numberOfLines={2}>{item.message}</AppText>
              <AppText variant="caption" muted>{formattedDate(item.createdAt)} · {item.category} · impacto {item.impact}</AppText>
            </View>
            <AppText variant="caption" style={styles.status}>{statusLabels[item.status]}</AppText>
          </View>
        ))}
      </Surface>

      <AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl },
  intro: { marginTop: spacing.sm, marginBottom: spacing.xl },
  section: { gap: spacing.lg, marginBottom: spacing.md },
  metadataRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  feedbackRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  feedbackCopy: { flex: 1, gap: spacing.xs },
  status: { color: colors.primaryStrong },
  signature: { textAlign: 'center', marginVertical: spacing.xl },
});
