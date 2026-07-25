export type SupportSignal = {
  level: 'none' | 'support' | 'urgent';
  message: string | null;
};

const urgentPatterns = [
  /\b(quero|vou|penso em|pensando em)\s+(me matar|morrer|sumir de vez)\b/i,
  /\b(suic[ií]dio|suicidar|tirar minha vida)\b/i,
  /\bn[aã]o quero mais viver\b/i,
];

const supportPatterns = [
  /\b(n[aã]o aguento|sem esperan[cç]a|desesperad[oa]|muito mal|perdi o controle)\b/i,
  /\b(vontade de usar|reca[ií]da|usar droga|usar subst[aâ]ncia)\b/i,
  /\bsem dormir\b/i,
];

export function evaluateSupportLanguage(text: string): SupportSignal {
  const normalized = text.trim();
  if (!normalized) return { level: 'none', message: null };
  if (urgentPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      level: 'urgent',
      message: 'Posso ter entendido errado, mas seu texto parece indicar que você precisa de apoio imediato. Procure uma pessoa de confiança ou um serviço de emergência da sua região agora.',
    };
  }
  if (supportPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      level: 'support',
      message: 'Posso ter entendido errado. Talvez seja um bom momento para acionar sua rede de apoio ou revisar seu plano de cuidado.',
    };
  }
  return { level: 'none', message: null };
}
