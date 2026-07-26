import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const text = (name) => String(process.env[name] ?? '').trim();
const matrixPath = text('RC011_DEVICE_MATRIX_PATH') || 'release/rc-0.11.0/device-matrix.json';
const testsPath = text('RC011_TEST_RESULTS_PATH') || 'release/rc-0.11.0/test-results.json';
const matrix = JSON.parse(readFileSync(join(root, matrixPath), 'utf8'));
const tests = JSON.parse(readFileSync(join(root, testsPath), 'utf8'));

function summarize(records) {
  return records.reduce((result, record) => {
    result.total += 1;
    if (record.required) result.required += 1;
    result[record.status] = (result[record.status] ?? 0) + 1;
    if (record.required && record.status !== 'passed') result.requiredPending += 1;
    return result;
  }, { total: 0, required: 0, requiredPending: 0, passed: 0, failed: 0, blocked: 0, pending: 0, waived: 0 });
}

const devices = summarize(matrix.profiles ?? []);
const suites = summarize(tests.suites ?? []);
const ready = devices.requiredPending === 0 && suites.requiredPending === 0;
const report = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  release: '0.11.0-rc.1',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  readyForPromotion: ready,
  devices,
  suites,
  privacy: {
    containsPersonalData: false,
    containsClinicalData: false,
    usesSyntheticAccounts: true,
  },
};

const jsonOutput = text('RC011_VALIDATION_REPORT_OUTPUT') || 'artifacts/bemmecuida-0.11.0-rc.1-validation.json';
const markdownOutput = text('RC011_VALIDATION_REPORT_MARKDOWN_OUTPUT') || 'artifacts/bemmecuida-0.11.0-rc.1-validation.md';
const jsonTarget = resolve(root, jsonOutput);
const markdownTarget = resolve(root, markdownOutput);
mkdirSync(dirname(jsonTarget), { recursive: true });
mkdirSync(dirname(markdownTarget), { recursive: true });
writeFileSync(jsonTarget, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownTarget, `# BemMeCuida 0.11.0-rc.1 — Homologação\n\n- Situação: **${ready ? 'pronta para promoção' : 'pendente'}**\n- Perfis obrigatórios pendentes: **${devices.requiredPending}**\n- Suítes obrigatórias pendentes: **${suites.requiredPending}**\n- Perfis aprovados: **${devices.passed}/${devices.total}**\n- Suítes aprovadas: **${suites.passed}/${suites.total}**\n\nO relatório usa apenas resultados técnicos agregados e contas sintéticas. Não contém dados pessoais ou clínicos.\n\n**Tehkné Solutions**\n`, 'utf8');
console.log(`Relatório JSON salvo em ${jsonTarget}`);
console.log(`Relatório Markdown salvo em ${markdownTarget}`);
