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

export { UUID_PATTERN, SHA_PATTERN, SHA256_PATTERN };
