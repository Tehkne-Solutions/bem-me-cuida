# ADR-011 — Controle do titular e bloqueio local

## Status

Aceito na versão 0.8.0.

## Contexto

O BemMeCuida armazena informações emocionais, rotinas de cuidado e dados relacionados a tratamento. O titular precisa controlar consentimentos opcionais, obter uma cópia dos próprios dados, solicitar exclusão e reduzir exposição quando o aparelho é compartilhado ou fica desbloqueado.

## Decisão

- concentrar controles em uma tela autenticada de conta e privacidade;
- manter consentimentos obrigatórios separados dos opcionais;
- permitir revogação direta apenas de finalidades opcionais;
- gerar exportação integral no aparelho, sob ação explícita;
- registrar exclusão como solicitação, sem apagar imediatamente dados locais ou remotos;
- proteger solicitações por RLS e impedir exclusão direta da linha pelo cliente;
- armazenar preferências de bloqueio no SecureStore por conta;
- usar `expo-local-authentication` para biometria e fallback do sistema;
- manter o conteúdo coberto quando a autenticação for cancelada;
- não armazenar qualquer dado biométrico no BemMeCuida.

## Consequências

### Positivas

- maior transparência e autonomia do titular;
- redução de risco em aparelhos compartilhados;
- fluxo de exclusão auditável e reversível enquanto pendente;
- ausência de processamento biométrico próprio;
- exportação sem dependência de serviço externo adicional.

### Custos e limites

- Face ID exige development build no iOS;
- exportações grandes dependem da capacidade de compartilhamento do sistema;
- a remoção definitiva da conta exige processo administrativo ou função privilegiada fora do cliente;
- perda do acesso ao aparelho pode impedir o desbloqueio quando não houver fallback configurado no sistema.

## Alternativas rejeitadas

- exclusão imediata pelo cliente usando credenciais privilegiadas;
- armazenamento de PIN próprio no aplicativo;
- envio automático da exportação por e-mail;
- biometria obrigatória para todos os usuários.
