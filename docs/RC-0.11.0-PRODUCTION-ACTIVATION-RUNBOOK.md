# Runbook — ativação de produção do BemMeCuida 0.11.0

## 1. Pré-condições

Antes de qualquer ação de produção:

- infraestrutura da RC em `ready`;
- builds e testes da candidata aprovados;
- publicação e rollback OTA validados em Android e iOS;
- pacote final da candidata com recomendação `promote`;
- zero bloqueadores críticos;
- commit de origem imutável.

## 2. Environment protegido

Criar `production-release` com:

- revisores obrigatórios diferentes do executor;
- implantação limitada à `main`;
- secret `EXPO_TOKEN`;
- variables `EAS_PROJECT_ID`, `PRODUCTION_SUPABASE_URL`, `PRODUCTION_SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_SUPPORT_URL`, `PRODUCTION_PRIVACY_URL` e `PRODUCTION_TERMS_URL`.

Registrar somente presença, nomes e evidência HTTPS. Nunca versionar valores.

## 3. Atestações

Executar três capturas independentes:

```text
release-admin
qa-lead
privacy-security
```

Cada uma precisa de evidência HTTPS. Abrir e revisar um PR para cada captura. A mesma conta não pode aprovar dois papéis.

## 4. Rascunho da release

Gerar o pacote de ativação. Somente quando a recomendação for `ready-to-create-draft-release`, executar `create-draft-release`.

A release `v0.11.0` deve permanecer em modo rascunho até o rollout chegar a 100% e o período de observação ser concluído.

## 5. Builds oficiais

Após o PR do rascunho:

- gerar Android com package `com.tehknesolutions.bemmecuida` e formato AAB;
- gerar iOS com bundle `com.tehknesolutions.bemmecuida` e formato IPA;
- calcular SHA-256 do arquivo baixado;
- abrir PR de custódia para cada plataforma;
- instalar e conferir exatamente os artefatos destinados às lojas.

## 6. Submissões

Preencher URLs legais e gerar o pacote editorial. As submissões são executadas nos consoles oficiais ou pelo EAS sob environment protegido.

Estados aceitos nos registros:

```text
pending → submitted → approved
                 ↘ rejected
```

A aprovação de uma loja não substitui a aprovação da outra.

## 7. Rollout gradual

Executar os estágios em ordem:

```text
1% → 5% → 10% → 25% → 50% → 100%
```

Após cada estágio, registrar:

- percentual de sessões sem crash;
- sucesso de sincronização;
- sucesso de autenticação;
- incidentes críticos;
- relatos bloqueadores de suporte;
- evidência HTTPS agregada.

Abrir e revisar o PR da observação antes de iniciar o próximo estágio.

## 8. Pausa e rollback

Pausar diante de:

- regressão de crashes;
- regressão de sincronização;
- regressão de autenticação;
- incidente crítico;
- relato bloqueador de suporte;
- decisão manual de segurança.

Rollback retorna para `0.10.0` ou para o último artefato estável indicado pelo responsável. Registrar a operação e preservar todas as evidências.

## 9. Encerramento

Somente após 100% aprovado:

- confirmar instalação pelas lojas;
- publicar a GitHub Release;
- atualizar o ciclo e os gates no Supabase;
- iniciar acompanhamento pós-release;
- remover credenciais temporárias;
- manter os registros históricos imutáveis.

## Privacidade

Usar contas sintéticas e dados agregados. Não anexar textos do Diário, emoções, diagnósticos, medicamentos, informações de crise, tokens ou identificadores únicos de aparelhos.

Tehkné Solutions.
