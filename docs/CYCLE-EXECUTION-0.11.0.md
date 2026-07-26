# Execução controlada do ciclo 0.11.0

## Objetivo

Converter o ciclo aprovado em trabalho mensurável, com escopo protegido, experimentos consentidos, marcos claros e gates verificáveis.

## Backlog

Cada item registra:

- categoria: confiabilidade, acessibilidade, valor, segurança ou operação;
- impacto de 1 a 100;
- confiança de 1 a 100;
- esforço de 1 a 21 pontos;
- risco de 1 a 100;
- responsável e prazo opcionais;
- estado operacional.

Estados:

```text
proposed → committed → in_progress → done
                       ↘ blocked
proposed/committed → removed
```

Itens bloqueados impedem congelamento. Itens comprometidos incompletos impedem lançamento.

## Objetivos e resultados-chave

Objetivos agrupam resultados-chave com:

- valor-base;
- meta;
- valor atual;
- unidade;
- modo de agregação;
- estado de acompanhamento.

Unidades aceitas incluem contagem, porcentagem, taxa, horas e valores em reais.

## Escopo

Toda adição, remoção, reordenação ou redimensionamento de escopo gera uma solicitação auditada. Outra conta com papel `release_admin` deve aprovar ou rejeitar.

Mudança pendente bloqueia congelamento.

## Marcos

Tipos previstos:

- planejamento;
- design;
- desenvolvimento;
- QA;
- RC;
- congelamento;
- lançamento.

O marco de RC precisa estar concluído antes do congelamento. O marco de lançamento precisa estar concluído antes da transição final.

## Gates padrão

- CI de qualidade;
- migrations e pgTAP;
- acessibilidade;
- privacidade e consentimentos;
- build RC;
- aparelho físico;
- metadados de distribuição, opcional nesta fase.

Waiver de gate exige `release_admin`.

## Relatório

```bash
npm run cycle:report
```

O relatório utiliza somente contagens agregadas, não contém dados pessoais ou clínicos e possui assinatura Tehkné Solutions.

## RC planejada

```text
0.11.0-rc.1
```

A versão-base do aplicativo permanece `0.10.0` até existir um artefato real e homologado.

## Assinatura

Tehkné Solutions
