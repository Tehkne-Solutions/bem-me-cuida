# Sprint 01 — Fundação técnica segura

**Duração:** 10 dias úteis
**Produto:** BemMeCuida
**Assinatura:** Tehkné Solutions

## Objetivo

Entregar uma vertical slice capaz de registrar um check-in emocional localmente, manter o dado após reinício e preparar sincronização idempotente com backend protegido por RLS.

## Entregas

- monorepo e padrões de engenharia;
- aplicativo Expo com identidade light;
- navegação Hoje, Check-in, Diário, Cuidado e Insights;
- acesso permanente ao modo de apoio/crise;
- banco local criptografado;
- fila e sincronização bidirecional;
- migrations iniciais e RLS;
- contratos Zod compartilhados;
- ambientes isolados e build Android interno preparado;
- CI da aplicação e do banco;
- diagnóstico técnico seguro no aparelho;
- automação E2E do fluxo público e do check-in sintético;
- documentação de segurança.

## Definition of Done

- check-in salvo localmente;
- registro reaparece após reinício;
- operação de sincronização não duplica e não sobrescreve versão remota mais nova;
- RLS impede leitura cruzada entre usuários;
- nenhum dado emocional aparece nos logs;
- tela de apoio funciona offline;
- TypeScript e lint aprovados;
- diagnóstico do aparelho sem erros bloqueantes;
- E2E público e autenticado aprovados;
- build nativo de homologação gerado.
