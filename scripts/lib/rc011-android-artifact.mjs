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

function profileName(build) {
  if (typeof build?.buildProfile === 'string') return build.buildProfile;
  return build?.buildProfile?.name ?? build?.profile ?? '';
}

function commitHash(build) {
  return build?.gitCommitHash ?? build?.metadata?.gitCommitHash ?? build?.metadata?.sourceCommit ?? '';
}

function normalizeBuild(build) {
  return {
    id: build?.id ?? '',
    platform: lower(build?.platform),
    status: lower(build?.status),
    appVersion: String(build?.appVersion ?? ''),
    appBuildVersion: String(build?.appBuildVersion ?? build?.versionCode ?? ''),
    appIdentifier: String(build?.appIdentifier ?? ''),
    buildProfile: String(profileName(build)),
    gitCommitHash: String(commitHash(build)),
    createdAt: build?.createdAt ?? null,
    completedAt: build?.completedAt ?? build?.updatedAt ?? null,
  };
}

function rejectionReason(build, sourceCommit) {
  if (!UUID_PATTERN.test(build.id)) return 'id-invalido';
  if (build.platform !== 'android') return 'plataforma-divergente';
  if (build.status !== 'finished') return 'status-nao-concluido';
  if (build.appVersion !== '0.11.0') return 'versao-divergente';
  if (build.buildProfile !== 'rc011') return 'perfil-divergente';
  if (lower(build.gitCommitHash) !== lower(sourceCommit)) return 'commit-divergente';
  if (build.appIdentifier && build.appIdentifier !== 'com.tehknesolutions.bemmecuida.rc011') return 'package-divergente';
  return null;
}

export function discoverAndroidBuilds(payload, sourceCommit) {
  if (!SHA_PATTERN.test(sourceCommit ?? '')) throw new Error('O commit de origem deve ter 40 caracteres hexadecimais.');

  const normalized = buildsFromPayload(payload).map(normalizeBuild);
  const candidates = [];
  const rejected = [];

  for (const build of normalized) {
    const reason = rejectionReason(build, sourceCommit);
    if (reason) rejected.push({ id: build.id || null, reason });
    else candidates.push(build);
  }

  candidates.sort((left, right) => {
    const leftTime = Date.parse(left.completedAt ?? left.createdAt ?? 0) || 0;
    const rightTime = Date.parse(right.completedAt ?? right.createdAt ?? 0) || 0;
    return rightTime - leftTime;
  });

  return {
    release: '0.11.0-rc.1',
    platform: 'android',
    sourceCommit: sourceCommit.toLowerCase(),
    status: candidates.length === 0 ? 'not-found' : candidates.length === 1 ? 'unique' : 'ambiguous',
    candidates,
    rejected,
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsSecrets: false,
    },
    generatedBy: 'Tehkné Solutions',
  };
}

export function selectAndroidBuild(payload, { sourceCommit, buildId = '' }) {
  const discovery = discoverAndroidBuilds(payload, sourceCommit);
  let selected;

  if (buildId) {
    if (!UUID_PATTERN.test(buildId)) throw new Error('Build ID explícito inválido.');
    selected = discovery.candidates.find((candidate) => lower(candidate.id) === lower(buildId));
    if (!selected) throw new Error('O build ID explícito não corresponde aos filtros seguros da candidata.');
  } else {
    if (discovery.candidates.length === 0) throw new Error('Nenhum build Android concluído corresponde à candidata e ao commit.');
    if (discovery.candidates.length > 1) {
      throw new Error('Mais de um build corresponde aos filtros. Informe um build ID explícito para evitar ambiguidade.');
    }
    [selected] = discovery.candidates;
  }

  return { ...discovery, status: 'selected', selected };
}

export function createAndroidHomologationPlan({ builds, deviceMatrix, testResults, evidenceUrl }) {
  const android = builds?.platforms?.android;
  if (builds?.release !== '0.11.0-rc.1' || android?.status !== 'captured') {
    throw new Error('O plano físico exige um build Android capturado para 0.11.0-rc.1.');
  }
  if (!UUID_PATTERN.test(android.buildId ?? '')) throw new Error('Build ID Android inválido no registro.');
  if (!SHA256_PATTERN.test(android.artifactSha256 ?? '')) throw new Error('SHA-256 Android inválido no registro.');
  if (!String(android.artifactUrl ?? '').startsWith('https://')) throw new Error('Artefato Android precisa usar HTTPS.');
  if (!String(evidenceUrl ?? '').startsWith('https://')) throw new Error('A evidência da sessão deve usar HTTPS.');

  const devices = (deviceMatrix?.profiles ?? [])
    .filter((profile) => profile.platform === 'android')
    .map((profile) => ({
      id: profile.id,
      class: profile.class,
      formFactor: profile.formFactor,
      memoryClass: profile.memoryClass,
      osRange: profile.osRange,
      required: profile.required === true,
      status: 'pending',
      evidenceUrl: null,
    }));

  const suites = (testResults?.suites ?? []).map((suite) => ({
    id: suite.id,
    name: suite.name,
    required: suite.required === true,
    status: 'pending',
    evidenceUrl: null,
  }));

  return {
    schemaVersion: '1.0',
    release: '0.11.0-rc.1',
    platform: 'android',
    status: 'pending-physical-validation',
    sourceCommit: builds.sourceCommit,
    build: {
      buildId: android.buildId,
      buildNumber: android.buildNumber,
      artifactSha256: android.artifactSha256,
      artifactSizeBytes: android.artifactSizeBytes ?? null,
      evidenceUrl,
    },
    devices,
    suites,
    summary: {
      requiredDevices: devices.filter((item) => item.required).length,
      passedRequiredDevices: 0,
      requiredSuites: suites.filter((item) => item.required).length,
      passedRequiredSuites: 0,
    },
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      usesSyntheticAccounts: true,
    },
    generatedAt: new Date().toISOString(),
    generatedBy: 'Tehkné Solutions',
  };
}
