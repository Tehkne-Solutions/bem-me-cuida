import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const text = (name) => String(process.env[name] ?? '').trim();
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const matrix = readJson(text('RC011_DEVICE_MATRIX_PATH') || 'release/rc-0.11.0/device-matrix.json');
const tests = readJson(text('RC011_TEST_RESULTS_PATH') || 'release/rc-0.11.0/test-results.json');
const map = readJson('release/rc-0.11.0/gate-map.json');
const suiteById = new Map((tests.suites ?? []).map((item) => [item.id, item]));

function normalizeStatus(records) {
  if (!records.length) return 'pending';
  if (records.some((item) => item.status === 'failed' || item.status === 'blocked')) return 'failed';
  if (records.every((item) => item.status === 'passed' || item.status === 'waived')) return 'passed';
  return 'pending';
}

const requiredDevices = (matrix.profiles ?? []).filter((item) => item.required);
const gates = (map.gates ?? []).map((gate) => {
  const sources = gate.sourceType === 'device-matrix'
    ? requiredDevices
    : gate.sourceIds.map((id) => suiteById.get(id)).filter(Boolean);
  const status = normalizeStatus(sources);
  const evidenceUrls = [...new Set(sources.map((item) => item.evidenceUrl).filter((url) => String(url).startsWith('https://')))];
  return {
    gateKey: gate.gateKey,
    required: Boolean(gate.required),
    recommendedStatus: status,
    evidence: evidenceUrls,
    sourceCount: sources.length,
    approvedSourceCount: sources.filter((item) => item.status === 'passed' || item.status === 'waived').length,
  };
});

const payload = {
  schemaVersion: '1.0',
  release: '0.11.0-rc.1',
  cycleVersion: '0.11.0',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  ready: gates.filter((gate) => gate.required).every((gate) => gate.recommendedStatus === 'passed'),
  gates,
  controls: {
    automaticMutation: false,
    requiresOperatorReview: true,
    containsPersonalData: false,
    containsClinicalData: false,
  },
};

const output = text('RC011_GATE_PAYLOAD_OUTPUT') || 'artifacts/bemmecuida-0.11.0-rc.1-gates.json';
const target = resolve(root, output);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Payload de gates salvo em ${target}`);
