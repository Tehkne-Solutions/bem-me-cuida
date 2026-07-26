# Experimentos seguros e consentidos

## Princípios

Experimentos do BemMeCuida são ferramentas de produto e confiabilidade, não estudos clínicos.

Eles devem:

- solicitar consentimento explícito;
- informar que a participação é opcional;
- permitir encerramento sem perda de acesso ao aplicativo;
- usar apenas métricas técnicas ou de interação agregadas;
- possuir hipótese, métrica de sucesso e guardrail;
- passar por aprovação independente;
- ter período e público descritos previamente.

## Dados proibidos

Não podem ser usados para segmentação, análise ou decisão:

- textos do Diário;
- emoções registradas;
- diagnósticos;
- medicamentos;
- contatos de confiança;
- notas de tratamento;
- informações de crise;
- identificadores de aparelho em relatórios.

## Medições

Cada variante registra somente:

- tamanho da amostra;
- conversões;
- valor agregado;
- violações do guardrail;
- período;
- origem agregada ou revisão manual.

Não existe tabela de atribuição individual de participantes no módulo operacional.

## Amostra e guardrail

A política local considera:

- menos de 100 observações por variante: amostra insuficiente;
- guardrail do tratamento acima de 2%: experimento bloqueado;
- ganho de pelo menos 5% com guardrail preservado: resultado promissor.

Esses limites apoiam a leitura operacional e não constituem significância estatística ou conclusão científica.

## Estados

```text
draft → awaiting_approval → approved → running → concluded
                                  ↘ paused ↗
qualquer etapa permitida → cancelled
```

Experimentos em aprovação, execução ou pausa bloqueiam o congelamento do ciclo.

## Aprovação

A conta criadora não pode aprovar o próprio experimento. A decisão exige `release_admin` e é registrada na auditoria operacional.

## Assinatura

Tehkné Solutions
