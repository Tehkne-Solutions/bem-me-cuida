# ADR 060 — Validação dos pacotes de execução manual

## Status

Aceito.

## Contexto

Pacotes administrativos de sessão podem perder compatibilidade quando a autorização de origem, sua validação ou a estrutura aprovada muda.

## Decisão

Adotar um validador determinístico e somente leitura com oito classificações controladas. A compatibilidade exige referências vigentes, estrutura completa, ausência de duplicidade ou conflito e inexistência de conteúdo operacional proibido.

## Consequências

Pacotes obsoletos ou divergentes falham de forma fechada. A classificação compatível não autoriza execução automática, mutação de fonte, patch, branch funcional, merge ou ativação.
