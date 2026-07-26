# BemMeCuida — Produção 1

Versão-base: `0.10.0`  
Identificador operacional: `production-1`  
Assinatura: **Tehkné Solutions**

## Pré-condições

- PR de release mesclado e CI verde;
- migrations aplicadas em staging e produção;
- candidata correspondente em estado `promoted`;
- build de audiência `store` registrado;
- URLs públicas de suporte, privacidade e termos;
- callbacks `bemmecuida://auth/callback` e `bemmecuida://reset-password` validados;
- conta operacional com papel assinado;
- homologação Android e, quando aplicável, iOS;
- nenhuma ocorrência SEV1 ou SEV2 aberta.

## Verificações

```bash
npm install
npm run config:check
npm run security:check
npm run release:check
npm run sprint11:check

APP_VARIANT=production \
EXPO_PUBLIC_APP_ENV=production \
EXPO_PUBLIC_PRODUCTION_RELEASE=1 \
npm run production:check
```

## Banco

```bash
npm run supabase:push:staging
```

Antes de produção, aplicar migrations por um processo administrativo protegido. Não inclua senha de banco ou token de acesso no aplicativo.

## Builds

```bash
npm run build:android:production
npm run build:ios:production
```

O Android de produção gera AAB. A RC continua gerando APK interno e não deve ser enviada como pacote de produção.

## Pacote de submissão

Calcule o SHA-256 do artefato baixado e configure o `.env` local:

```bash
ANDROID_BUILD_NUMBER=<numero>
ANDROID_ARTIFACT_URL=https://<artefato-aab>
ANDROID_ARTIFACT_SHA256=<sha256>
PRODUCTION_SUPPORT_URL=https://<dominio>/suporte
PRODUCTION_PRIVACY_URL=https://<dominio>/privacidade
PRODUCTION_TERMS_URL=https://<dominio>/termos
```

Depois execute:

```bash
npm run store:package
```

O JSON gerado deve ser anexado ao registro interno da release. Ele não contém credenciais de assinatura.

## Submissão

A submissão pode ser executada somente após revisar o build correto:

```bash
npm run submit:android:production
npm run submit:ios:production
```

Esses comandos dependem de credenciais configuradas no ambiente seguro do EAS e das lojas.

## Registro no console

1. Registre o build de loja no console de releases.
2. Registre a submissão e sua referência externa.
3. Atualize o estado conforme a revisão da loja.
4. Aguarde `approved` ou `published`.
5. Inicie o rollout em 1%.
6. Registre uma leitura técnica agregada.
7. Avance somente quando cliente e servidor não mostrarem bloqueadores.

## Ondas

| Onda | Janela mínima sugerida | Ação |
|---|---:|---|
| 1% | homologação inicial | validar autenticação, sync e inicialização |
| 5% | após leitura estável | ampliar amostra |
| 10% | após nova leitura | revisar suporte e notificações |
| 25% | após estabilidade | validar comportamento regional |
| 50% | após estabilidade sustentada | preparar conclusão |
| 100% | após gates finais | concluir rollout |

A duração real depende do volume e do risco. Não avance apenas porque uma janela de tempo terminou.

## Rollback

- pause imediatamente quando houver sinal inconclusivo;
- abra incidente SEV1 ou SEV2 quando houver impacto crítico;
- execute rollback no console com justificativa;
- interrompa ou reverta a distribuição no console da loja;
- preserve artefatos, manifesto e auditoria;
- publique correção como nova candidata, nunca substituindo silenciosamente o artefato anterior.

## Encerramento

A produção só é considerada concluída quando o rollout estiver em 100%, não houver incidente crítico aberto e o período pós-publicação estiver documentado.

**Tehkné Solutions**
