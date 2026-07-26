# ADR-019 — RC 0.11 isolada, upgrade e compatibilidade OTA

## Contexto

A produção permanece em `0.10.0`, enquanto o ciclo `0.11.0` precisa ser homologado sem sobrescrever builds anteriores nem receber atualizações incompatíveis.

## Decisão

Criar a variante `rc011` com identidade nativa própria:

- nome: `BemMeCuida 0.11 RC`;
- Android: `com.tehknesolutions.bemmecuida.rc011`;
- iOS: `com.tehknesolutions.bemmecuida.rc011`;
- scheme: `bemmecuida-rc011`;
- versão: `0.11.0`;
- candidata: `1`;
- runtime: `0.11.0`;
- canal: `rc-0-11`;
- distribuição: interna.

A versão é fornecida por `EXPO_PUBLIC_APP_VERSION` somente no perfil da RC. A configuração base e a produção continuam em `0.10.0` até uma promoção real.

## Versionamento nativo

O EAS permanece como autoridade remota para `versionCode` e `buildNumber`, com `autoIncrement`. Os valores retornados pelo build devem ser registrados no manifesto juntamente com build ID, URL HTTPS e SHA-256.

## Upgrade

Como a variante isolada não substitui a produção, dois fluxos são obrigatórios:

1. instalação paralela para homologação segura;
2. teste de upgrade no package oficial em ambiente protegido antes da promoção.

O segundo fluxo valida preservação do banco local criptografado, autenticação, fila offline, notificações e preferências.

## OTA

A RC aceita somente updates do canal `rc-0-11` e runtime `0.11.0`. Updates da produção `0.10.0`, da RC antiga ou do canal de hotfix não são compatíveis.

## Segurança

- nenhuma credencial no aplicativo ou manifesto;
- `EXPO_TOKEN` apenas no environment GitHub protegido;
- evidências técnicas sem dados pessoais ou clínicos;
- promoção condicionada a checksums, aparelhos físicos, upgrade, banco local e OTA.

## Consequências

A RC pode ser instalada ao lado das versões existentes. A promoção exige trabalho externo no EAS, Supabase e aparelhos físicos, mas todas as decisões e evidências ficam versionadas e auditáveis.

**Tehkné Solutions**
