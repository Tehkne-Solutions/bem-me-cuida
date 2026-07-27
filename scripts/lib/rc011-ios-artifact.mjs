const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const lower = (value) => String(value ?? '').toLowerCase();

function buildsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.builds)) return payload.builds;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error('Resposta do EAS não contém uma lista de builds.');
}

function normalizeBuild(build) {
  const profile = typeof build?.buildProfile === 'string' ? build.buildProfile : build?.buildProfile?.name ?? build?.profile ?? '';
  const commit = build?.gitCommitHash ?? build?.metadata?.gitCommitHash ?? build?.metadata?.sourceCommit ?? '';
  return {
    id: String(build?.id ?? ''), platform: lower(build?.platform), status: lower(build?.status),
    appVersion: String(build?.appVersion ?? ''), appBuildVersion: String(build?.appBuildVersion ?? build?.buildNumber ?? ''),
    appIdentifier: String(build?.appIdentifier ?? ''), buildProfile: String(profile), gitCommitHash: String(commit),
    createdAt: build?.createdAt ?? null, completedAt: build?.completedAt ?? build?.updatedAt ?? null,
  };
}

function rejectionReason(build, sourceCommit) {
  if (!UUID_PATTERN.test(build.id)) return 'id-invalido';
  if (build.platform !== 'ios') return 'plataforma-divergente';
  if (build.status !== 'finished') return 'status-nao-concluido';
  if (build.appVersion !== '0.11.0') return 'versao-divergente';
  if (build.buildProfile !== 'rc011') return 'perfil-divergente';
  if (lower(build.gitCommitHash) !== lower(sourceCommit)) return 'commit-divergente';
  if (build.appIdentifier && build.appIdentifier !== 'com.tehknesolutions.bemmecuida.rc011') return 'bundle-divergente';
  return null;
}

export function discoverIosBuilds(payload, sourceCommit) {
  if (!SHA_PATTERN.test(sourceCommit ?? '')) throw new Error('O commit de origem deve ter 40 caracteres hexadecimais.');
  const candidates = [];
  const rejected = [];
  for (const build of buildsFromPayload(payload).map(normalizeBuild)) {
    const reason = rejectionReason(build, sourceCommit);
    if (reason) rejected.push({ id: build.id || null, reason }); else candidates.push(build);
  }
  candidates.sort((a, b) => (Date.parse(b.completedAt ?? b.createdAt ?? 0) || 0) - (Date.parse(a.completedAt ?? a.createdAt ?? 0) || 0));
  return {
    release: '0.11.0-rc.1', platform: 'ios', sourceCommit: lower(sourceCommit),
    status: candidates.length === 0 ? 'not-found' : candidates.length === 1 ? 'unique' : 'ambiguous',
    candidates, rejected,
    privacy: { containsPersonalData: false, containsClinicalData: false, containsSecrets: false },
    generatedBy: 'Tehkné Solutions',
  };
}

export function selectIosBuild(payload, { sourceCommit, buildId = '' }) {
  const discovery = discoverIosBuilds(payload, sourceCommit);
  let selected;
  if (buildId) {
    if (!UUID_PATTERN.test(buildId)) throw new Error('Build ID explícito inválido.');
    selected = discovery.candidates.find((item) => lower(item.id) === lower(buildId));
    if (!selected) throw new Error('O build ID explícito não corresponde aos filtros seguros da candidata.');
  } else {
    if (discovery.candidates.length === 0) throw new Error('Nenhum build iOS concluído corresponde à candidata e ao commit.');
    if (discovery.candidates.length > 1) throw new Error('Mais de um build iOS corresponde aos filtros. Informe um build ID explícito.');
    [selected] = discovery.candidates;
  }
  return { ...discovery, status: 'selected', selected };
}

export function createIosHomologationPlan({ builds, deviceMatrix, testResults, evidenceUrl }) {
  const ios = builds?.platforms?.ios;
  if (builds?.release !== '0.11.0-rc.1' || ios?.status !== 'captured') throw new Error('O plano físico exige um build iOS capturado.');
  if (!UUID_PATTERN.test(ios.buildId ?? '')) throw new Error('Build ID iOS inválido.');
  if (!SHA256_PATTERN.test(ios.artifactSha256 ?? '')) throw new Error('SHA-256 iOS inválido.');
  if (!String(ios.artifactUrl ?? '').startsWith('https://')) throw new Error('Artefato iOS precisa usar HTTPS.');
  if (!String(evidenceUrl ?? '').startsWith('https://')) throw new Error('A evidência da captura deve usar HTTPS.');

  const devices = (deviceMatrix?.profiles ?? []).filter((item) => item.platform === 'ios').map((item) => ({
    id: item.id, class: item.class, formFactor: item.formFactor, memoryClass: item.memoryClass,
    osRange: item.osRange, required: item.required === true, status: 'pending', evidenceUrl: null,
  }));
  const suites = (testResults?.suites ?? []).map((item) => ({
    id: item.id, name: item.name, required: item.required === true,
    requiredPlatforms: Array.isArray(item.requiredPlatforms) && item.requiredPlatforms.length ? item.requiredPlatforms : ['android', 'ios'],
    status: 'pending', evidenceUrl: null,
  }));

  return {
    schemaVersion: '1.0', release: '0.11.0-rc.1', platform: 'ios', status: 'pending-physical-validation',
    sourceCommit: builds.sourceCommit,
    build: { buildId: ios.buildId, buildNumber: ios.buildNumber, artifactSha256: ios.artifactSha256, artifactSizeBytes: ios.artifactSizeBytes ?? null, evidenceUrl },
    devices, suites, sessions: [],
    summary: {
      requiredDevices: devices.filter((item) => item.required).length, passedRequiredDevices: 0,
      requiredSuites: suites.filter((item) => item.required).length, passedRequiredSuites: 0, failedOrBlockedRequiredItems: 0,
    },
    privacy: { containsPersonalData: false, containsClinicalData: false, usesSyntheticAccounts: true },
    controls: { automaticApproval: false, requiresOperatorReview: true },
    generatedAt: new Date().toISOString(), generatedBy: 'Tehkné Solutions',
  };
}

export { UUID_PATTERN, SHA_PATTERN, SHA256_PATTERN };
