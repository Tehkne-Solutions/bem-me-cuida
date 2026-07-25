# ADR-013 — observabilidade consentida e feedback da beta

## Status

Aceito no Sprint 09.

## Contexto

O BemMeCuida trata dados emocionais e de saúde. Uma beta precisa de evidências técnicas para investigar falhas, mas telemetria genérica pode capturar conteúdo, identificadores ou hábitos desnecessários.

## Decisão

A observabilidade do Sprint 09 será local-first, opcional e baseada em lista permitida.

- O log técnico começa desligado.
- Apenas eventos definidos no código podem ser registrados.
- O contexto aceita somente números, booleanos e valores nulos.
- Não existe API para texto livre em eventos técnicos.
- São mantidos no máximo 200 eventos por conta e aparelho.
- O usuário pode apagar o log a qualquer momento.
- Não há upload automático.
- Até 40 eventos podem acompanhar um feedback somente após seleção explícita.
- Diagnósticos também são anexados somente por escolha explícita.
- O texto do feedback exige confirmação de que dados sensíveis foram removidos.

## Dados remotos

`beta_tester_enrollments` registra apenas status de participação, versão, variante e plataforma.

`beta_feedback` registra categoria, impacto, relato deliberadamente escrito, passos opcionais, versão, plataforma e anexos técnicos selecionados. RLS restringe leitura e inserção ao titular. O cliente não pode alterar status nem excluir relatos enviados.

## Consequências

### Positivas

- Investigação técnica sem coleta invisível.
- Menor risco de conteúdo emocional em telemetria.
- Histórico rastreável para testadores.
- Possibilidade de exportação integral pelo titular.

### Limitações

- Falhas anteriores à ativação do log não terão sequência de eventos.
- Não existe painel administrativo no aplicativo.
- A triagem e mudança de status dependem de operação segura no backend.
- Crash reporting automático fica fora deste sprint.

## Alternativas rejeitadas

- Telemetria automática para todos os usuários.
- Inclusão de telas, rotas livres ou mensagens de erro completas.
- Captura de texto do Diário para reprodução de falhas.
- Identificador persistente de dispositivo enviado em todos os eventos.

**Assinatura:** Tehkné Solutions.
