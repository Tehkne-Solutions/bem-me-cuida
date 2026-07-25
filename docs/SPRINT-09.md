# Sprint 09 — operação da beta, feedback e RC 1

**Produto:** BemMeCuida  
**Versão:** 0.10.0  
**Release:** RC 1  
**Assinatura:** Tehkné Solutions

## Objetivo

Transformar a beta fechada em um processo operacional controlado, permitindo identificar a instalação, registrar participação, receber feedback rastreável e anexar diagnóstico técnico somente mediante ação e consentimento explícitos.

## Entregas

- Central da beta autenticada.
- Identificação de versão, canal e plataforma instalada.
- Adesão e pausa da participação por conta.
- Formulário de feedback por categoria e impacto.
- Histórico de relatos e status de triagem.
- Diagnóstico técnico opcional por envio.
- Log técnico local desligado por padrão.
- Eventos técnicos restritos a uma lista fixa e sem texto livre.
- Limite local de 200 eventos por conta.
- Exclusão manual do log local.
- Exportação de feedback, adesão e eventos técnicos pelo titular.
- Tabelas remotas com RLS para feedback e participantes.
- Variante BemMeCuida RC isolada da beta e produção.
- Script `rc:check` e perfil EAS `rc`.

## Regras de privacidade

- Nenhum texto do Diário é anexado.
- Nenhuma emoção, medicamento, diagnóstico ou nota clínica entra nos eventos técnicos.
- O log técnico é local, opcional e desligado por padrão.
- O envio de feedback exige confirmação de remoção de dados sensíveis.
- Diagnóstico e eventos recentes são anexados apenas quando o usuário marca as opções.
- Não existe upload automático de telemetria neste sprint.

## Critérios de aceite

1. A central mostra `0.10.0-rc.1` no perfil RC.
2. Participação ativa ou pausada é isolada por usuário via RLS.
3. Feedback com menos de 20 caracteres é rejeitado.
4. Feedback não é enviado sem confirmação de texto seguro.
5. Diagnóstico enviado não contém nome, e-mail, texto emocional ou identificador da conta.
6. Log técnico não registra eventos antes da ativação.
7. Limpeza local remove todos os eventos da conta atual.
8. Exportação integral inclui dados da operação beta.
9. Schema local 10 é detectado pelo diagnóstico.
10. CI, pgTAP e lint PostgreSQL permanecem verdes.

## Homologação física obrigatória

- Android com APK RC instalado em paralelo à beta.
- Login e recuperação por `bemmecuida-rc://`.
- Envio de feedback online e comportamento offline.
- TalkBack e fontes grandes na central.
- Ativação, pausa e limpeza do log técnico.
- Compartilhamento do diagnóstico e revisão manual do conteúdo.

Desenvolvido por **Tehkné Solutions**.
