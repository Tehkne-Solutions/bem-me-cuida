# Sprint 11 — Produção, rollout gradual e incidentes

## Objetivo

Preparar a primeira distribuição de produção do BemMeCuida com controles verificáveis antes, durante e depois da publicação, mantendo dados emocionais e clínicos fora da operação técnica.

## Entregas

### Ambiente de produção

- perfil EAS `production` com distribuição de loja;
- Android em `app-bundle`;
- canal e environment próprios;
- runtime associado à versão do aplicativo;
- atualizações verificadas no carregamento quando o projeto EAS estiver configurado;
- comandos separados para build e submissão Android/iOS;
- `production:check` com URLs legais e credenciais públicas mínimas.

### Submissões

- registro de build, loja, trilha, estado e referência externa;
- vínculo obrigatório com candidata e build de audiência `store`;
- estados de rascunho a publicado ou retirado;
- pacote JSON de submissão com checksums de artefatos e documentos;
- nenhum certificado, token ou credencial de assinatura no pacote.

### Rollout gradual

Sequência padrão: `1% → 5% → 10% → 25% → 50% → 100%`.

Para avançar, o servidor exige:

- rollout ativo ou pausado;
- leitura agregada com menos de 24 horas;
- sessões sem falha ≥ 99%;
- sincronizações bem-sucedidas ≥ 97%;
- autenticações bem-sucedidas ≥ 98%;
- zero bloqueadores na janela;
- zero incidentes SEV1 ou SEV2 abertos.

Esses limites são controles internos iniciais, não promessas de disponibilidade e não substituem análise humana.

### Monitoramento

A operação armazena somente:

- percentuais técnicos agregados;
- contagem de chamados;
- contagem de bloqueadores;
- quantidade de sessões amostradas;
- janela de observação e origem da leitura.

Não são permitidos textos de Diário, emoções, medicamentos, diagnósticos, nomes, e-mails ou identificadores de aparelho.

### Incidentes

- severidade SEV1 a SEV4;
- estado aberto, monitorando ou resolvido;
- título, resumo e impacto exclusivamente técnicos;
- timeline auditada;
- pausa e rollback controlados;
- rollback também marca a candidata como revertida.

### Segurança

- console restrito a `release_operator` e `release_admin` no `app_metadata`;
- RLS em todas as tabelas;
- cliente sem escrita genérica;
- mutações por RPC `security definer` com validação explícita;
- auditoria no `operator_audit_log`;
- assinatura exclusiva Tehkné Solutions.

## Fora do escopo automático

- criar contas nas lojas;
- aceitar contratos comerciais;
- gerar certificados de assinatura;
- atribuir papel operacional;
- enviar builds sem ação explícita;
- decidir publicação sem revisão humana;
- responder publicamente a incidentes.

## Critérios de conclusão

- `quality` e `database` verdes;
- migrations e pgTAP aprovados;
- `release:check` incluindo Sprint 11;
- fluxo Maestro do console preparado;
- build real homologado em aparelho;
- URLs públicas legais e de suporte disponíveis;
- pacote de submissão gerado com SHA-256 real;
- rollout iniciado somente após candidata promovida e submissão aprovada.

**Tehkné Solutions**
