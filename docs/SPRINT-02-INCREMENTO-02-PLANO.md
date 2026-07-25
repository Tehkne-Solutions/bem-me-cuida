# Sprint 02 — Incremento 02

Assinatura: **Tehkné Solutions**.

## Objetivo

Completar a gestão cotidiana do plano de cuidado, sem orientar alterações clínicas.

## Escopo priorizado

1. Editar e desativar medicamentos e práticas com confirmação explícita.
2. Permitir múltiplos horários por medicamento.
3. Registrar estoque atual, quantidade por dose e limite de reposição.
4. Alertar reposição de forma discreta, sem expor medicamento na tela bloqueada.
5. Cadastrar consultas e tratamentos com profissional, especialidade, local e observações.
6. Ampliar o histórico diário com filtros por tipo e status.
7. Sincronizar novas entidades com RLS e controle de conflito por usuário.

## Regras de segurança

- O aplicativo não recomenda dose, interrupção, substituição ou combinação de medicamentos.
- Desativar um cuidado não remove o histórico anterior.
- Estoque é informativo e nunca confirma adesão automaticamente.
- Notificações continuam neutras e privadas.
- Dados permanecem local-first, criptografados e segregados por conta.

## Critérios de aceite

- Um medicamento aceita dois ou mais horários ativos.
- Edição mantém histórico e atualiza a fila de sincronização atomicamente.
- Desativação remove lembretes futuros e preserva registros anteriores.
- Uma tomada pode reduzir estoque conforme configuração do usuário.
- O app sinaliza reposição abaixo do limite configurado.
- Consultas aparecem no resumo do dia e no histórico.
- RLS bloqueia relacionamento entre usuários diferentes.
- Testes unitários, migrations locais e pgTAP cobrem os novos fluxos.

## Estratégia de publicação

Este incremento será desenvolvido em branch própria após a consolidação da fundação completa no repositório remoto. O PR de consolidação não deve ser mesclado enquanto arquivos obrigatórios ou checks estiverem ausentes.
