# ADR-018 — Execução do ciclo, experimentos e gates

## Status

Aceito para o Sprint 14.

## Contexto

O BemMeCuida já possui governança, SLOs, orçamento de erro, pós-incidentes e planejamento do ciclo `0.11.0`. Faltava transformar o ciclo aprovado em execução controlada, sem depender de planilhas externas ou decisões informais.

## Decisão

A execução será representada por oito domínios persistidos no Supabase:

- backlog priorizado;
- objetivos;
- resultados-chave;
- mudanças de escopo;
- experimentos consentidos;
- medições agregadas;
- marcos de entrega;
- gates de release.

Todas as tabelas usam RLS. O cliente possui somente leitura direta e executa mutações por RPCs `security definer` com validação de `release_operator` ou `release_admin`.

## Priorização

O score combina impacto, confiança, esforço e risco:

```text
prioridade = impacto × confiança ÷ esforço − risco
```

O score orienta a decisão, mas não substitui revisão humana, capacidade, segurança ou dependências.

## Experimentos

Experimentos:

- exigem consentimento explícito;
- não usam emoções, diagnósticos, Diário ou medicamentos;
- não segmentam pessoas por condição clínica;
- armazenam apenas amostras e resultados agregados;
- exigem aprovação independente;
- são bloqueados por guardrails técnicos.

## Congelamento e lançamento

A interface mostra bloqueadores antecipadamente, mas o Supabase é a autoridade final.

O congelamento exige, entre outros controles:

- zero mudanças de escopo pendentes;
- zero experimentos abertos;
- zero itens bloqueados;
- gates obrigatórios aprovados;
- marco de RC concluído;
- zero incidentes críticos;
- zero dependências de segurança bloqueadoras.

O lançamento adiciona:

- backlog comprometido concluído;
- marco de lançamento concluído;
- ciclo previamente congelado.

## Consequências

### Positivas

- execução rastreável;
- quatro-olhos em escopo e experimentos;
- RC baseada em evidência;
- redução de decisões subjetivas;
- privacidade preservada.

### Custos

- mais estados e operações para a equipe;
- necessidade de duas contas operacionais;
- migrations e homologação em ambiente real;
- disciplina para manter marcos e gates atualizados.

## Assinatura

Tehkné Solutions
