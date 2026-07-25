# Sprint 01 — Incremento 04

## Entregue

- cursor de sincronização composto por `updated_at` e `id`;
- RPC paginada para não omitir registros que compartilham o mesmo timestamp;
- recuperação segura quando o servidor possui uma versão mais nova;
- reset persistente do cursor antes da reconciliação completa;
- migration local 5 e migration remota 004;
- diagnóstico técnico dentro do aplicativo;
- verificação real de schema local, SQLCipher, SecureStore, rede, sessão e fila;
- bloqueio fail-closed: Android/iOS não continuam se SQLCipher não estiver ativo;
- relatório técnico compartilhável sem nome, e-mail, IDs, tokens ou conteúdo emocional;
- identificadores estáveis para testes de interface;
- fluxo Maestro público para login e acesso ao modo de crise;
- fluxo Maestro autenticado para login e check-in sintético;
- perfil EAS específico para testes E2E;
- workflow Android acionado pela label `e2e`;
- checklist completo de homologação em aparelho físico e dois dispositivos;
- verificação estática de prontidão para release.

## Validações executadas

- 59 arquivos TypeScript/TSX analisados sintaticamente;
- 7 arquivos JSON válidos;
- 5 arquivos YAML válidos;
- cinco migrations SQLite aplicadas em banco limpo;
- 9 testes puros aprovados;
- script de release aprovado;
- scripts shell verificados;
- `git diff --check` aprovado.

## Bloqueios externos

- o registro npm permanece inacessível por DNS no ambiente atual;
- não há credenciais Supabase de staging;
- não há login Expo/EAS para gerar o APK;
- Docker, Supabase CLI e Android Debug Bridge não estão disponíveis;
- o repositório GitHub remoto ainda não foi criado pela conexão disponível.

Esses bloqueios impedem alegar typecheck completo com dependências, pgTAP real, execução Maestro, APK instalado ou validação em dois dispositivos.
