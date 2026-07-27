# ADR 050 — Validar autorizações antes da preparação de PR

## Status

Aceito.

## Contexto

O Sprint 45 introduziu autorizações humanas explícitas para uma futura preparação administrativa de PR. Essas autorizações podem se tornar obsoletas, duplicadas, conflitantes ou incompatíveis quando o plano de origem muda.

## Decisão

Toda autorização integrada deve ser revalidada em modo somente leitura contra o plano atual e seu commit de validação. A classificação não concede permissão operacional.

## Consequências

- autorizações obsoletas ou conflitantes ficam explicitamente bloqueadas;
- referências incompletas falham de forma fechada;
- nenhum patch ou PR funcional é gerado;
- revisão humana continua obrigatória;
- execução, merge e ativação permanecem proibidos.
