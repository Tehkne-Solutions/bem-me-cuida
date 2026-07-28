import policy from '../governance/cycle-0.12/human-review-session-execution-package-validation.policy.json' with { type: 'json' };

const stable = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
const containsForbidden = (value) => {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  return policy.forbiddenPatterns.some((pattern) => text.includes(pattern.toLowerCase()));
};

export function validateHumanReviewSessionExecutionPackage({
  packageRecord,
  currentAuthorizationId,
  currentAuthorizationValidationCommit,
  currentAuthorizationClassification,
  peerPackages = []
}) {
  if (!packageRecord) return result('source-package-missing');
  if (containsForbidden(packageRecord)) return result('forbidden-operational-content');
  if (packageRecord.type !== policy.acceptedPackageType) return result('invalid-package-reference');

  const refs = packageRecord.references ?? {};
  if (!refs.authorizationId || !refs.authorizationValidationCommit) return result('invalid-package-reference');
  if (refs.authorizationId !== currentAuthorizationId || refs.authorizationValidationCommit !== currentAuthorizationValidationCommit) {
    return result('stale-authorization-validation');
  }
  if (currentAuthorizationClassification !== policy.currentClassification) return result('stale-authorization-validation');

  const missingSection = policy.requiredSections.some((section) => !(section in packageRecord));
  if (missingSection) return result('structure-divergence');

  const sameId = peerPackages.filter((candidate) => candidate?.packageId === packageRecord.packageId);
  if (sameId.some((candidate) => stable(candidate) === stable(packageRecord))) return result('duplicate-package');
  if (sameId.length > 0) return result('conflicting-package');

  return result('current-and-compatible');
}

function result(classification) {
  return {
    classification,
    compatible: classification === policy.currentClassification,
    controls: { ...policy.controls }
  };
}
