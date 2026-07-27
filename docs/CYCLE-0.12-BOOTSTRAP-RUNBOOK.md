# Runbook — abertura controlada do ciclo 0.12.0

## Pré-condições

A versão 0.11.0 precisa estar publicada, observada por 24h, 72h e 7d e encerrada por PR humano. Enquanto isso não ocorrer, o pacote deve permanecer em `hold`.

## 1. Revisar encerramento 0.11.0

Confirmar em `release/rc-0.11.0/cycle-closure.json`:

- status `closed`;
- evidência HTTPS;
- ausência de SEV1/SEV2 abertos;
- rollout concluído;
- backlog seguinte preparado.

## 2. Consolidar feedback

Executar `Cycle 0.12 Bootstrap` com `capture-feedback`.

Fornecer apenas:

- temas como slugs;
- contagens agregadas;
- distribuição por impacto;
- quantidade excluída por sensibilidade;
- evidência HTTPS do relatório anonimizado.

Não inserir texto de usuários, nomes, e-mails ou informações clínicas.

## 3. Limpeza dos environments temporários

Executar primeiro um dry-run fora do workflow. Depois registrar separadamente:

- `rc-011-build`;
- `rc-011-homologation`.

Os environments `production-release` e `production-observability` são permanentes e não podem entrar na limpeza.

O workflow somente captura o resultado. A exclusão administrativa continua manual e exige aprovação.

## 4. Revisar escopo

Atualizar `scope.json` por PR independente, vinculando itens a temas agregados ou necessidades operacionais. O escopo não deve conter feedback bruto.

## 5. Revisar migrations

A faixa planejada é 022–029. Não criar migration vazia. Cada mudança precisa de classificação de dados, rollback, RLS e pgTAP.

## 6. Gerar pacote

```bash
npm run cycle012:package
```

O resultado precisa permanecer `hold` enquanto qualquer controle estiver pendente.

## 7. Propor ativação

Executar `propose-activation` somente após todas as evidências. O artefato `ready-for-human-activation` ainda precisa de PR e aprovação independente.

## 8. Ativação humana

Após o merge da proposta, criar formalmente o ciclo de produto e somente então autorizar as primeiras migrations e branches de implementação.

**Tehkné Solutions**
