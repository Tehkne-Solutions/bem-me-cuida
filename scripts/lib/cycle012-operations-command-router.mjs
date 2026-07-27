const COMMAND_PATTERN = /^\/cycle012\s+(status|reviews|blockers|gates|queue|owners|next)$/;
const DASHBOARD_COMMANDS = new Set(['status', 'reviews', 'blockers', 'gates']);
const QUEUE_COMMANDS = new Set(['queue', 'owners', 'next']);

export function parseCycle012OperationsCommand(input, dashboardConfig, queueConfig) {
  const value = String(input ?? '').trim();
  const match = COMMAND_PATTERN.exec(value);
  if (!match) throw new Error('Comando inválido. Use /cycle012 status|reviews|blockers|gates|queue|owners|next.');
  const command = match[1];
  if (dashboardConfig.commands?.prefix !== '/cycle012' || !dashboardConfig.commands?.allowed?.includes(command)) {
    throw new Error('Comando não autorizado pela configuração operacional.');
  }
  if (dashboardConfig.commands?.exactMatchRequired !== true || dashboardConfig.commands?.freeTextAllowed !== false) {
    throw new Error('Configuração operacional precisa permanecer estrita e sem texto livre.');
  }
  if (QUEUE_COMMANDS.has(command)) {
    if (!queueConfig.commands?.allowed?.includes(command)) throw new Error('Comando de fila não autorizado.');
    if (queueConfig.commands?.exactMatchRequired !== true || queueConfig.commands?.freeTextAllowed !== false) {
      throw new Error('Configuração da fila precisa permanecer estrita e sem texto livre.');
    }
    return { command, surface: 'queue' };
  }
  if (DASHBOARD_COMMANDS.has(command)) return { command, surface: 'dashboard' };
  throw new Error('Superfície operacional desconhecida.');
}

export const cycle012OperationsCommandSets = {
  dashboard: [...DASHBOARD_COMMANDS],
  queue: [...QUEUE_COMMANDS],
};
