# Sprint 02 — Plano de cuidado diário

**Produto:** BemMeCuida
**Versão:** 0.2.0
**Assinatura:** Tehkné Solutions

## Objetivo

Entregar uma vertical slice local-first para organizar medicamentos prescritos e práticas de autocuidado, registrar o que aconteceu no dia e manter esses dados sincronizados sem transformar o aplicativo em prescritor ou avaliador clínico.

## Escopo entregue

- cadastro de medicamento, dose textual, profissional, período e horário;
- seleção de dias da semana;
- lembretes locais discretos e opt-in;
- registro de tomada ou não tomada;
- cadastro de práticas terapêuticas e de autocuidado;
- categorias, duração, dias, horário e lembrete;
- registro de conclusão ou não realização sem gamificação punitiva;
- resumo de cuidados na Home;
- histórico unificado;
- banco local criptografado no schema 7;
- fila offline para cinco novos tipos de entidade;
- sincronização bidirecional com conflito last-write-by-client-time;
- cursores independentes por entidade;
- tabelas Supabase, RLS e funções de sync/pull;
- diagnóstico de permissão e quantidade de lembretes locais.

## Limites clínicos

O aplicativo não:

- recomenda ou altera doses;
- sugere início ou interrupção de medicamentos;
- avalia interações medicamentosas;
- classifica a adesão como sucesso ou fracasso;
- substitui o profissional responsável.

## Critérios de aceite

- um medicamento cadastrado reaparece após reiniciar o app;
- o registro de tomada funciona sem internet;
- uma prática pode ser concluída ou marcada como não realizada;
- a Home apresenta totais do dia sem punição por pendências;
- notificações exibem apenas texto genérico;
- negar a permissão não impede salvar o cuidado;
- dados de uma conta não aparecem em outra conta no mesmo aparelho;
- filas de cuidado não são interpretadas como check-ins;
- RLS protege todas as novas tabelas;
- chaves estrangeiras impedem relacionamentos entre contas distintas;
- conflito remoto mais novo provoca nova leitura e reconciliação.

## Pendências para homologação

- instalar dependências pelo npm;
- executar typecheck e lint com dependências reais;
- aplicar a migration 005 em Supabase local/staging;
- executar pgTAP;
- gerar development build com `expo-notifications` e SQLCipher;
- validar lembretes em Android e iOS físicos;
- testar sincronização com duas contas e dois dispositivos.
