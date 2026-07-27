# ADR-030 — Validação OTA final e decisão da candidata

## Contexto

Metadados do EAS Update, isoladamente, não comprovam que Android e iOS receberam o bundle, reiniciaram com o runtime correto, preservaram o banco local e continuam operando offline. Também não devem promover a candidata automaticamente.

## Decisão

1. Publicação e rollback são capturados como evidências separadas e versionados por PR.
2. Cada ação exige uma sessão física em `android-mainstream` e `ios-mainstream`.
3. As sessões registram somente perfis abstratos, versão do sistema, build, grupo OTA, checks e URL de evidência.
4. Os checks obrigatórios são recebimento, aplicação após reinício, preservação de dados locais e inicialização offline.
5. Falha em qualquer plataforma coloca o ciclo em `retest-required`.
6. O pacote final pode recomendar `promote`, mas não altera gates, não publica release e não executa merge.
7. A promoção depende de atestação humana independente.

## Consequências

A cadeia fica auditável e segura contra sucesso unilateral, perda silenciosa de dados e promoção baseada apenas na resposta do EAS.

**Tehkné Solutions**
