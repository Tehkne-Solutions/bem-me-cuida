# ADR 046 — decisões humanas precisam ser revalidadas antes de qualquer correção

## Status

Aceito para governança; execução automática proibida.

## Contexto

Uma decisão humana pode se tornar obsoleta quando a proposta ou sua validação muda. Tratar a decisão como autorização permanente criaria risco de executar uma correção contra estado antigo, duplicado ou conflitante.

## Decisão

Toda decisão integrada será validada novamente contra o relatório mais recente de propostas. O resultado será somente diagnóstico e nunca concederá autorização de correção ou execução.

A validação detectará:

- decisão atual e compatível;
- commit de validação obsoleto;
- decisões duplicadas;
- decisões conflitantes para a mesma proposta;
- proposta ausente;
- incompatibilidade entre decisão e classificação;
- referência inválida.

Mesmo `current-and-compatible` significa apenas que a decisão pode seguir para uma etapa humana futura. Não significa aprovação técnica, autorização de implementação ou ativação.

## Consequências

- decisões antigas não são tratadas como autorização permanente;
- conflitos ficam visíveis antes de qualquer correção;
- permanece necessária uma etapa separada para preparar e revisar a correção;
- o ciclo continua fail-closed.

**Tehkné Solutions**
