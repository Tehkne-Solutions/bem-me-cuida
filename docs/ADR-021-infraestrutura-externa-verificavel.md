# ADR-021 — Infraestrutura externa verificável

## Status

Aceito.

## Contexto

Builds EAS, secrets do GitHub, variables de environments e callbacks do Supabase vivem fora do repositório. Sem uma captura reproduzível, a equipe poderia confundir configuração declarada com infraestrutura realmente pronta.

## Decisão

A prontidão externa será representada por três capturas independentes:

1. environment `rc-011-build`;
2. environment `rc-011-homologation`;
3. serviços EAS, Supabase e callbacks.

Cada captura registra somente presença, formato, resultado das verificações, commit e evidência HTTPS. Valores de secrets e chaves completas não são persistidos.

O workflow consolida as capturas em uma cópia do registro oficial e gera uma recomendação. A substituição da fonte ocorre somente por PR revisado.

## Controles

- `EXPO_TOKEN` verificado apenas como presente ou ausente;
- inputs de workflow transferidos para variáveis de ambiente antes do shell;
- URLs de evidência obrigatoriamente HTTPS;
- project ID validado como UUID;
- URL do Supabase validada por domínio;
- callbacks exatos da variante `rc011`;
- mesmo commit de origem nos três escopos;
- nenhum uso de `service_role`;
- relatório sem dados pessoais, clínicos ou secrets;
- gates do Supabase continuam como autoridade final.

## Consequências

### Positivas

- diagnóstico objetivo da infraestrutura;
- histórico auditável;
- separação entre configuração, execução e aprovação;
- menor risco de exposição de credenciais;
- bloqueio explícito quando algo estiver ausente.

### Negativas

- exige configuração manual dos environments;
- exige evidências externas controladas;
- adiciona uma etapa de PR para consolidar resultados.

**Tehkné Solutions**
