# Sprint 19 — Central operacional da RC 0.11

## Objetivo

Transformar a issue operacional #24 em um ponto único e auditável para consultar o estado da candidata `0.11.0-rc.1` e solicitar os workflows já protegidos de infraestrutura, evidências, build e homologação.

## Entregas

- workflow acionado por comentários `issue_comment`;
- parser estrito para comandos `/rc011`;
- autorização pela permissão real do colaborador no repositório;
- separação entre comandos de escrita e comandos administrativos;
- resumo factual baseado apenas nos arquivos versionados da candidata;
- dispatch dos workflows existentes sem acesso direto a secrets;
- testes do parser;
- release check específico do Sprint 19;
- documentação operacional.

## Limites

A central não:

- cria environments;
- lê ou grava `EXPO_TOKEN`;
- altera callbacks;
- aprova gates;
- marca builds, OTA ou aparelhos como aprovados;
- promove a candidata;
- substitui os revisores dos environments.

## Resultado esperado

A issue #24 passa a aceitar comandos controlados para status e operação. Enquanto a infraestrutura externa estiver pendente, os workflows protegidos continuarão bloqueados pelos mesmos gates criados nos Sprints 15–18.

**Tehkné Solutions**
