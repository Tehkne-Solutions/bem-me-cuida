# ADR-026 — Transição pós-evidências com revogação antes do build

## Status

Aceito.

## Contexto

A candidata depende de uma captura externa consolidada, revisão humana do registro `ready`, remoção dos secrets temporários usados no bootstrap e somente então da solicitação do primeiro build Android.

Executar essas etapas manualmente em workflows distintos cria risco de:

- usar um PR ainda aberto;
- aceitar arquivos extras no PR de evidências;
- esquecer secrets administrativos no repositório;
- iniciar o build antes da validação protegida;
- usar um commit diferente daquele efetivamente revisado.

## Decisão

Criar uma transição em duas fases:

### Preparação

1. baixar o artefato consolidado da captura;
2. validar os três escopos externos;
3. confirmar o commit comum de origem;
4. localizar ou despachar o workflow de PR de evidências;
5. aguardar revisão e merge humanos.

### Finalização

1. exigir executor administrador;
2. validar que o PR está mesclado em `main`;
3. exigir que apenas o registro de infraestrutura tenha sido alterado;
4. validar novamente a infraestrutura no merge commit;
5. remover os dois secrets temporários do repositório;
6. consultar novamente os nomes e comprovar ausência;
7. executar a validação protegida do build;
8. solicitar o Android pelo mesmo workflow oficial.

## Controles

- não existe comando de merge automático;
- PR aberto ou em rascunho é rejeitado;
- arquivos adicionais são rejeitados;
- o merge commit é obtido diretamente da API do GitHub;
- a revogação acontece antes do build;
- falha ao consultar os nomes remanescentes bloqueia a transição;
- relatórios contêm apenas nomes, estados e identificadores públicos;
- o environment `rc-011-build` continua exigindo revisão e fornece seu próprio `EXPO_TOKEN`;
- a produção não é promovida.

## Consequências

### Positivas

- cadeia de custódia clara entre captura, PR e build;
- menor tempo com credenciais administrativas no repositório;
- commit do build corresponde ao merge revisado;
- reutilização dos gates existentes;
- operação idempotente na preparação.

### Negativas

- o merge humano continua obrigatório;
- a finalização depende do token administrativo ainda estar disponível no início da execução;
- o build pode aguardar aprovação do environment;
- a coleta de build ID, URL e checksum permanece em etapa posterior.

**Tehkné Solutions**
