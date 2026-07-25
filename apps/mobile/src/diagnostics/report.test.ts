import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDiagnosticReport, hasBlockingDiagnostic, type DiagnosticReport } from './report';

const report: DiagnosticReport = {
  generatedAt: '2026-07-24T12:00:00.000Z',
  platform: 'android-35',
  checks: [
    { id: 'database', label: 'Banco local', status: 'ok', detail: 'Schema 6 aplicado.' },
    { id: 'network', label: 'Conectividade', status: 'warning', detail: 'Sem internet no momento.' },
  ],
};

test('relatório técnico não adiciona campos pessoais', () => {
  const text = formatDiagnosticReport(report);
  assert.match(text, /Banco local/);
  assert.match(text, /não inclui e-mail/);
  assert.doesNotMatch(text, /user_id|access_token|refresh_token/i);
});

test('aviso não bloqueia homologação', () => {
  assert.equal(hasBlockingDiagnostic(report), false);
});

test('erro bloqueia homologação', () => {
  assert.equal(hasBlockingDiagnostic({
    ...report,
    checks: [...report.checks, { id: 'secure-store', label: 'Armazenamento seguro', status: 'error', detail: 'Falhou.' }],
  }), true);
});
