const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;

export const RC011_INFRASTRUCTURE_PATH = 'release/rc-0.11.0/infrastructure-readiness.json';
export const RC011_TEMPORARY_SECRETS = ['RC011_ADMIN_TOKEN', 'RC011_EXPO_TOKEN'];

const parseObject = (raw, label) => {
  let value;
  try {
    value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error(`${label} não contém JSON válido.`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} deve representar um objeto JSON.`);
  }
  return value;
};

export function validateCaptureRunId(value) {
  const normalized = String(value ?? '');
  if (!/^[1-9][0-9]{0,19}$/.test(normalized)) throw new Error('infrastructure_run_id inválido.');
  return normalized;
}

export function validateSourceCommit(value) {
  const normalized = String(value ?? '');
  if (!SHA_PATTERN.test(normalized)) throw new Error('capture_source_commit deve conter SHA de 40 caracteres.');
  return normalized;
}

export function validateCycleEvidenceUrl(value) {
  const normalized = String(value ?? '');
  if (!HTTPS_PATTERN.test(normalized)) throw new Error('cycle_evidence_url deve ser HTTPS.');
  return normalized;
}

export function validateEvidencePr(raw) {
  const pr = parseObject(raw, 'evidence_pr');
  const number = Number.parseInt(String(pr.number ?? ''), 10);
  if (!Number.isInteger(number) || number <= 0) throw new Error('PR de evidências sem número válido.');
  if (pr.state !== 'MERGED') throw new Error('PR de evidências precisa estar mesclado.');
  if (pr.isDraft === true) throw new Error('PR de evidências não pode permanecer em rascunho.');
  if (pr.baseRefName !== 'main') throw new Error('PR de evidências precisa ter base main.');

  const mergeCommit = String(pr.mergeCommit?.oid ?? '');
  if (!SHA_PATTERN.test(mergeCommit)) throw new Error('PR de evidências sem merge commit válido.');

  const files = Array.isArray(pr.files)
    ? pr.files.map((file) => String(file?.path ?? file?.filename ?? '')).filter(Boolean)
    : [];
  if (files.length !== 1 || files[0] !== RC011_INFRASTRUCTURE_PATH) {
    throw new Error(`PR de evidências deve alterar somente ${RC011_INFRASTRUCTURE_PATH}.`);
  }

  const url = String(pr.url ?? '');
  if (!HTTPS_PATTERN.test(url)) throw new Error('PR de evidências sem URL HTTPS válida.');

  return { number, url, mergeCommit, files };
}

export function validateRevocation(raw) {
  const value = parseObject(raw, 'revocation');
  if (value.confirmedAbsent !== true) throw new Error('Revogação dos secrets temporários não foi confirmada.');
  const names = Array.isArray(value.secretNames) ? [...value.secretNames].map(String).sort() : [];
  const expected = [...RC011_TEMPORARY_SECRETS].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error('Evidência de revogação não cobre os dois secrets temporários esperados.');
  }
  return { confirmedAbsent: true, secretNames: names };
}

export function buildTransitionReport({
  mode,
  captureRunId = null,
  sourceCommit = null,
  evidencePr = null,
  revocation = null,
  buildAuthorized = false,
}) {
  if (!['prepare-evidence', 'finalize-and-build'].includes(mode)) throw new Error('Modo de transição inválido.');

  const report = {
    schemaVersion: '1.0',
    release: '0.11.0-rc.1',
    mode,
    recommendation: mode === 'prepare-evidence' ? 'await-evidence-merge' : 'hold',
    captureRunId: captureRunId ? validateCaptureRunId(captureRunId) : null,
    sourceCommit: sourceCommit ? validateSourceCommit(sourceCommit) : null,
    evidencePr: evidencePr
      ? { number: evidencePr.number, url: evidencePr.url, mergeCommit: evidencePr.mergeCommit }
      : null,
    revocation: revocation
      ? { confirmedAbsent: revocation.confirmedAbsent, secretNames: [...revocation.secretNames] }
      : null,
    build: {
      validationAuthorized: buildAuthorized,
      androidAuthorized: buildAuthorized,
    },
    privacy: {
      containsSecretValues: false,
      containsVariableValues: false,
      containsPersonalData: false,
      containsClinicalData: false,
    },
    generatedBy: 'Tehkné Solutions',
  };

  if (mode === 'finalize-and-build') {
    if (!evidencePr) throw new Error('Finalização exige PR de evidências validado.');
    if (!revocation?.confirmedAbsent) throw new Error('Finalização exige revogação confirmada.');
    if (!buildAuthorized) throw new Error('Finalização exige autorização explícita do build.');
    report.recommendation = 'validate-and-build-android';
  }

  return report;
}
