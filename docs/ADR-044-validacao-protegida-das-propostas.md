# ADR 044 — validação separada da aprovação e execução

## Status

Aceito para governança; aprovação e execução automáticas proibidas.

## Contexto

Propostas humanas podem se tornar obsoletas quando a reconciliação muda, podem ser duplicadas por operadores diferentes ou conflitar entre si. Considerar a simples integração de uma proposta como aprovação criaria risco de executar decisões contra fontes já alteradas.

## Decisão

Criar uma camada de validação somente leitura que compara cada proposta integrada com a reconciliação atual. O relatório classifica compatibilidade, obsolescência, duplicidade, conflito, ausência da fonte e incompatibilidade entre ação e classificação.

Mesmo uma proposta `current-and-compatible` não é aprovada. Ela permanece apenas elegível para revisão humana posterior em fluxo separado.

## Consequências positivas

- impede uso de propostas obsoletas;
- detecta duplicidade e conflito antes da decisão;
- mantém diagnóstico, proposta, validação e execução separados;
- preserva trilha de auditoria.

## Consequências negativas

- adiciona uma etapa humana antes de qualquer correção;
- propostas podem precisar ser substituídas após mudanças na `main`;
- compatibilidade não equivale a aprovação.

## Alternativas rejeitadas

- aprovar automaticamente propostas compatíveis;
- escolher automaticamente entre propostas conflitantes;
- apagar propostas duplicadas;
- reescrever a proposta com o commit atual;
- executar a ação no mesmo workflow de validação.

**Tehkné Solutions**
