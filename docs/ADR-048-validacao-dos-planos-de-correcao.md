# ADR 048 — Validação dos planos de correção

## Status

Aceito.

## Contexto

Planos preparados a partir de decisões válidas podem se tornar obsoletos, duplicados, conflitantes ou divergir do escopo autorizado antes de qualquer implementação.

## Decisão

Todo plano integrado deve ser revalidado contra o commit atual da decisão, referências obrigatórias, identidade semântica e raízes de impacto permitidas.

Uma classificação `current-and-compatible` é apenas diagnóstica. Ela não concede autorização de correção, preparação de pull request, execução, merge ou ativação.

## Consequências

- planos obsoletos ou divergentes são bloqueados;
- duplicidades e conflitos tornam-se auditáveis;
- nenhuma fonte de verdade é modificada;
- o ciclo permanece fail-closed.
