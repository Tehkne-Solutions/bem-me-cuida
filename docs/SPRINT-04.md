# Sprint 04 — Plano personalizado de apoio e crise

**Produto:** BemMeCuida
**Versão:** 0.5.0
**Assinatura:** Tehkné Solutions

## Objetivo

Transformar a tela de apoio em um plano escrito pelo próprio usuário, disponível offline e protegido no banco local, sem realizar avaliação automática de risco.

## Escopo

- sinais percebidos pelo usuário;
- ações curtas que costumam ajudar;
- lugares ou contextos considerados mais seguros;
- lembretes e exercício de aterramento personalizados;
- contatos de confiança com ligação rápida;
- integração com o modo público de crise;
- schema SQLite 9;
- sincronização bidirecional, RLS e pgTAP;
- fluxo Maestro do plano de apoio.

## Limites

O aplicativo não determina nível de risco, não substitui profissionais ou serviços de emergência e não garante disponibilidade dos contatos cadastrados.

## Critérios de aceite

- o plano salvo reaparece sem internet;
- a tela de crise mostra o plano quando há sessão ativa;
- o modo de crise continua abrindo sem autenticação;
- contatos podem ser ligados e desativados sem apagar histórico;
- dados de contas distintas permanecem isolados;
- nenhum conteúdo do plano aparece nos logs;
- TypeScript, lint, testes, pgTAP e lint PostgreSQL passam no CI.
