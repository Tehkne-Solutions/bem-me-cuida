import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

function number(name, fallback = 0) {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(name, fallback) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function currencyBrl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const outputJson = text('GOVERNANCE_REPORT_OUTPUT', 'artifacts/bemmecuida-governance-report.json');
const outputMarkdown = text('GOVERNANCE_REPORT_MARKDOWN_OUTPUT', 'artifacts/bemmecuida-governance-report.md');
const generatedAt = new Date().toISOString();
const estimatedCostBrl = number('GOVERNANCE_ESTIMATED_COST_BRL');
const budgetBrl = number('GOVERNANCE_BUDGET_BRL');
const varianceBrl = estimatedCostBrl - budgetBrl;

const report = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  signature: 'Tehkné Solutions',
  generatedAt,
  cycle: {
    version: text('GOVERNANCE_CYCLE_VERSION', '0.11.0'),
    status: text('GOVERNANCE_CYCLE_STATUS', 'planning'),
    readiness: text('GOVERNANCE_CYCLE_READINESS', 'blocked'),
  },
  reliability: {
    activeSlos: number('GOVERNANCE_ACTIVE_SLOS'),
    criticalSlos: number('GOVERNANCE_CRITICAL_SLOS'),
    criticalIncidentsOpen: number('GOVERNANCE_CRITICAL_INCIDENTS_OPEN'),
    correctiveActionsOpen: number('GOVERNANCE_CORRECTIVE_ACTIONS_OPEN'),
    postmortemsPending: number('GOVERNANCE_POSTMORTEMS_PENDING'),
  },
  capacity: {
    activeAccounts: number('GOVERNANCE_ACTIVE_ACCOUNTS'),
    syncOperations: number('GOVERNANCE_SYNC_OPERATIONS'),
    storageMegabytes: number('GOVERNANCE_STORAGE_MEGABYTES'),
    notificationDeliveries: number('GOVERNANCE_NOTIFICATION_DELIVERIES'),
  },
  cost: {
    currency: 'BRL',
    estimated: estimatedCostBrl,
    budget: budgetBrl,
    variance: varianceBrl,
  },
  change: {
    maintenanceWindowsPending: number('GOVERNANCE_MAINTENANCE_WINDOWS_PENDING'),
    securityDependenciesOpen: number('GOVERNANCE_SECURITY_DEPENDENCIES_OPEN'),
    dependenciesInProgress: number('GOVERNANCE_DEPENDENCIES_IN_PROGRESS'),
  },
  privacy: {
    containsPersonalData: false,
    containsClinicalData: false,
    aggregationOnly: true,
  },
};

const markdown = `# Relatório executivo — BemMeCuida\n\n` +
  `Gerado em: ${generatedAt}\n\n` +
  `## Ciclo ${report.cycle.version}\n\n` +
  `- Estado: ${report.cycle.status}\n` +
  `- Prontidão: ${report.cycle.readiness}\n\n` +
  `## Confiabilidade\n\n` +
  `- SLOs ativos: ${report.reliability.activeSlos}\n` +
  `- SLOs críticos: ${report.reliability.criticalSlos}\n` +
  `- Incidentes críticos abertos: ${report.reliability.criticalIncidentsOpen}\n` +
  `- Ações corretivas abertas: ${report.reliability.correctiveActionsOpen}\n` +
  `- Pós-incidentes pendentes: ${report.reliability.postmortemsPending}\n\n` +
  `## Capacidade e custo\n\n` +
  `- Contas ativas agregadas: ${report.capacity.activeAccounts}\n` +
  `- Operações de sincronização: ${report.capacity.syncOperations}\n` +
  `- Armazenamento: ${report.capacity.storageMegabytes} MB\n` +
  `- Entregas de notificação: ${report.capacity.notificationDeliveries}\n` +
  `- Custo estimado: ${currencyBrl(report.cost.estimated)}\n` +
  `- Orçamento: ${currencyBrl(report.cost.budget)}\n` +
  `- Variação: ${currencyBrl(report.cost.variance)}\n\n` +
  `## Mudanças\n\n` +
  `- Manutenções pendentes: ${report.change.maintenanceWindowsPending}\n` +
  `- Dependências de segurança abertas: ${report.change.securityDependenciesOpen}\n` +
  `- Dependências em atualização: ${report.change.dependenciesInProgress}\n\n` +
  `O relatório contém somente dados técnicos agregados.\n\n` +
  `**Tehkné Solutions**\n`;

for (const path of [outputJson, outputMarkdown]) mkdirSync(dirname(join(process.cwd(), path)), { recursive: true });
writeFileSync(join(process.cwd(), outputJson), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(join(process.cwd(), outputMarkdown), markdown, 'utf8');
console.log(`Relatórios gerados: ${outputJson} e ${outputMarkdown}`);
