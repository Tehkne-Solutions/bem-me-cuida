# Sprint 06 — Diário avançado e comparações descritivas

**Produto:** BemMeCuida  
**Versão:** 0.7.0  
**Assinatura:** Tehkné Solutions

## Objetivo

Completar a gestão do Diário emocional com busca, filtros, edição e exclusão lógica sincronizada, além de ampliar os Insights com comparações locais de contexto sem diagnóstico, previsão ou afirmação de causalidade.

## Entregas

- busca local por título, texto, gatilhos e estratégias;
- filtros por período, emoção e marcação para conversa profissional;
- edição preservando a data original do registro;
- cancelamento explícito do modo de edição;
- exclusão lógica com confirmação e tombstone;
- funcionamento offline de criação, edição e exclusão;
- fila de sincronização consolidada por registro;
- replicação de tombstones para os outros dispositivos da mesma conta;
- períodos de 7 e 30 dias na aba Insights;
- comparações descritivas entre sono e ansiedade registrada;
- comparação entre intensidade do Diário e ansiedade registrada no mesmo dia;
- comparação entre registros com e sem estratégias anotadas;
- amostra mínima de dois registros em cada grupo;
- testes de domínio, serviço, pgTAP e fluxo Maestro.

## Limites clínicos e de privacidade

O Sprint 06:

- não diagnostica transtornos, episódios ou fases;
- não prevê crises ou risco;
- não afirma que sono, emoção ou estratégia causou uma mudança;
- não avalia eficácia de tratamento;
- não envia texto do Diário para IA;
- não executa busca ou comparação no servidor;
- não exclui fisicamente o registro antes de sincronizar o tombstone.

## Critérios de aceite

- busca retorna somente registros da conta ativa;
- filtros podem ser combinados sem expor conteúdo remoto;
- edição mantém `occurredAt` e altera `updatedAt`;
- edição offline reaparece após reiniciar o aplicativo;
- exclusão remove o item das listagens imediatamente;
- exclusão cria payload `journal_entry` com `deletedAt`;
- outro dispositivo recebe o tombstone pelo pull remoto;
- alteração local pendente continua protegida contra sobrescrita remota;
- comparações só aparecem com amostra mínima nos dois grupos;
- textos das comparações usam linguagem descritiva e não causal;
- TypeScript, lint, testes, release check, pgTAP e lint PostgreSQL permanecem verdes.

## Homologação manual recomendada

1. Criar três registros com emoções e intensidades diferentes.
2. Buscar uma palavra presente somente em um registro.
3. Combinar período, emoção e marcação para conversa.
4. Editar um registro sem internet e reiniciar o aplicativo.
5. Reativar a rede e confirmar a edição em outro dispositivo.
6. Excluir um registro offline e confirmar que ele não reaparece após sincronizar.
7. Criar amostras suficientes de sono e ansiedade para exibir uma comparação.
8. Confirmar que a interface informa que comparação não demonstra causalidade.

## Próximo incremento recomendado

Sprint 07:

- central de perfil, privacidade e preferências;
- revisão e revogação de consentimentos;
- exportação integral dos dados da conta;
- solicitação segura de exclusão de conta;
- bloqueio biométrico opcional e tempo de bloqueio configurável.
