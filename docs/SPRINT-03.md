# Sprint 03 — Diário emocional e insights pessoais

**Produto:** BemMeCuida  
**Versão:** 0.4.0  
**Assinatura:** Tehkné Solutions

## Objetivo

Entregar um diário emocional local-first que ajude o usuário a registrar acontecimentos, estados e temas pessoais, além de gerar resumos descritivos diários e semanais sem diagnóstico, previsão ou recomendação clínica.

## Escopo

- criação, edição, busca e arquivamento de entradas;
- humor rápido por emoji e intensidade opcional;
- marcadores pessoais e separação para conversar em terapia;
- linguagem local de apoio com incerteza explícita;
- resumos diário e semanal baseados somente nos registros do usuário;
- compartilhamento de resumo sem incluir o texto integral do diário;
- persistência SQLCipher no schema local 8;
- fila offline, sincronização bidirecional e cursor composto;
- tabela PostgreSQL com RLS e testes pgTAP.

## Limites clínicos

O BemMeCuida não:

- diagnostica transtornos ou crises;
- determina causalidade entre hábitos e emoções;
- prevê episódios futuros;
- envia o diário automaticamente a profissionais;
- impede o salvamento com base no conteúdo escrito;
- substitui atendimento de urgência.

## Critérios de aceite

- uma entrada salva reaparece após reiniciar o app;
- o diário funciona sem internet;
- busca encontra título, corpo e marcadores;
- arquivar preserva o conteúdo e o histórico;
- dados de contas distintas permanecem isolados;
- o resumo compartilhado não contém o texto integral das entradas;
- linguagem sensível usa “posso ter entendido errado” e oferece o modo de crise;
- RLS e funções de sincronização são validadas pelo pgTAP;
- typecheck, lint, testes e configuração pública passam no CI.
