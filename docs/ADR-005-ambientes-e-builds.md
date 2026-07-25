# ADR-005 — Ambientes e builds isolados

## Status

Aprovado no Sprint 01.

## Decisão

O aplicativo possui três variantes:

| Variante | Nome instalado | Identificador Android/iOS | Deep link |
|---|---|---|---|
| development | BemMeCuida Dev | `com.tehknesolutions.bemmecuida.dev` | `bemmecuida-dev://` |
| preview | BemMeCuida Preview | `com.tehknesolutions.bemmecuida.preview` | `bemmecuida-preview://` |
| production | BemMeCuida | `com.tehknesolutions.bemmecuida` | `bemmecuida://` |

As variáveis públicas ficam no ambiente EAS correspondente. Tokens administrativos do Supabase existem apenas no terminal seguro ou nos secrets do CI.

Builds development e preview geram APK de distribuição interna. Produção usa o formato padrão da loja e incremento remoto de versão.
