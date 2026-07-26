# Sprint 10 — Operação da RC e preparação das lojas

## Objetivo

Transformar a RC 1 em uma operação de release controlada, com segregação de privilégios, gates verificáveis, registro de artefatos, triagem de feedback, auditoria e preparação da RC 2 para homologação final.

## Entregas

### Console operacional

- acesso somente para contas cujo `app_metadata.role` seja `release_operator` ou `release_admin`;
- criação de candidatas por versão e número de RC;
- gates obrigatórios e opcionais;
- registro e revogação de builds;
- triagem de feedback com status, prioridade e vínculo à candidata;
- pausa e reativação de testers;
- histórico de auditoria;
- pré-visualização local dos bloqueadores;
- promoção executada exclusivamente por RPC protegida.

### Banco e segurança

- tabelas `release_candidates`, `release_gates`, `release_builds` e `operator_audit_log`;
- RLS em todas as tabelas operacionais;
- função `is_release_operator()` baseada em `app_metadata` assinado pelo Supabase Auth;
- RPCs `security definer` com validação explícita do papel;
- nenhuma operação administrativa direta pelo cliente;
- nenhuma chave `service_role` no aplicativo;
- logs de auditoria para criação, gate, build, triagem, tester, status, promoção e revogação.

### Promoção

Uma candidata só pode ser promovida quando:

1. estiver com status `approved`;
2. todos os gates obrigatórios estiverem `passed`;
3. houver ao menos um build Android `available`;
4. não existir feedback vinculado com impacto `blocking` ou prioridade `urgent` em aberto.

A aprovação e a promoção são ações separadas. O console mostra a prontidão, mas o banco é a autoridade final.

### RC 2

- base de versão `0.10.0`;
- release exibida `0.10.0-rc.2`;
- canal EAS `rc`;
- distribuição interna;
- pacote e scheme isolados;
- manifesto operacional gerável por script;
- checklist de loja, segurança de dados e rollback.

## Limites

- o console não cria usuários operadores;
- a atribuição do papel deve ocorrer em ambiente administrativo seguro;
- o aplicativo não envia APKs para lojas;
- links de artefato são apenas registrados após o build externo;
- a promoção no banco não substitui a ação final nos consoles Google Play ou App Store Connect;
- dados emocionais continuam fora da observabilidade e da auditoria operacional.

## Validação automatizada

- `npm run release:check`;
- `npm run sprint10:check`;
- TypeScript estrito;
- lint;
- testes da política local;
- migrations e pgTAP;
- lint PostgreSQL;
- Expo config pública;
- `.maestro/operator-console.yml` com conta sintética operacional.

## Homologação manual

- definir um operador de teste por `app_metadata`;
- confirmar que usuários comuns não veem o botão e recebem acesso negado por rota direta;
- criar a RC 2;
- registrar um build Android real;
- validar gates e bloqueadores;
- triar feedback sintético;
- promover somente após aprovação;
- conferir auditoria;
- testar revogação e rollback;
- revisar os materiais de loja.

## Assinatura

Tehkné Solutions.
