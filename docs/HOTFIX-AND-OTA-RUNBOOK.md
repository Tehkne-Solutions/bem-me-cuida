# Runbook de hotfix e OTA

## Objetivo

Aplicar correções urgentes sem misturar código nativo, ambientes, aprovações ou evidências operacionais.

## 1. Classificar a correção

Use **OTA** somente quando a mudança afetar JavaScript, TypeScript ou assets compatíveis com o runtime instalado.

Use **novo binário** quando houver:

- nova dependência nativa;
- alteração de plugin Expo;
- alteração de permissões;
- mudança de package, bundle identifier ou scheme;
- alteração de configuração nativa;
- atualização do Expo SDK ou React Native;
- mudança de runtimeVersion;
- migration que impeça retorno seguro ao bundle anterior.

## 2. Abrir o hotfix

No aplicativo, uma conta `release_operator` abre **Conta e Privacidade → Sustentação, hotfix e OTA** e registra:

- versão;
- tipo;
- severidade;
- commit de origem;
- runtime;
- resumo técnico;
- presença de mudança nativa.

O hotfix começa como `draft`.

## 3. Aprovação independente

1. O criador solicita aprovação.
2. Uma conta diferente com `release_admin` revisa o diff, os testes e o escopo.
3. O administrador aprova ou rejeita.
4. O servidor bloqueia autoaprovação.

## 4. Validar OTA

Preencha o ambiente sem gravar segredos no repositório:

```bash
APP_VARIANT=rc
EXPO_PUBLIC_APP_ENV=hotfix-validation
EXPO_PUBLIC_EAS_PROJECT_ID=<uuid-real>
OTA_ACTION=publish-validation
OTA_HOTFIX_ID=<uuid>
OTA_APPROVAL_ID=<uuid-da-aprovacao>
OTA_RUNTIME_VERSION=0.10.0
OTA_CHANNEL=hotfix-validation
OTA_MESSAGE="Correção validada do fluxo de sincronização"
OTA_FINGERPRINT_SHA256=<sha256>
OTA_SOURCE_COMMIT=<commit>
OTA_ASSET_COUNT=<quantidade>
OTA_ROLLOUT_PERCENTAGE=5
OTA_NATIVE_CHANGES=false
```

Execute:

```bash
npm run release:check
npm run ota:check
npm run ota:publish:validation
```

O comando publica para `hotfix-validation`. Instale ou use uma build interna compatível com runtime `0.10.0` e valide:

- inicialização;
- autenticação;
- banco local e migrations;
- sincronização;
- check-in;
- Diário;
- plano de apoio;
- notificações;
- bloqueio biométrico;
- retorno ao bundle anterior quando aplicável.

## 5. Promover o mesmo grupo

Depois de homologar, use o group ID validado:

```bash
APP_VARIANT=production
EXPO_PUBLIC_APP_ENV=production
OTA_ACTION=promote-production
OTA_CHANNEL=production
OTA_VALIDATED_GROUP_ID=<group-id-validado>
OTA_ROLLOUT_PERCENTAGE=5
```

Execute:

```bash
npm run ota:check
npm run ota:promote:production
```

A promoção republica o grupo já testado. Não gere um bundle novo entre validação e produção.

## 6. Registrar a publicação

No console de sustentação:

1. aprove o plano OTA com outra conta `release_admin`;
2. registre o EAS update group ID;
3. confirme que o hotfix mudou para `deployed`;
4. gere o manifesto:

```bash
npm run hotfix:manifest
```

Armazene o JSON junto ao ticket operacional, nunca junto a certificados ou tokens.

## 7. Rollout e observação

Ondas aceitas: 1%, 5%, 10%, 25%, 50% e 100%.

Antes de ampliar:

- verifique falhas de instalação no painel EAS;
- compare sessões sem falha;
- valide autenticação e sincronização;
- confira suporte e feedback bloqueador;
- confirme inexistência de SEV1/SEV2.

## 8. Cancelar rollout ativo

```bash
OTA_ACTION=cancel-rollout
OTA_CURRENT_GROUP_ID=<group-id-atual>
OTA_MESSAGE="Cancelamento do rollout por regressão técnica"
npm run ota:check
npm run ota:cancel-rollout
```

## 9. Rollback para grupo anterior

```bash
OTA_ACTION=rollback-production
OTA_ROLLBACK_GROUP_ID=<group-id-estável>
OTA_MESSAGE="Rollback para atualização estável anterior"
npm run ota:check
npm run ota:rollback:production
```

Depois, registre o rollback no console de sustentação com justificativa técnica de pelo menos dez caracteres.

## 10. Hotfix binário

1. Crie o hotfix como `binary`.
2. Obtenha aprovação independente.
3. Atualize a versão do aplicativo e o runtime.
4. Gere AAB/IPA pelos perfis de produção.
5. Registre URL HTTPS, build number e SHA-256.
6. Submeta às lojas.
7. Registre implantação apenas após o artefato correto estar disponível.
8. Use o rollout gradual da loja.

## Proibições

- não publicar OTA com mudança nativa;
- não aprovar a própria correção;
- não usar service role no aplicativo;
- não incluir dados emocionais ou clínicos em mensagens de update;
- não executar rollback somente no banco sem executar a ação correspondente no EAS ou na loja;
- não publicar diretamente em 100% sem exceção formal registrada.

**Tehkné Solutions**
