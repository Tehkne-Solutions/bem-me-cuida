# ADR 061 — Registro protegido da execução manual da sessão

## Status

Aceito.

## Contexto

Após a criação e validação do pacote de execução manual, o ciclo precisa representar factualmente uma sessão humana já realizada sem interpretar esse registro como autorização operacional.

## Decisão

Adotar um artefato administrativo determinístico, imutável e referenciado ao pacote de execução vigente. O artefato captura participantes, respostas, checklist, evidências, decisão e encerramento.

## Consequências

- existe rastreabilidade administrativa da sessão;
- resultados humanos podem ser registrados sem código executável;
- conteúdo operacional é rejeitado;
- nenhuma correção, branch funcional, patch, merge ou ativação é autorizada;
- uma etapa posterior deve validar o registro antes de qualquer novo avanço administrativo.
