# ADR-022 — Bootstrap externo e PR automatizado de evidências

## Status

Aceito.

## Contexto

O Sprint 17 criou um gate verificável para environments, EAS, Supabase e callbacks. A configuração ainda dependia de copiar uma lista extensa de variables, baixar artefatos manualmente e preparar um PR sem automação. Esse processo aumentava o risco de omissão, exposição acidental de secrets e uso de uma captura diferente da realmente validada.

## Decisão

A operação será dividida em duas automações independentes.

### Bootstrap

Um manifesto versionado declara environments, secret names, variables e callbacks. Um gerador produz scripts Bash e PowerShell que:

- criam os environments pela API do GitHub;
- solicitam `EXPO_TOKEN` por entrada segura do GitHub CLI;
- cadastram apenas variables públicas já definidas no ambiente do operador;
- não armazenam valores de secrets;
- orientam a configuração manual dos callbacks e das regras de proteção.

### PR de evidências

Depois da captura protegida, um workflow:

1. baixa o artefato consolidado pelo run ID;
2. substitui o registro apenas no workspace temporário;
3. exige `rc011:infrastructure:external` aprovado;
4. executa os release checks;
5. cria uma branch exclusiva;
6. abre um PR com metadados mínimos;
7. dispara o CI da branch;
8. vincula a issue operacional, quando informada.

## Controles

- inputs externos são validados antes do shell;
- run ID e issue aceitam somente números;
- commit aceita somente SHA de 40 caracteres;
- o workflow não acessa `service_role`;
- `EXPO_TOKEN` nunca é transportado em argumento de linha de comando;
- a captura precisa estar integralmente `ready`;
- somente o arquivo de prontidão externa entra no PR automático;
- o merge continua sujeito a revisão e CI;
- dados pessoais e clínicos são proibidos.

## Consequências positivas

- menor risco de configuração incompleta;
- menor exposição de secrets;
- rastreabilidade entre issue, run de captura e PR;
- mesma captura validada é a captura proposta para merge;
- operação reproduzível em Windows, Linux e macOS;
- bloqueio preservado até evidência externa real.

## Consequências negativas

- ainda exige permissões administrativas externas;
- proteção e revisores não podem ser inferidos apenas pelo repositório;
- o operador precisa fornecer variables públicas reais;
- a criação automática do PR depende das permissões do `GITHUB_TOKEN`.

## Assinatura

**Tehkné Solutions**
