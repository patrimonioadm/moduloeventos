-- =====================================================================
-- Módulo Eventos — Fase 2 (aditiva, sem migração destrutiva)
-- ---------------------------------------------------------------------
-- Adiciona: bucket de Storage para logomarcas/anexos, tabela de config
-- global do setor (logo do clube, equipe de operação padrão) e o campo
-- de resultado do pós-evento. Os campos de "ficha" (funcionamento,
-- patrocinadores, programacao, responsaveis) já existem desde a
-- migração 0002 — não precisam de alteração de schema, só de tela.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Storage: bucket público para logomarcas do clube/evento/patrocinadores.
-- Público de LEITURA (facilita exibir no relatório impresso sem precisar
-- de header de autenticação); ESCRITA fica restrita a admin via policy.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('eventos-midia', 'eventos-midia', true)
on conflict (id) do nothing;

drop policy if exists "eventos_midia_select_publico" on storage.objects;
create policy "eventos_midia_select_publico"
  on storage.objects for select
  using (bucket_id = 'eventos-midia');

drop policy if exists "eventos_midia_insert_admin" on storage.objects;
create policy "eventos_midia_insert_admin"
  on storage.objects for insert
  with check (bucket_id = 'eventos-midia' and public.papel_em_eventos() = 'admin');

drop policy if exists "eventos_midia_update_admin" on storage.objects;
create policy "eventos_midia_update_admin"
  on storage.objects for update
  using (bucket_id = 'eventos-midia' and public.papel_em_eventos() = 'admin');

drop policy if exists "eventos_midia_delete_admin" on storage.objects;
create policy "eventos_midia_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'eventos-midia' and public.papel_em_eventos() = 'admin');

-- ---------------------------------------------------------------------
-- Config global do setor (chave/valor) — logo do clube e equipe de
-- operação padrão (usada para preencher a ficha e os relatórios).
-- ---------------------------------------------------------------------
create table if not exists public.eventos_config (
  chave text primary key,
  valor jsonb not null default '{}'
);

alter table public.eventos_config enable row level security;

drop policy if exists "eventos_config_select" on public.eventos_config;
create policy "eventos_config_select" on public.eventos_config for select
  using (public.papel_em_eventos() is not null);

drop policy if exists "eventos_config_upsert_admin" on public.eventos_config;
create policy "eventos_config_upsert_admin" on public.eventos_config for insert
  with check (public.papel_em_eventos() = 'admin');

drop policy if exists "eventos_config_update_admin" on public.eventos_config;
create policy "eventos_config_update_admin" on public.eventos_config for update
  using (public.papel_em_eventos() = 'admin');

insert into public.eventos_config (chave, valor) values
  ('organizacao', '"Clube Alemão de Pernambuco"'),
  ('logo_clube_url', 'null'),
  ('equipe_operacao', '[
    {"nome":"Reilton","telefone":"81 99245.6049","area":"Responsável geral do evento"},
    {"nome":"Khrystian","telefone":"81 99732.2286","area":"Palco e geral do evento"},
    {"nome":"Priscila","telefone":"81 98450.2907","area":"Camarim e geral do evento"},
    {"nome":"Amanda","telefone":"81 98477.9781","area":"Acessos, portaria, segurança e bombeiro"},
    {"nome":"Cesar","telefone":"81 99287.1941","area":"Manutenção e limpeza"},
    {"nome":"Rosangela","telefone":"81 98688.4083","area":"Recepção e acessos"},
    {"nome":"Armando","telefone":"81 99704.9958","area":"Atendimento e open bar"},
    {"nome":"Éder","telefone":"81 98181-2200","area":"Cozinha, petiscos, open food"}
  ]')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- Resultado do pós-evento (preenchido depois que o evento acontece).
-- Fica num único jsonb pelo mesmo motivo dos outros campos de ficha:
-- é editado como formulário único, não filtrado/ordenado linha a linha.
-- ---------------------------------------------------------------------
alter table public.eventos add column if not exists pos_evento jsonb not null default '{}';
-- formato esperado de pos_evento:
-- {
--   "publicoReal": "",
--   "notasGestores": [{ "area": "", "nome": "", "nota": "" }],
--   "pontosPositivos": [""],
--   "pontosNegativos": [""],
--   "opiniaoDiretoria": "",
--   "opiniaoSocios": "",
--   "npsNota": null
-- }

-- programacao[] e patrocinadores[] ganham campos extras no pós-evento,
-- sem exigir migração: cada item passa a poder ter "situacao"
-- ("realizado"|"parcial"|"nao_realizado"|"nao_avaliado") e, no caso de
-- patrocinador, "valorRecebido". Isso é responsabilidade do front-end
-- ao gravar o jsonb — nada a fazer aqui no banco.
