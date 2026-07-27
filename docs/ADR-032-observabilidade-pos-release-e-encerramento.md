# ADR-032 — Observabilidade pós-release e encerramento fail-closed

## Contexto

A versão `0.11.0` precisa ser acompanhada após a publicação sem transportar dados emocionais, clínicos ou identificadores individuais para a operação técnica.

## Decisão

Adotar quatro registros independentes:

1. saúde agregada da versão;
2. incidentes técnicos sanitizados;
3. checkpoints temporais de 24h, 72h e 7d;
4. proposta de encerramento do ciclo.

Snapshots e incidentes entram no repositório somente por PR de evidência. Relatórios podem recomendar pausa ou rollback, mas não executam ações externas. O encerramento nunca ocorre automaticamente.

## Consequências

- repetição da mesma evidência é idempotente;
- incidentes resolvidos permanecem no histórico;
- SEV1 exige revisão de rollback;
- SEV2 exige pausa até contenção;
- todos os checkpoints precisam passar;
- o rollout precisa estar concluído;
- o backlog `0.12.0` precisa estar preparado;
- uma pessoa autorizada ainda precisa revisar e mesclar a proposta de encerramento.

## Privacidade

Somente percentuais, contagens, versão, plataforma, severidade, categoria técnica e URLs de evidência sanitizadas são aceitos.

**Tehkné Solutions**
