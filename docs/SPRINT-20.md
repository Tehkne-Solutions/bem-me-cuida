# Sprint 20 — Auditoria externa e fallback operacional

## Objetivo

Auditar a configuração externa da candidata `0.11.0-rc.1` sem ler valores de secrets ou variables e oferecer um caminho manual para a central de comandos quando eventos `issue_comment` forem suprimidos por tokens de automação.

## Entregas

- workflow `RC 0.11 External Audit`;
- consulta de environments, variables e nomes de secrets;
- verificação de revisores obrigatórios;
- relatório JSON e Markdown com `hold` ou `ready-for-capture`;
- issue operacional #27;
- comando `/rc011 audit-external`;
- fallback `workflow_dispatch` na central;
- testes para configuração completa, faltas e API indisponível;
- validação estática integrada ao release check.

## Limites

- valores de secrets não são consultados;
- valores de variables não são armazenados;
- a auditoria não cria environments;
- a auditoria não altera variables ou secrets;
- `ready-for-capture` não substitui a captura formal com evidências HTTPS;
- a produção permanece em `0.10.0`.

## Estado esperado após integração

O workflow executa automaticamente após o merge dos arquivos do Sprint 20. Caso a configuração administrativa ainda esteja ausente ou a API não esteja acessível ao token do Actions, o relatório permanece em `hold` com bloqueadores explícitos.

**Tehkné Solutions**
