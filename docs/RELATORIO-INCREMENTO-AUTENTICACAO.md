# Relatório técnico — Autenticação e onboarding

**Produto:** BemMeCuida
**Responsável:** Tehkné Solutions
**Data:** 24 de julho de 2026

## Entregas concluídas

1. Fluxos de entrada, cadastro, confirmação de e-mail, recuperação e redefinição de senha.
2. Sessão protegida no dispositivo e renovação automática enquanto o app está ativo.
3. Separação de rotas públicas, onboarding e área autenticada com Expo Router Protected Routes.
4. Onboarding em três etapas com limites clínicos, identificação e consentimentos.
5. Minutas funcionais de Termos de Uso, Privacidade e tratamento de dados de saúde.
6. Criação automática de perfil após cadastro no Supabase.
7. Conclusão transacional do onboarding por função PostgreSQL.
8. Cache local do status de onboarding para inicialização offline.
9. Correção de isolamento dos check-ins e da fila de sincronização por usuário.
10. Área de conta com atualização de perfil e encerramento de sessão.

## Validações executadas

- parsing sintático de todos os arquivos TypeScript e TSX: aprovado;
- verificação de imports locais e aliases: aprovada;
- validação de todos os arquivos JSON: aprovada;
- execução das três migrations SQLite em banco temporário: aprovada;
- `git diff --check`: aprovado;
- revisão manual das políticas RLS e da função de onboarding: concluída.

## Validações bloqueadas pelo ambiente

O registro npm respondeu HTTP 503 durante a instalação. Por isso, neste ambiente não foi possível executar `npm run typecheck`, `npm run lint` ou gerar o development build. Esses comandos permanecem obrigatórios no CI ou em uma máquina com acesso ao registro.

## Configurações externas pendentes

- criar projeto Supabase de staging;
- aplicar migrations PostgreSQL;
- adicionar `bemmecuida://**` aos redirects do Supabase Auth;
- configurar remetente e templates de e-mail;
- preencher as variáveis públicas do Expo;
- gerar build Android de desenvolvimento;
- revisar documentos legais com profissional habilitado.
