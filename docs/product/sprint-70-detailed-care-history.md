# Sprint 70 — Histórico detalhado

## Objetivo

Evoluir a tela de histórico existente para permitir consulta local, filtrada e progressiva dos registros já suportados pelo aplicativo.

## Implementação

- acesso pela seção Atividade recente da Home;
- busca por título e detalhe;
- filtros por medicamentos, práticas e check-ins;
- períodos de 7, 30, 90 dias ou todo o histórico;
- paginação local de 20 itens por vez;
- agrupamento por data;
- horário local e estado de sincronização por registro;
- navegação para a tela de origem;
- estados de carregamento, vazio e falha recuperável;
- funcionamento offline.

## Limites

- somente entidades já existentes no domínio são exibidas;
- nenhum dado clínico é inferido;
- o histórico não avalia eficácia, segurança ou adesão ao tratamento;
- consultas permanecem na agenda e não foram misturadas à atividade registrada nesta etapa.

## Critérios de aceitação

- [x] busca retorna registros por título ou detalhe;
- [x] filtros de tipo e período reiniciam a paginação;
- [x] vinte registros são carregados por página;
- [x] o botão Carregar mais aparece apenas quando necessário;
- [x] cada item informa seu estado de sincronização;
- [x] a tela continua disponível sem conexão;
- [x] falhas não sugerem exclusão ou perda de dados;
- [x] a Home oferece acesso explícito ao histórico completo.
