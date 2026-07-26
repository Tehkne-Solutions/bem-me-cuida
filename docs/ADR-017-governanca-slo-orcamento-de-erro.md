# ADR-017 — Governança técnica, SLOs e orçamento de erro

## Status

Aceito.

## Contexto

O BemMeCuida já possui rollout gradual, incidentes, hotfixes e retenção. Faltava uma camada que transformasse eventos operacionais em decisões repetíveis sobre confiabilidade, custo, manutenção e evolução do produto.

## Decisão

Adotar um módulo de governança com:

1. **SLOs configuráveis** por serviço técnico;
2. **medições agregadas** com eventos bons e totais;
3. **burn rate** como proporção entre falha observada e falha permitida;
4. **orçamento de erro consumido** igual a `burn rate × 100`;
5. **pós-incidentes** vinculados a incidentes de produção;
6. **aprovação por quatro-olhos** para pós-incidentes, manutenção e ciclos;
7. **ações corretivas** com responsável, prioridade e prazo;
8. **capacidade e custo** somente em dados agregados e BRL;
9. **governança de dependências**;
10. **ciclos de produto** com gates operacionais.

## Fórmulas

```text
observado = eventos_bons / eventos_totais × 100
falha_permitida = 100 - objetivo
falha_observada = 100 - observado
burn_rate = falha_observada / falha_permitida
orçamento_consumido = burn_rate × 100
orçamento_restante = máximo(0, 100 - orçamento_consumido)
```

## Segurança

- tabelas com RLS;
- leitura somente para `release_operator` e `release_admin`;
- nenhuma escrita direta do cliente;
- mutações por RPCs `security definer`;
- auditoria em `operator_audit_log`;
- decisões administrativas revalidam papel e autor;
- criador não aprova a própria entidade.

## Privacidade

O domínio não recebe dados emocionais, clínicos ou identificadores pessoais. Relatórios executivos usam apenas números técnicos agregados.

## Consequências

### Positivas

- decisões de rollout e roadmap ficam rastreáveis;
- confiabilidade deixa de depender de percepção informal;
- custo e capacidade passam a ter histórico;
- o ciclo `0.11.0` possui gates objetivos.

### Custos

- exige disciplina de registro;
- metas precisam de revisão após dados reais;
- aprovação por duas pessoas aumenta segurança e também o tempo operacional.

**Tehkné Solutions**
