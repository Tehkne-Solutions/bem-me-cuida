# Central de comandos — BemMeCuida 0.11.0-rc.1

A central funciona exclusivamente na issue #24 do repositório.

## Ajuda e estado

```text
/rc011 help
/rc011 status
```

`status` gera um resumo a partir de:

- `infrastructure-readiness.json`;
- `builds.json`;
- `ota-validation.json`;
- `device-matrix.json`.

O resumo não consulta secrets e não substitui o pacote formal de decisão.

## Infraestrutura

Validação pública:

```text
/rc011 validate-infrastructure <source_sha>
```

Captura protegida:

```text
/rc011 capture-infrastructure <source_sha> <build_evidence_https> <homologation_evidence_https> <services_evidence_https>
```

A captura exige permissão administrativa e ainda passa pelos environments `rc-011-build` e `rc-011-homologation`.

## Evidências

Inspecionar o artefato consolidado:

```text
/rc011 evidence-inspect <infrastructure_run_id> <source_sha>
```

Abrir o PR de evidências:

```text
/rc011 evidence-pr <infrastructure_run_id> <source_sha>
```

O PR só é criado quando os três escopos externos estiverem `ready`.

## Build Android

Validar os gates sem iniciar build:

```text
/rc011 validate-build <source_sha> <cycle_evidence_https>
```

Solicitar o build protegido:

```text
/rc011 build-android <source_sha> <cycle_evidence_https>
```

O build exige permissão administrativa, infrastructure readiness aprovada e revisão do environment de build.

## Captura do build

```text
/rc011 collect-android <source_sha> <eas_build_uuid>
```

A coleta baixa o artefato pelo EAS, calcula metadados e produz uma captura para revisão. Ela não altera automaticamente `builds.json`.

## Pacote de decisão

```text
/rc011 package-decision <source_sha>
```

O resultado será `hold` enquanto houver infraestrutura, build, OTA, aparelhos ou suítes pendentes.

## Permissões

Comandos que exigem permissão `admin`:

- `capture-infrastructure`;
- `evidence-pr`;
- `build-android`;
- `collect-android`.

Os demais exigem `write`, `maintain` ou `admin`.

## Segurança

- use uma única linha por comando;
- não cole tokens, senhas ou certificados;
- não inclua dados pessoais ou clínicos;
- use somente evidências HTTPS controladas;
- o comentário solicita a operação, mas não ignora revisores ou gates;
- acompanhe a execução pelo GitHub Actions e pela própria issue.

**Tehkné Solutions**
