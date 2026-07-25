# ADR-007 — Diário e insights não clínicos

## Decisão

O diário é armazenado localmente em SQLCipher e sincronizado como uma entidade sensível isolada por usuário. Insights são calculados no aparelho a partir de contagens, frequências e médias simples.

## Motivos

- textos livres podem conter dados de saúde, substâncias, relações e crises;
- resumos determinísticos são auditáveis e reduzem o risco de interpretações clínicas indevidas;
- o compartilhamento deve ser explícito e excluir o texto integral por padrão;
- linguagem de apoio deve assumir possibilidade de erro e nunca bloquear a escrita.

## Consequências

- nenhum conteúdo do diário entra em logs ou analytics;
- não há classificação diagnóstica nem previsão de episódios;
- qualquer futura análise assistiva exigirá consentimento separado, minimização de dados e revisão de segurança.
