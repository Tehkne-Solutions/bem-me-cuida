import crypto from 'node:crypto';

export const CLASSIFICATIONS = Object.freeze({
  CURRENT: 'current-and-compatible',
  STALE: 'stale-session-package-validation',
  DUPLICATE: 'duplicate-authorization',
  CONFLICT: 'conflicting-authorization',
  MISSING: 'source-authorization-missing',
  DECISION: 'authorization-decision-mismatch',
  REFERENCE: 'invalid-authorization-reference'
});

const stable = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
export const fingerprintAuthorization = (authorization) => crypto.createHash('sha256').update(stable(authorization)).digest('hex');

export function validateSessionStartAuthorization({ authorization, currentSessionPackage, existingAuthorizations = [] }) {
  if (!authorization) return result(CLASSIFICATIONS.MISSING, 'A autorização de origem não foi informada.');
  if (authorization.type !== 'human-review-session-start-authorization') return result(CLASSIFICATIONS.REFERENCE, 'Tipo de autorização inválido.');
  if (!currentSessionPackage?.id || !currentSessionPackage?.validationCommit) return result(CLASSIFICATIONS.REFERENCE, 'Pacote de sessão vigente incompleto.');
  if (authorization.sessionPackageId !== currentSessionPackage.id) return result(CLASSIFICATIONS.REFERENCE, 'Referência ao pacote de sessão inválida.');
  if (authorization.sessionPackageValidationCommit !== currentSessionPackage.validationCommit || currentSessionPackage.classification !== 'current-and-compatible') {
    return result(CLASSIFICATIONS.STALE, 'A validação do pacote deixou de ser vigente ou compatível.');
  }
  if (authorization.decision !== 'authorize-human-review-session-start') return result(CLASSIFICATIONS.DECISION, 'A decisão registrada não é permitida.');

  const samePackage = existingAuthorizations.filter((item) => item.sessionPackageId === authorization.sessionPackageId);
  const sameFingerprint = samePackage.some((item) => fingerprintAuthorization(item) === fingerprintAuthorization(authorization));
  if (sameFingerprint) return result(CLASSIFICATIONS.DUPLICATE, 'Já existe autorização idêntica para o pacote.');
  if (samePackage.length) return result(CLASSIFICATIONS.CONFLICT, 'Existe outra autorização para o mesmo pacote.');

  return result(CLASSIFICATIONS.CURRENT, 'Autorização atual e compatível.');
}

function result(classification, reason) {
  return {
    classification,
    reason,
    reviewSessionExecutionAllowed: false,
    operationalActionsRemainBlocked: true,
    humanReviewRequired: true
  };
}
