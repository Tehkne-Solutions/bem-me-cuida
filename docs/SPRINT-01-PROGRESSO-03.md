# Sprint 01 — Incremento 03

## Entregue

- variantes development, preview e production;
- perfis EAS com ambientes separados e APK interno;
- scripts de validação de ambiente e prontidão de staging;
- script para link, migrations e configuração do Supabase remoto;
- CI com qualidade, verificação de segredos e testes pgTAP;
- proteção do conteúdo no app switcher e captura no Android;
- estado de sincronização persistido por usuário;
- sincronização automática ao abrir, voltar ao primeiro plano e recuperar internet;
- envio e recuperação bidirecional de check-ins;
- controle de conflito por `client_updated_at` no PostgreSQL;
- backoff exponencial, quarentena após oito falhas e erros sanitizados;
- indicador de sincronização na Home e em Cuidado;
- deep links separados por ambiente;
- confirmação de e-mail direcionada ao callback do aplicativo;
- testes de domínio e política de retentativa.

## Validações executadas no ambiente atual

- sintaxe TypeScript/TSX;
- imports locais;
- JSON;
- scripts Node e shell;
- quatro migrations SQLite em banco limpo;
- varredura de arquivos sensíveis;
- `git diff --check`.

## Bloqueios externos

- o registro npm permaneceu sem responder e impediu instalação completa;
- não há credenciais Supabase ou Expo no ambiente;
- não foi possível executar typecheck completo, Expo config, pgTAP real ou gerar APK;
- o repositório GitHub remoto ainda precisa ser criado/vinculado.
