# Sprint 18 — Bootstrap externo e PR de evidências

## Objetivo

Reduzir a intervenção manual necessária para configurar a infraestrutura da RC `0.11.0-rc.1` e transformar a captura protegida em um PR auditável, sem armazenar secrets no repositório.

## Entregas

- manifesto versionado dos environments, variables, callbacks e serviços;
- gerador de pacote Bash, PowerShell e checklist;
- formulário de issue para rastrear a configuração externa;
- workflow para inspecionar o artefato consolidado;
- workflow para abrir automaticamente o PR de evidências;
- disparo explícito do CI na branch criada pelo workflow;
- validações contra tokens, `service_role` e dados sensíveis;
- runbook operacional e ADR.

## Limites

- o pacote não cria nem armazena valores de secrets;
- o `EXPO_TOKEN` continua sendo informado diretamente ao GitHub CLI;
- regras de proteção e revisores exigem uma conta com permissão administrativa;
- callbacks do Supabase continuam sendo configurados no ambiente externo;
- nenhum build ou OTA é disparado antes do registro oficial ficar `ready`;
- a produção permanece em `0.10.0`.

## Critérios de aceite

- `npm run rc011:bootstrap:bundle` gera quatro arquivos sem valores secretos;
- `npm run rc011:bootstrap:check` valida manifesto, scripts e workflows;
- o CI público gera e valida o pacote com placeholders;
- o workflow de evidências rejeita capturas que não estejam integralmente `ready`;
- o PR criado contém apenas o registro consolidado e dispara o CI;
- todos os artefatos mantêm a assinatura Tehkné Solutions.

**Tehkné Solutions**
