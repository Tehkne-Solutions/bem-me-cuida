# ADR-033 — transição fail-closed para o ciclo 0.12.0

## Status

Aceito no Sprint 29.

## Contexto

A infraestrutura do BemMeCuida já prepara publicação, rollout e observabilidade da versão 0.11.0, mas a versão ainda não foi publicada. Abrir o ciclo seguinte antes do encerramento real criaria uma falsa sensação de continuidade e poderia autorizar migrations ou limpeza de evidências prematuramente.

## Decisão

O ciclo 0.12.0 começa como `blocked-awaiting-011-closure` e depende de cinco evidências independentes:

1. encerramento revisado do ciclo 0.11.0;
2. limpeza auditada dos environments temporários;
3. síntese anônima de feedback;
4. escopo aprovado;
5. plano de migrations aprovado.

A automação pode produzir capturas, relatórios e propostas. Ela não pode:

- ativar o ciclo;
- criar migrations;
- excluir environments;
- mesclar PRs;
- processar feedback bruto.

## Consequências

O início do ciclo é mais lento, porém rastreável e resistente a estados externos incompletos. A faixa 022–029 fica reservada somente no plano, sem arquivos SQL vazios.

**Tehkné Solutions**
