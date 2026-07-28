import { readFile } from 'node:fs/promises';

const policy = JSON.parse(
  await readFile(new URL('../governance/cycle-0.12/administrative-closure-package-validation-policy.json', import.meta.url), 'utf8'),
);

const stable = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
const containsForbidden = (value) => {
  const text = JSON.stringify(value ?? {});
  return policy.forbiddenOperationalPatterns.some((pattern) => text.includes(pattern));
};

export function expectedClosureState(pkg) {
  const items = pkg.remainingItems ?? [];
  if (items.length === 0) return 'closed-administratively';
  if (items.every((item) => ['accepted-risk', 'not-required'].includes(item.status))) {
    return 'partially-closed-administratively';
  }
  return 'open-administratively';
}

export function validateAdministrativeClosurePackage({
  package: pkg,
  currentSourceValidation,
  existingPackages = [],
}) {
  if (!pkg) return { classification: 'incomplete-closure-package' };
  if (containsForbidden(pkg)) return { classification: 'forbidden-operational-content' };

  for (const section of policy.requiredSections) {
    if (!(section in pkg)) return { classification: 'incomplete-closure-package', section };
  }

  if (
    currentSourceValidation?.classification !== policy.requiredSourceClassification ||
    pkg.references?.sourceValidationCommit !== currentSourceValidation?.commit
  ) {
    return { classification: 'stale-closure-package' };
  }

  const sourceIds = new Set(pkg.validatedSources.map((source) => source.sourceId));
  if (
    sourceIds.size !== pkg.validatedSources.length ||
    pkg.validatedSources.some((source) => !source.sourceId || !source.validationCommit || source.classification !== 'current-and-compatible')
  ) {
    return { classification: 'invalid-validated-source' };
  }

  if (!pkg.decisionConsolidation?.decision || !pkg.decisionConsolidation?.sourceDecisionId) {
    return { classification: 'decision-consolidation-divergence' };
  }

  if (!Array.isArray(pkg.followUpConsolidation?.items)) {
    return { classification: 'follow-up-consolidation-divergence' };
  }

  const remainingIds = new Set();
  for (const item of pkg.remainingItems) {
    if (
      !item.itemId ||
      remainingIds.has(item.itemId) ||
      !item.owner ||
      !policy.remainingItemStatuses.includes(item.status) ||
      !item.reason
    ) {
      return { classification: 'invalid-remaining-item' };
    }
    remainingIds.add(item.itemId);
  }

  const riskIds = new Set();
  for (const risk of pkg.acceptedRisks) {
    if (
      !risk.riskId ||
      riskIds.has(risk.riskId) ||
      !risk.owner ||
      !policy.riskDecisions.includes(risk.decision) ||
      !risk.rationale
    ) {
      return { classification: 'invalid-accepted-risk' };
    }
    riskIds.add(risk.riskId);
  }

  if (!Array.isArray(pkg.transitionCriteria) || pkg.transitionCriteria.length === 0) {
    return { classification: 'incomplete-transition-criteria' };
  }
  if (pkg.transitionCriteria.some((criterion) => !criterion.criterionId || !criterion.description || !criterion.status)) {
    return { classification: 'incomplete-transition-criteria' };
  }

  if (
    !policy.closureStates.includes(pkg.closureStatement?.state) ||
    pkg.closureStatement.state !== expectedClosureState(pkg)
  ) {
    return { classification: 'inconsistent-closure-state' };
  }

  if (
    !pkg.references?.sourceValidationCommit ||
    !pkg.references?.policyVersion ||
    pkg.references.policyVersion !== policy.version
  ) {
    return { classification: 'invalid-closure-reference' };
  }

  const sameIdentity = existingPackages.filter(
    (candidate) => candidate?.packageIdentity?.packageId === pkg.packageIdentity?.packageId,
  );
  if (sameIdentity.some((candidate) => stable(candidate) === stable(pkg))) {
    return { classification: 'duplicate-closure-package' };
  }
  if (sameIdentity.length > 0) {
    return { classification: 'conflicting-closure-package' };
  }

  return {
    classification: 'current-and-compatible',
    controls: policy.controls,
  };
}
