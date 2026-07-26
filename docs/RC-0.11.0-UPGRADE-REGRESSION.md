# RC 0.11.0 — Upgrade e regressão

## Objetivo

Validar que a atualização da base `0.10.0` para `0.11.0-rc.1` preserva dados, segurança e comportamento offline antes da promoção.

## Conta e dados de teste

Use somente conta sintética. Prepare em `0.10.0`:

- check-ins em datas diferentes;
- entradas do Diário, incluindo uma editada e uma excluída;
- medicamento e lembrete;
- prática de autocuidado;
- consulta e tratamento;
- plano de apoio;
- preferências de notificações e acessibilidade;
- bloqueio biométrico quando disponível;
- ao menos uma operação pendente na fila offline.

Não use informações reais de saúde, nomes reais ou contatos reais.

## Cenário A — Instalação paralela

Instale `BemMeCuida 0.11 RC` ao lado da produção e confirme isolamento de package, scheme, sessão, banco e notificações.

## Cenário B — Upgrade do package oficial

Em ambiente protegido, gere um build `0.10.0` e outro `0.11.0-rc.1` usando o mesmo package de teste. Instale a base, prepare os dados e atualize sem limpar o armazenamento.

## Verificações obrigatórias

1. o aplicativo inicia sem recriar onboarding indevidamente;
2. a sessão permanece válida ou solicita login de forma segura;
3. o banco SQLCipher abre sem perda ou corrupção;
4. check-ins, Diário, cuidados e plano de apoio permanecem íntegros;
5. tombstones continuam impedindo reaparecimento de itens excluídos;
6. fila offline sincroniza uma única vez após reconexão;
7. notificações não são duplicadas;
8. preferências de acessibilidade e bloqueio permanecem coerentes;
9. exportação integral inclui os mesmos registros esperados;
10. rollback para a base aprovada não destrói dados sem aviso.

## Banco local

Compare antes e depois:

- versão do schema;
- contagem por entidade;
- fila de sincronização;
- tombstones;
- vínculos de notificações;
- integridade de chaves e índices;
- abertura com a mesma chave protegida do aparelho.

A evidência deve conter somente contagens e resultado técnico. Não capture textos do Diário ou dados clínicos.

## Resultado

Atualize a suíte `upgrade-010-011` e `local-database-regression` em `release/rc-0.11.0/test-results.json` com status e evidência HTTPS.

**Tehkné Solutions**
