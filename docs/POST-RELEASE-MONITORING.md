# Monitoramento pós-publicação

## Princípio

O monitoramento do BemMeCuida usa sinais técnicos agregados. Conteúdo emocional, Diário, nomes de medicamentos, diagnósticos, contatos e notas pessoais não participam da operação de rollout.

## Janela de leitura

Cada leitura registrada precisa informar:

- início e fim da janela;
- origem agregada ou revisão manual;
- sessões sem falha;
- sucesso de sincronização;
- sucesso de autenticação;
- sucesso de notificações, quando disponível;
- chamados de suporte;
- bloqueadores;
- quantidade de sessões amostradas.

## Limites internos iniciais

| Sinal | Limite para avanço |
|---|---:|
| Sessões sem falha | ≥ 99% |
| Sincronização bem-sucedida | ≥ 97% |
| Autenticação bem-sucedida | ≥ 98% |
| Bloqueadores | 0 |
| SEV1/SEV2 abertos | 0 |
| Idade da leitura | ≤ 24 horas |

Os limites são controles operacionais iniciais. Alterações devem passar por revisão, testes e migration quando afetarem a autoridade do servidor.

## Revisão por onda

Antes de cada avanço:

1. confirmar a candidata e o build;
2. revisar a submissão correta;
3. verificar incidentes;
4. registrar nova janela agregada;
5. revisar feedback bloqueador ou urgente;
6. confirmar ausência de regressão de autenticação e sync;
7. solicitar avanço no console;
8. registrar decisão na auditoria.

## Sinais para pausa

- métrica ausente ou vencida;
- queda abrupta sem explicação;
- amostra insuficiente para uma decisão segura;
- aumento de chamados;
- incidente ainda sem classificação;
- divergência entre loja, build e candidata;
- qualquer dúvida sobre integridade de dados.

## Sinais para rollback

- SEV1 confirmado;
- perda ou corrupção de dados;
- falha ampla de autenticação;
- sincronização com risco de inconsistência;
- bloqueador que impede uso essencial;
- impossibilidade de conter o impacto mantendo o build publicado.

## Retenção

As leituras agregadas podem ser mantidas para auditoria operacional. Não devem ser enriquecidas posteriormente com identificadores pessoais ou conteúdos clínicos.

## Relatório de encerramento

Ao concluir 100%, registrar:

- versão e build;
- datas das ondas;
- métricas de cada janela;
- incidentes e decisões;
- feedback relevante já anonimizado ou agregado;
- resultado final;
- pendências para o próximo ciclo.

**Tehkné Solutions**
