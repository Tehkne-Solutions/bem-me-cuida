# Pacote de submissão às lojas

## Finalidade

O pacote consolida artefatos e documentos necessários para uma submissão controlada. Ele não envia o aplicativo, não substitui os consoles oficiais e não contém credenciais.

## Geração

Configure em `.env` local:

```bash
ANDROID_BUILD_NUMBER=<numero>
ANDROID_ARTIFACT_URL=https://<artefato-aab>
ANDROID_ARTIFACT_SHA256=<sha256>
PRODUCTION_SUPPORT_URL=https://<dominio>/suporte
PRODUCTION_PRIVACY_URL=https://<dominio>/privacidade
PRODUCTION_TERMS_URL=https://<dominio>/termos
```

Para incluir iOS, configure também:

```bash
IOS_BUILD_NUMBER=<numero>
IOS_ARTIFACT_URL=https://<artefato-ios>
IOS_ARTIFACT_SHA256=<sha256>
```

Execute:

```bash
npm run store:package
```

## Conteúdo

- produto e assinatura;
- versão-base e número da produção;
- horário de geração;
- URLs públicas legais e de suporte;
- número, URL e SHA-256 dos artefatos;
- hashes dos documentos editoriais e operacionais;
- sequência de rollout;
- limites técnicos internos;
- declaração de que métricas não contêm conteúdo emocional.

## Documentos incorporados por hash

- ficha da loja em pt-BR;
- matriz de segurança de dados;
- checklist de prontidão;
- este documento;
- runbook da produção;
- resposta a incidentes;
- monitoramento pós-publicação.

## Validação

Antes de usar o pacote:

1. baixar novamente o artefato;
2. calcular SHA-256 localmente;
3. comparar com o JSON;
4. confirmar versão e número do build;
5. abrir cada URL legal em navegação anônima;
6. revisar os textos nos consoles oficiais;
7. registrar a referência externa no console operacional.

## Proibições

Não incluir:

- chave de assinatura;
- senha do banco;
- token do EAS;
- service role;
- credencial das lojas;
- lista de usuários;
- feedback bruto;
- conteúdo emocional ou clínico.

## Guarda

O pacote pode ser anexado à release interna ou armazenado em repositório administrativo. O artefato binário deve seguir o controle de acesso definido para builds de produção.

**Tehkné Solutions**
