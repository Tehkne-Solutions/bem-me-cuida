export type DiagnosticStatus = 'ok' | 'warning' | 'error';

export type DiagnosticItem = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
};

export type DiagnosticReport = {
  generatedAt: string;
  platform: string;
  checks: DiagnosticItem[];
};

const statusLabel: Record<DiagnosticStatus, string> = {
  ok: 'OK',
  warning: 'ATENÇÃO',
  error: 'ERRO',
};

export function formatDiagnosticReport(report: DiagnosticReport): string {
  const lines = [
    'BemMeCuida — diagnóstico técnico',
    'Tehkné Solutions',
    `Gerado em: ${report.generatedAt}`,
    `Plataforma: ${report.platform}`,
    '',
    ...report.checks.map((check) => `[${statusLabel[check.status]}] ${check.label}: ${check.detail}`),
    '',
    'O relatório não inclui e-mail, nome, textos emocionais, notas ou identificadores da conta.',
  ];
  return lines.join('\n');
}

export function hasBlockingDiagnostic(report: DiagnosticReport): boolean {
  return report.checks.some((check) => check.status === 'error');
}
