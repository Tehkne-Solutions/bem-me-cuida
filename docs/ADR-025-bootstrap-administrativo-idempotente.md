# ADR-025 — Bootstrap administrativo idempotente

## Status

Aceito.

## Contexto

A auditoria do Sprint 20 confirmou que os environments, variables e secrets necessários à candidata ainda não estavam configurados. O token padrão do GitHub Actions não possui autoridade administrativa suficiente para criar ou corrigir todos esses recursos.

Executar a configuração manualmente em várias telas aumenta o risco de divergência de nomes, ausência de variables, revisão incompleta e exposição acidental de tokens.

## Decisão

Criar um workflow manual que use dois secrets de bootstrap cadastrados externamente:

- um token GitHub administrativo de curta duração e escopo mínimo;
- um token EAS dedicado à candidata.

O workflow:

1. exige que o executor tenha permissão `admin` no repositório;
2. exige revisor diferente do executor;
3. valida um JSON contendo somente valores públicos;
4. cria ou atualiza os dois environments de forma idempotente;
5. configura revisão obrigatória e impede autoaprovação;
6. limita a implantação à branch `main`;
7. configura variables no repositório e nos environments;
8. grava `EXPO_TOKEN` diretamente nos environments sem publicá-lo;
9. gera relatório contendo apenas nomes, contagens e resultados;
10. despacha auditoria e captura protegida após aplicação bem-sucedida.

## Controles

- os tokens entram exclusivamente por secrets do repositório;
- o JSON de configuração rejeita padrões privilegiados;
- os processos externos são chamados sem shell e com argumentos separados;
- valores não entram no relatório JSON ou Markdown;
- erros não incluem stdout, stderr ou parâmetros sensíveis;
- o plano pode ser gerado sem mutações;
- o apply falha fechado quando secrets, revisor ou evidências estão ausentes;
- o bootstrap não aprova gates, não promove release e não inicia build.

## Consequências positivas

- configuração reproduzível;
- redução do trabalho manual;
- correção idempotente;
- revisão por outra conta;
- menor risco de nomes divergentes;
- trilha auditável nas issues e nos artefatos.

## Consequências negativas

- dois secrets ainda precisam ser cadastrados manualmente;
- o token administrativo precisa ser revogado após a configuração;
- os callbacks Supabase continuam exigindo configuração externa;
- evidências HTTPS continuam sendo responsabilidade operacional;
- a configuração correta dos nomes não substitui homologação física.

**Tehkné Solutions**
