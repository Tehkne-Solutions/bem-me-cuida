import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { runDeviceDiagnostics } from '@/diagnostics/device-diagnostics';
import { formatDiagnosticReport, hasBlockingDiagnostic, type DiagnosticReport, type DiagnosticStatus } from '@/diagnostics/report';
import { colors, radius, spacing } from '@/theme/tokens';

const statusMeta: Record<DiagnosticStatus, { symbol: string; label: string; color: string }> = {
  ok: { symbol: '✓', label: 'OK', color: colors.primaryStrong },
  warning: { symbol: '!', label: 'Atenção', color: colors.warning },
  error: { symbol: '×', label: 'Erro', color: colors.danger },
};

export default function DiagnosticsScreen() {
  const { session } = useAuth();
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);

  const execute = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await runDeviceDiagnostics(session?.user.id ?? null));
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void execute();
  }, [execute]);

  async function shareReport() {
    if (!report) return;
    try {
      await Share.share({ message: formatDiagnosticReport(report), title: 'Diagnóstico técnico BemMeCuida' });
    } catch {
      Alert.alert('Não foi possível compartilhar', 'Tente novamente ou execute um novo diagnóstico.');
    }
  }

  const blocked = report ? hasBlockingDiagnostic(report) : false;

  return (
    <Screen>
      <Pressable testID="diagnostics-back" onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>

      <AppText variant="caption" muted style={styles.eyebrow}>HOMOLOGAÇÃO</AppText>
      <AppText variant="h1" testID="diagnostics-title">Diagnóstico do aparelho</AppText>
      <AppText muted style={styles.description}>Verifica apenas a infraestrutura técnica. Nenhum conteúdo emocional ou identificador pessoal entra no relatório.</AppText>

      {loading ? (
        <Surface style={styles.loading}>
          <ActivityIndicator color={colors.primaryStrong} />
          <AppText muted>Executando verificações locais…</AppText>
        </Surface>
      ) : null}

      {!loading && report ? (
        <>
          <Surface style={[styles.summary, blocked ? styles.summaryError : styles.summaryOk]}>
            <AppText variant="h2">{blocked ? 'Existe um bloqueio técnico' : 'A base técnica está pronta'}</AppText>
            <AppText muted>{blocked ? 'Corrija os itens em vermelho antes de aprovar a homologação.' : 'Avisos amarelos podem depender de conexão, sessão ou ambiente externo.'}</AppText>
          </Surface>

          <View style={styles.list}>
            {report.checks.map((check) => {
              const meta = statusMeta[check.status];
              return (
                <Surface key={check.id} style={styles.check}>
                  <View style={[styles.status, { borderColor: meta.color }]}>
                    <AppText variant="bodyStrong" style={{ color: meta.color }}>{meta.symbol}</AppText>
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{check.label}</AppText>
                    <AppText variant="caption" muted>{check.detail}</AppText>
                  </View>
                  <AppText variant="caption" style={{ color: meta.color }}>{meta.label}</AppText>
                </Surface>
              );
            })}
          </View>

          <PrimaryButton testID="diagnostics-rerun" label="Executar novamente" onPress={() => void execute()} />
          <SecondaryButton testID="diagnostics-share" label="Compartilhar relatório técnico" onPress={() => void shareReport()} />
          <AppText variant="caption" muted style={styles.generated}>Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')} · Tehkné Solutions</AppText>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl },
  description: { marginTop: spacing.sm, marginBottom: spacing.xl },
  loading: { alignItems: 'center', gap: spacing.md },
  summary: { gap: spacing.sm, marginBottom: spacing.md },
  summaryOk: { backgroundColor: colors.primarySoft },
  summaryError: { backgroundColor: colors.dangerSoft },
  list: { gap: spacing.sm, marginBottom: spacing.lg },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  status: { width: 34, height: 34, borderWidth: 2, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: spacing.xs },
  generated: { textAlign: 'center', marginVertical: spacing.xl },
});
