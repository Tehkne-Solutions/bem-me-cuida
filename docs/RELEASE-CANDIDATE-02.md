# BemMeCuida 0.10.0 RC 2

## Identificação

- Nome instalado: `BemMeCuida RC`;
- release: `0.10.0-rc.2`;
- Android: `com.tehknesolutions.bemmecuida.rc`;
- iOS: `com.tehknesolutions.bemmecuida.rc`;
- scheme: `bemmecuida-rc`;
- canal EAS: `rc`;
- distribuição: interna;
- assinatura do produto: Tehkné Solutions.

## Pré-condições

1. projeto Supabase de staging isolado;
2. migrations aplicadas até `202607250012`;
3. conta sintética comum;
4. conta sintética com `app_metadata.role=release_operator`;
5. callbacks `bemmecuida-rc://auth/callback` e `bemmecuida-rc://reset-password`;
6. credenciais públicas configuradas no ambiente EAS `preview`;
7. nenhuma credencial administrativa no `.env` público.

## Comandos

```bash
npm run security:check
npm run release:check
npm run sprint10:check
npm run supabase:push:staging

APP_VARIANT=rc npm run config:check
APP_VARIANT=rc npm run staging:check
APP_VARIANT=rc npm run rc:check

npm run build:android:rc
```

Depois do build:

```bash
RELEASE_BUILD_NUMBER=<numero> \
RELEASE_ARTIFACT_URL=https://<url-do-apk> \
RELEASE_ARTIFACT_SHA256=<sha256> \
RELEASE_MANIFEST_OUTPUT=artifacts/bemmecuida-0.10.0-rc.2.json \
npm run release:manifest
```

## Registro no console

1. entrar com a conta operacional;
2. abrir **Conta e Privacidade**;
3. abrir **Console operacional de releases**;
4. criar `0.10.0-rc.2`;
5. registrar o build e seu SHA-256;
6. mover a candidata para QA;
7. executar os gates;
8. vincular feedback relevante;
9. resolver bloqueadores;
10. aprovar;
11. promover.

## Gates obrigatórios

- CI de qualidade;
- CI de banco;
- instalação Android;
- callbacks de autenticação;
- offline e sincronização;
- privacidade;
- acessibilidade;
- ficha da loja;
- segurança de dados;
- classificação etária;
- contato de suporte;
- revisão legal.

O gate iOS é opcional nesta candidata, mas deve se tornar obrigatório antes de distribuição iOS.

## Critérios de bloqueio

- crash, perda de dados ou falha de autenticação;
- conteúdo emocional exposto em notificação ou seletor de aplicativos;
- isolamento entre contas quebrado;
- sincronização duplicando ou ressuscitando registros excluídos;
- feedback `blocking` ou prioridade `urgent` em aberto;
- build sem URL HTTPS;
- SHA-256 divergente;
- política, classificação ou formulário de dados incompletos.

## Rollback

1. revogar o build no console;
2. marcar a candidata como `rolled_back`;
3. registrar a justificativa;
4. interromper novos convites;
5. manter o build anterior disponível;
6. comunicar os testers sem mencionar dados individuais;
7. abrir correção em nova candidata, nunca sobrescrever a evidência anterior.

## Aceite

A RC 2 só pode ser tratada como promovida quando a RPC do banco concluir com sucesso. O status visual do aplicativo não substitui a decisão server-side.

## Assinatura

Tehkné Solutions.
