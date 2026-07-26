# Sprint 14 — Execução controlada do ciclo 0.11.0

## Objetivo

Transformar o ciclo planejado no Sprint 13 em uma esteira operacional completa, com backlog priorizado, objetivos mensuráveis, mudanças de escopo auditadas, experimentos consentidos, marcos de entrega e gates automáticos para RC, congelamento e lançamento.

## Entregas

### Backlog

- priorização por impacto, confiança, esforço e risco;
- categorias de confiabilidade, acessibilidade, valor, segurança e operação;
- estados operacionais;
- responsável e prazo opcionais;
- bloqueio de congelamento para itens impedidos;
- bloqueio de lançamento para itens comprometidos incompletos.

### OKRs

- objetivos vinculados ao ciclo;
- resultados-chave com base, meta e valor atual;
- unidades de contagem, porcentagem, taxa, horas e reais;
- acompanhamento de risco e realização.

### Escopo

- solicitações de adição, remoção, reordenação e redimensionamento;
- impacto e justificativa obrigatórios;
- decisão por outra conta `release_admin`;
- auditoria completa.

### Experimentos

- consentimento obrigatório;
- hipótese, sucesso e guardrail;
- aprovação por quatro-olhos;
- medições somente agregadas;
- amostra mínima e guardrails locais;
- bloqueio do congelamento enquanto houver experimento aberto.

### Entrega

- marcos de planejamento, design, desenvolvimento, QA, RC, congelamento e lançamento;
- gates padrão de qualidade, banco, acessibilidade, privacidade, RC e aparelho físico;
- evidências técnicas por gate;
- waiver somente administrativo.

### RC 0.11.0

- relatório agregado em JSON e Markdown;
- trava `cycle:rc:check`;
- identificação planejada `0.11.0-rc.1`;
- versão-base mantida em `0.10.0` até existir artefato real;
- runbook de homologação e rollback.

### Aplicativo

- console `cycle-execution-console`;
- rota autenticada;
- acesso restrito por papel operacional;
- leitura antecipada de bloqueadores;
- servidor como autoridade final.

### Banco

- migrations `019`, `020` e correção `021`;
- oito tabelas com RLS;
- escrita direta revogada;
- RPCs `security definer`;
- auditoria em `operator_audit_log`;
- 61 verificações pgTAP.

## Limites

- nenhum build real é criado pelo PR;
- nenhuma versão publicada é alterada;
- experimentos não usam dados clínicos ou emocionais;
- o console não substitui homologação em aparelho físico;
- migrations ainda precisam ser aplicadas no Supabase real.

## Critérios de conclusão

- `release:check` verde;
- TypeScript e lint verdes;
- testes Node verdes;
- relatório do ciclo gerado;
- migrations e pgTAP verdes;
- configuração Expo sem regressão;
- PR mergeável;
- assinatura Tehkné Solutions preservada.

## Próximo marco

Após homologação externa, o próximo sprint deve gerar a RC real `0.11.0-rc.1`, registrar artefatos, executar testes em aparelhos e preparar a promoção gradual.

## Assinatura

Tehkné Solutions
