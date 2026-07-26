# Capacidade, custo e dependências

## Capacidade

Snapshots devem registrar somente totais agregados do período:

- contas ativas;
- operações de sincronização;
- armazenamento em megabytes;
- entregas de notificação.

Os números não devem permitir identificar pessoas ou reconstruir atividade individual.

## Custo

Custos e orçamento são registrados em BRL.

- dentro do orçamento: custo estimado menor ou igual ao orçamento;
- atenção: até 10% acima;
- acima do orçamento: mais de 10% acima.

Uma variação não deve ser analisada isoladamente. Compare capacidade, crescimento, incidentes, retenção e mudanças de infraestrutura.

## Dependências

Cada revisão deve incluir:

- pacote;
- versão atual;
- versão alvo;
- tipo da mudança;
- risco;
- prazo;
- estado;
- notas técnicas.

### Prioridade

1. correções de segurança críticas;
2. compatibilidade com lojas e sistema operacional;
3. versões exigidas pelo Expo SDK;
4. correções de estabilidade;
5. melhorias de desempenho;
6. atualizações comuns.

### Atualizações major

Exigem:

- branch própria;
- matriz de compatibilidade;
- testes nativos;
- homologação de autenticação, SQLCipher, notificações e EAS Update;
- plano de rollback;
- revisão de privacidade quando APIs ou coleta mudarem.

## Calendário de manutenção

Janelas devem informar início, fim, impacto e plano técnico. Mudanças com impacto degradado ou indisponível exigem aprovação independente.

**Tehkné Solutions**
