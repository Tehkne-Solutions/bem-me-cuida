# ADR-014 — Operação de release com RBAC e promoção server-side

## Status

Aceito no Sprint 10.

## Contexto

A beta passou a receber feedback e preparar candidatas internas. A próxima etapa exige triagem e decisão de promoção, mas inserir uma chave administrativa no aplicativo violaria o modelo de segurança do projeto.

Também não é suficiente esconder uma tela por interface: a autorização precisa ser garantida pelo banco, e toda ação que altera o estado de uma release deve deixar evidência operacional.

## Decisão

### Identidade operacional

O papel é lido exclusivamente de `auth.users.app_metadata.role`, preenchido por uma operação administrativa fora do aplicativo.

Papéis aceitos:

- `release_operator`;
- `release_admin`.

`user_metadata` não concede acesso porque pode ser alterado pelo próprio titular em alguns fluxos.

### Autorização em profundidade

- o botão do console é ocultado para sessões comuns;
- a rota exibe acesso negado quando aberta diretamente;
- RLS impede leitura das tabelas operacionais;
- RPCs `security definer` repetem a verificação do papel;
- não há `service_role`, token pessoal ou senha de banco no bundle.

### Escrita por comandos

O cliente não recebe `insert`, `update` ou `delete` nas tabelas de release. Toda mutação passa por RPCs específicas, que:

1. validam o papel;
2. validam a transição;
3. alteram somente os campos permitidos;
4. gravam `operator_audit_log`.

### Promoção

A promoção é uma RPC atômica e não uma atualização genérica de status. Ela revalida gates, build Android, status aprovado e feedback bloqueador.

## Alternativas rejeitadas

### Chave `service_role` no aplicativo

Rejeitada porque permitiria contornar todas as políticas RLS e exporia o ambiente inteiro em caso de engenharia reversa.

### Autorização apenas na interface

Rejeitada porque uma chamada direta ao Supabase poderia ignorar a navegação.

### Atualização direta das tabelas pelo operador

Rejeitada porque dificultaria transições válidas e auditoria consistente.

### Painel externo completo neste incremento

Adiado. O console móvel interno atende a homologação imediata sem introduzir outra aplicação e outro ciclo de autenticação. Um painel web dedicado poderá consumir as mesmas RPCs futuramente.

## Consequências

### Positivas

- menor superfície de privilégio;
- transições auditáveis;
- promoção reproduzível;
- bloqueadores consistentes entre UI e banco;
- base reutilizável por um painel web futuro.

### Custos

- o papel precisa ser atribuído fora do app;
- os consoles das lojas continuam externos;
- o operador precisa manter evidências e links de artefatos;
- mudanças nos gates exigem migration ou nova RPC.

## Assinatura

Tehkné Solutions.
