# SLOs e orçamento de erro

## Finalidade

SLOs ajudam a decidir quando continuar evoluindo o produto e quando priorizar confiabilidade. Eles não medem bem-estar, adesão clínica ou estado emocional.

## Cadastro

Cada SLO possui:

- chave técnica estável;
- nome e descrição;
- objetivo percentual;
- janela de avaliação;
- limiar de alerta;
- limiar crítico;
- estado ativo ou inativo.

## Medição

Registre somente contagens agregadas:

- eventos bons;
- eventos totais;
- início e fim da janela;
- origem agregada ou revisão manual.

Nunca inclua textos, IDs de conta, e-mails ou conteúdo clínico.

## Interpretação

| Burn rate | Estado | Ação |
|---:|---|---|
| abaixo de 1 | Saudável | Manter monitoramento |
| de 1 até abaixo de 2 | Alerta | Investigar tendência e reduzir risco |
| 2 ou mais | Crítico | Bloquear ampliação de escopo e priorizar confiabilidade |

O burn rate é relativo ao orçamento permitido. Um valor `2` indica consumo duas vezes mais rápido que o tolerado.

## Processo

1. confirmar a origem dos números;
2. registrar a janela;
3. revisar amostra e sazonalidade;
4. comparar com incidentes e mudanças recentes;
5. abrir ação corretiva quando necessário;
6. bloquear aprovação do próximo ciclo se houver SLO crítico.

## Revisão das metas

Metas iniciais devem ser revistas após dados reais suficientes. Reduzir uma meta apenas para eliminar alertas não é aceitável sem justificativa registrada.

**Tehkné Solutions**
