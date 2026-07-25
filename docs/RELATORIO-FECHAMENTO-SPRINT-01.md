# Relatório de fechamento técnico — Sprint 01

**Produto:** BemMeCuida
**Responsável:** Tehkné Solutions

## Resultado

A vertical slice do Sprint 01 está implementada no código: autenticação, onboarding, consentimentos, check-in local-first, banco criptografado, sincronização bidirecional, controle de conflito, proteção de tela, modo de crise, ambientes separados, CI, diagnóstico no aparelho e automação E2E preparada.

## Correções finais de integridade

### Cursor composto

A paginação remota deixou de depender apenas de `updated_at`. O cursor persiste agora o horário e o UUID do último registro. A RPC ordena pelos dois campos e limita a página em 500 itens, evitando que registros com timestamps idênticos sejam ignorados entre páginas.

### Servidor mais novo

Quando a RPC de envio informa `remote_newer`, a operação local sai da fila e o cursor remoto é reiniciado antes da leitura. Assim, o dispositivo recupera a versão vencedora mesmo que o cursor anterior já tivesse ultrapassado o momento daquela alteração.

### Diagnóstico sem dados sensíveis

A tela de homologação verifica:

- schema SQLite;
- presença real de SQLCipher em build nativo;
- leitura e escrita no SecureStore;
- conectividade;
- correspondência da sessão;
- operações pendentes ou bloqueadas;
- solicitação da proteção de conteúdo.

O relatório gerado contém somente estados técnicos e não inclui dados de conta ou saúde.

Além da verificação visual, a abertura do banco passou a ser fail-closed em Android/iOS: se `PRAGMA cipher_version` não confirmar SQLCipher, a conexão é encerrada e o aplicativo não continua com armazenamento não criptografado.

## Estado de aceite

O código está pronto para a fase de homologação externa. O sprint ainda não deve ser marcado como aprovado em produção até que sejam concluídos:

1. instalação de dependências e `npm run verify`;
2. aplicação das migrations em Supabase staging;
3. testes pgTAP;
4. geração do APK development;
5. execução Maestro;
6. checklist em aparelho físico;
7. teste entre dois dispositivos;
8. validação RLS com duas contas.

A ausência de credenciais e infraestrutura externa foi mantida explícita; nenhum build ou teste de dispositivo foi declarado como executado.
