# Sprint 65 — Resiliência de dados na tela inicial

## Problema

A tela inicial convertia qualquer erro de leitura local ou sincronizada em um resumo vazio. Isso tornava falhas temporárias indistinguíveis de um usuário sem registros e podia transmitir a impressão incorreta de perda de dados.

## Objetivo

Tornar o estado dos dados da tela inicial explícito e recuperável, sem substituir falhas por valores zerados.

## Entregas

- estado de carregamento inicial;
- estado de erro com mensagem clara;
- ação manual de nova tentativa;
- preservação do último resumo válido quando uma atualização falhar;
- proteção contra atualização de estado após a tela perder foco;
- identificadores de teste para os estados principais.

## Critérios de aceitação

1. Enquanto os dados são carregados, a tela informa que está preparando o resumo.
2. Quando uma leitura falha antes de existir conteúdo válido, a tela mostra erro em vez de zeros.
3. O usuário consegue tentar carregar novamente.
4. Se uma atualização posterior falhar, o último conteúdo válido permanece visível com um aviso não destrutivo.
5. TypeScript, lint e testes do repositório permanecem verdes.
