# Sprint 02 — Incremento 02

Produto: **BemMeCuida**  
Assinatura: **Tehkné Solutions**

## Entregas

- edição e desativação de medicamentos e práticas sem apagar histórico;
- até oito horários por medicamento;
- estoque opcional, consumo por tomada e limite de reposição;
- correção de estoque quando um registro muda entre “tomado” e “hoje não”;
- lembretes discretos de reposição, no máximo uma vez a cada 24 horas;
- cadastro de profissionais, consultas e tratamentos;
- lembrete neutro de consulta uma hora antes;
- histórico filtrável por tipo e período;
- SQLite schema 7 e entidades novas na sincronização;
- migration Supabase 006, RLS e testes pgTAP;
- fluxo Maestro de consultas e tratamentos.

## Limites clínicos

O aplicativo registra informações fornecidas pelo usuário. Não recomenda dose, reposição, interrupção, combinação de medicamentos ou mudança de tratamento.

## Critérios de aceite

1. Desativar um cuidado não remove registros anteriores.
2. Alterar “tomado” para “hoje não” devolve a quantidade previamente baixada.
3. Uma segunda marcação idêntica não baixa estoque novamente.
4. Relações entre profissional, consulta e tratamento permanecem isoladas pelo `user_id`.
5. Notificações não exibem medicamento, dose, diagnóstico, profissional ou tipo de consulta.
6. As novas entidades funcionam offline e entram na mesma fila transacional de sincronização.
