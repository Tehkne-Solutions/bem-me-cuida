# Sprint 69 — Atividade recente na Home

## Objetivo

Mostrar na tela Hoje os registros mais recentes que já existem no domínio do produto: tomadas de medicação, conclusões de práticas e check-ins emocionais.

## Escopo implementado

- até seis atividades recentes em ordem cronológica decrescente;
- horário local do registro;
- título e detalhe contextual;
- estado `Sincronizado` ou `Aguardando sincronização` por item;
- acesso à tela de origem;
- atualização ao voltar para a Home, ao sincronizar, ao registrar e ao desfazer;
- estado vazio e falha de leitura não destrutivos;
- suporte a leitor de tela com descrição completa do item.

## Limites

Categorias como água, sono avulso e exercício não foram adicionadas porque ainda não possuem entidades próprias no domínio atual. A sprint não inventa registros nem altera dados clínicos.

## Critérios de aceitação

- [x] medicação registrada aparece na atividade recente;
- [x] prática concluída aparece na atividade recente;
- [x] check-in aparece na atividade recente;
- [x] desfazer remove o registro da lista após atualização;
- [x] cada item informa seu estado de sincronização;
- [x] a lista funciona offline com os dados locais;
- [x] falha de leitura não sugere perda de registros;
- [x] os contratos existentes da Home permanecem preservados.
