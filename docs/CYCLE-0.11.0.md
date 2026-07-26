# Ciclo BemMeCuida 0.11.0

## Direção

Consolidar os aprendizados da primeira produção controlada, melhorar confiabilidade, acessibilidade e valor de autocuidado sem ampliar o escopo clínico do produto.

## Objetivos propostos

1. reduzir fricções observadas na beta e na produção;
2. melhorar previsibilidade da sincronização e notificações;
3. fortalecer acessibilidade em aparelhos e escalas extremas;
4. concluir ações corretivas prioritárias;
5. atualizar dependências com risco controlado;
6. simplificar os consoles operacionais sem reduzir segurança;
7. preparar métricas de produto que permaneçam agregadas e consentidas.

## Fora de escopo

- diagnóstico;
- recomendação ou alteração de medicamentos;
- previsão automática de crise;
- envio de textos do Diário para IA;
- ranking emocional;
- compartilhamento automático de dados sensíveis.

## Gates para aprovação

- zero SEV1 ou SEV2 abertos;
- zero ação corretiva crítica aberta;
- zero ação de alta prioridade vencida;
- zero atualização de segurança pendente;
- zero SLO crítico;
- todas as manutenções futuras aprovadas ou canceladas;
- metas e prazo registrados;
- aprovação por conta `release_admin` diferente do criador.

## Estados

```text
planning → awaiting_approval → approved → active → frozen → released
```

Estados alternativos: `rejected` e `cancelled`.

## Congelamento

Ao entrar em `frozen`:

- somente correções bloqueadoras entram;
- novas dependências precisam de justificativa de segurança;
- mudanças nativas exigem nova validação completa;
- documentação editorial e de privacidade deve ser revisada.

## Evidências de saída

- CI verde;
- banco validado;
- homologação em aparelho;
- SLOs dentro dos limites;
- ações corretivas críticas concluídas;
- relatório executivo revisado;
- assinatura Tehkné Solutions em todos os artefatos.

**Tehkné Solutions**
