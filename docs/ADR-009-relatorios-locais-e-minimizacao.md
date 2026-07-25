# ADR-009 — Relatórios locais e minimização de dados

## Decisão

Relatórios de acompanhamento são calculados sob demanda no aparelho e não são persistidos como uma nova entidade no backend.

O texto integral do diário nunca entra no relatório. Nomes e doses de medicamentos, assim como nomes de tratamentos, exigem seleção explícita do usuário antes do compartilhamento.

## Motivos

- relatórios concentram diversos dados sensíveis em um único artefato;
- persistir cópias agregadas aumentaria superfície de exposição e retenção;
- o usuário deve controlar conteúdo, destinatário e momento do compartilhamento;
- resumos de frequência e média são suficientes para a primeira versão sem inferência clínica.

## Consequências

- o relatório precisa ser recalculado quando o usuário muda período ou opções;
- não existe envio automático nem histórico remoto de relatórios;
- o compartilhamento utiliza a folha nativa do sistema operacional;
- futuras exportações em PDF devem preservar os mesmos defaults de minimização.
