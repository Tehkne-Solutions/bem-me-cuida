# Sprint 26 — OTA final e decisão da RC 0.11

## Objetivo

Validar publicação e rollback OTA da `0.11.0-rc.1` em Android e iOS, com reinício, operação offline e preservação dos dados locais, produzindo um pacote final de decisão sem promoção automática.

## Entregas

- workflow protegido `rc-011-ota-final-validation.yml`;
- captura revisável da publicação e do rollback no canal `rc-0-11`;
- sessões físicas sanitizadas para Android e iOS;
- checks obrigatórios de recebimento, reinício, banco local e operação offline;
- histórico imutável em `release/rc-0.11.0/ota-sessions/`;
- registro agregado `ota-device-validation.json`;
- comandos operacionais OTA no Command Center;
- pacote final `hold|promote` sem alteração de gates;
- testes, verificador estrutural, ADR e runbook.

## Critérios de conclusão

A recomendação só pode ser `promote` quando builds, matriz física, suítes, infraestrutura, publicação OTA, rollback e sessões OTA de Android e iOS estiverem aprovados e acompanhados de evidências HTTPS.

## Estado inicial

Todos os itens externos permanecem pendentes. Nenhum update, rollback, aparelho ou gate foi aprovado pelo código deste sprint.

**Tehkné Solutions**
