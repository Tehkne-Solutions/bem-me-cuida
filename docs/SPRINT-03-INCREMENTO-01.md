# Sprint 03 — Incremento 01: Diário emocional e insights locais

**Produto:** BemMeCuida  
**Versão:** 0.4.0  
**Assinatura:** Tehkné Solutions

## Objetivo

Transformar as abas Diário e Insights em uma vertical slice funcional, local-first e sincronizada, permitindo registrar experiências emocionais e observar tendências descritivas sem produzir diagnóstico, previsão de crise ou orientação clínica.

## Escopo implementado

- entrada textual de até 5.000 caracteres;
- título opcional;
- seleção de uma a seis emoções;
- intensidade percebida de 0 a 10;
- listas opcionais de gatilhos e estratégias;
- marcação de registros para conversa profissional;
- histórico recente na própria aba Diário;
- armazenamento local SQLCipher no schema 8;
- fila offline e sincronização bidirecional da entidade `journal_entry`;
- tabela remota `journal_entries` com RLS por conta;
- médias de ansiedade, energia, concentração e horas de sono dos últimos sete dias;
- humor mais registrado e emoções recorrentes;
- perguntas determinísticas para reflexão ou consulta;
- testes de domínio, serviço de insights, pgTAP e fluxo Maestro.

## Limites clínicos e de privacidade

O incremento não:

- diagnostica transtornos ou fases de humor;
- prevê crises;
- classifica um registro como saudável ou perigoso;
- recomenda mudanças em medicamentos ou tratamentos;
- envia o texto do diário para modelos de IA;
- compartilha registros entre contas.

Os insights são derivados exclusivamente de contagens e médias dos dados registrados pelo próprio usuário.

## Critérios de aceite

- uma entrada salva reaparece após reiniciar o aplicativo;
- salvar offline cria um item `journal_entry` na fila de sincronização;
- o texto exige pelo menos uma emoção selecionada;
- uma conta não consegue consultar registros de outra conta;
- o pull remoto não sobrescreve uma alteração local pendente;
- a aba Insights considera somente os últimos sete dias;
- ausência de dados apresenta estado vazio sem conclusões clínicas;
- registros marcados para conversa são contabilizados;
- a migration local 8 e a migration remota 007 são aplicadas sem perda das entidades anteriores;
- `npm run check`, `supabase test db` e `supabase db lint --local` permanecem aprovados.

## Validação manual recomendada

1. Entrar com uma conta de homologação.
2. Criar um registro no Diário com duas emoções, um gatilho e uma estratégia.
3. Fechar e abrir o app para confirmar persistência local.
4. Desativar a rede, criar outro registro e confirmar que ele permanece visível.
5. Reativar a rede e executar sincronização.
6. Entrar em outro dispositivo com a mesma conta e confirmar o pull.
7. Abrir Insights e conferir contagens, médias e perguntas.
8. Entrar com outra conta no mesmo aparelho e confirmar isolamento.

## Próximo incremento recomendado

Sprint 03 / Incremento 02:

- filtros e busca no diário;
- edição e exclusão segura com tombstone;
- relatório semanal exportável para compartilhamento controlado;
- correlação descritiva entre sono, check-ins, cuidados e emoções;
- revisão clínica e de privacidade antes de qualquer análise semântica opcional.
