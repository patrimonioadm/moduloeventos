# Eventos — Deutscher Klub Pernambuco

Painel de Produção de Eventos, migrado do protótipo estático (HTML +
`window.storage`) para um app real: Supabase (Postgres + Auth + RLS +
Realtime) e login compartilhado com o Portal DKP.

## O que mudou em relação ao protótipo

- **Sem senha fixa "1234" nem perfis próprios (equipe/convidado/visitante).**
  Como só colaboradores do clube usam o portal, a autenticação e as
  permissões agora vêm 100% do Supabase Auth + da tabela `acessos_setor`
  do portal:

  | Protótipo | Papel no portal (setor `eventos`) | Pode |
  |---|---|---|
  | equipe | `admin` | tudo: tarefas, criar/excluir evento |
  | convidado | `colaborador` | editar tarefas, sem criar/excluir evento |
  | visitante | `leitor` | só visualizar |

- **Dados em Postgres com RLS**, não em `window.storage`. Cada tabela
  tem policy própria (`supabase/migrations/0002_eventos.sql`) — mesmo um
  colaborador chamando a API direto não vê/edita o que o papel dele não
  permite.
- **Histórico de movimentação é uma tabela append-only de verdade**
  (`eventos_tarefas_historico`), não um array dentro do JSON do evento —
  fica íntegro mesmo se duas pessoas editarem a mesma tarefa ao mesmo
  tempo.
- **Atualização em tempo real via Realtime** do Supabase, no lugar do
  botão "Atualizar" manual: se um colega muda o status de uma tarefa, a
  tela de todo mundo atualiza sozinha.
- **Layout em cards, mobile-first**, no lugar da tabela larga
  (`min-width:1040px`) do protótipo, que não funcionava bem em celular.

## Fases

**Fase 1 (esta entrega) — Painel de Tarefas:**
- Seletor de evento, criar/excluir evento (motivo obrigatório na exclusão).
- KPIs (despesa aprovada, cotado e não aprovado, em aberto, sinalizadas).
- Faixa de alerta para tarefas paradas perto da data do evento.
- Filtros (busca, tipo, status, só sinalizadas).
- Cards de tarefa com edição inline de status + modal completo de
  edição + histórico de movimentação.

**Fase 2 (esta entrega):**
- **Ficha do evento** (`src/pages/FichaEvento.jsx`): horário, descrição,
  público, funcionamento das áreas do clube, patrocinadores (com logo),
  programação, responsáveis. Admin edita; colaborador/leitor veem em
  modo somente leitura.
- **Logomarcas** (`src/pages/Logomarcas.jsx` + `src/lib/storage.js`):
  upload de logo do clube (padrão dos relatórios), logo do evento e
  logo de cada patrocinador, via bucket `eventos-midia` no Supabase
  Storage (leitura pública, escrita restrita a admin por RLS). Também
  edita a equipe de operação padrão do clube.
- **Relatório pré-evento** (`RelatorioPreEvento.jsx`) e **pós-evento**
  (`RelatorioPosEvento.jsx`): montados a partir dos dados já salvos na
  Fase 1 + Ficha, com botão "Imprimir / salvar PDF" (`window.print()`
  + CSS de impressão em `src/styles/relatorio.css`). O pós-evento
  também é a tela de preenchimento do resultado (público real,
  situação de cada item da programação, pontos positivos/negativos,
  opinião da diretoria/sócios, NPS) — sai do banco na coluna
  `pos_evento` (jsonb) da tabela `eventos`.
- **Exportar CSV** das tarefas (`src/lib/csv.js`), com BOM UTF-8 para
  abrir certo no Excel.

**Fase 3 (ainda não implementada, ideias para continuar):**
- Exclusão de tarefa individual com registro do que foi excluído (hoje
  só existe exclusão de evento inteiro; tarefa é só "arquivada" via
  status).
- Tela de "Registro de alterações" agregando o histórico de todas as
  tarefas do evento em uma linha do tempo única (hoje o histórico é
  visto tarefa por tarefa, no modal).
- Anexos/fotos do evento em `eventos_tarefas` (o protótipo tinha um
  campo `imagens` por evento).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # mesmo projeto Supabase do portal
npm run dev
```

## Publicando o schema

Depois de já ter rodado `0001_init_portal.sql` (do repositório do
portal), rode este:

```bash
# Cole supabase/migrations/0002_eventos.sql no SQL Editor do Supabase,
# ou:
supabase db push
```

## Liberando acesso a um colaborador

Não muda nada aqui — continua pelo portal, em **Usuários**, escolhendo
o papel (`leitor` / `colaborador` / `admin`) no setor **Eventos**.

## Integrando ao portal

Este app é implantado como projeto Vercel próprio (mesmo padrão do
Descartes). Quando tiver a URL de produção:

1. No repositório do **portal**, em `src/config/modulos.js`, troque a
   entrada `eventos` de `tipo: "iframe"` para `tipo: "link-externo"` e
   preencha a URL (ou a variável `VITE_URL_EVENTOS`).
2. No SQL do portal: `update public.setores set status = 'ativo' where chave = 'eventos';`
3. (Opcional, para SSO automático) adicione um rewrite em
   `vercel.json` do portal apontando `/eventos/*` para este deploy.
