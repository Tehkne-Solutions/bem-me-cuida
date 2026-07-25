# Status da publicação remota

A branch `chore/finalizar-publicacao` consolida a fundação já enviada ao GitHub e prepara a continuidade do Sprint 02.

## Já presente na branch

- Configuração de CI, EAS e Maestro.
- Autenticação, cadastro, recuperação de acesso e callbacks.
- Home, check-in, diário inicial, cuidado, crise, histórico e diagnóstico.
- Contratos de domínio para autenticação, perfil, check-in e plano de cuidado.
- Supabase Auth, migrations, funções de sincronização e RLS.
- Scripts de segurança, staging e preparação de release.
- Tokens e documentação da identidade BemMeCuida.

## Bloqueios antes do merge

A publicação remota ainda precisa receber e validar:

- Configuração completa do aplicativo Expo e package do workspace mobile.
- Telas de medicamentos, práticas e onboarding ainda não presentes na árvore remota consolidada.
- Repositórios SQLite, migrations locais e serviços restantes.
- Componentes compartilhados e documentação técnica complementar.
- Cinco assets oficiais já armazenados como blobs Git, mas ainda não vinculados integralmente na árvore do PR.
- Execução dos checks completos do CI.

Por segurança, este PR deve permanecer em rascunho até esses itens serem concluídos.

**Tehkné Solutions**
