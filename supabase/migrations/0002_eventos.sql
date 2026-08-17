-- =====================================================================
-- Módulo Eventos — schema
-- ---------------------------------------------------------------------
-- Roda no MESMO projeto Supabase do portal (depende de public.profiles
-- e public.acessos_setor já existirem — ver 0001_init_portal.sql).
--
-- Mapeamento de papéis do protótipo original -> papéis do portal:
--   "equipe"    (edita tudo, cria/exclui evento) -> papel 'admin'      em setor_chave='eventos'
--   "convidado" (edita tarefas, não mexe na ficha) -> papel 'colaborador'
--   "visitante" (só visualiza)                     -> papel 'leitor'
-- Isso elimina o sistema de nome+senha próprio do protótipo: quem edita
-- o quê passa a ser 100% controlado pela tabela acessos_setor do portal.
-- =====================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- eventos
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date,
  hora_inicio text,
  hora_fim text,
  local text,
  descricao text,
  publico text,
  -- sub-artefatos editados como formulário único na "Ficha do evento"
  -- (fase 2) — guardados como jsonb porque não precisam de filtro/sort
  -- individual, só leitura/escrita em bloco.
  funcionamento jsonb not null default '[]',
  patrocinadores jsonb not null default '[]',
  programacao jsonb not null default '[]',
  responsaveis jsonb not null default '[]',
  logo_evento_url text,
  excluido boolean not null default false,
  excluido_motivo text,
  excluido_em timestamptz,
  excluido_por uuid references public.profiles (id),
  criado_em timestamptz not null default now(),
  criado_por uuid references public.profiles (id)
);

-- ---------------------------------------------------------------------
-- tarefas
-- ---------------------------------------------------------------------
create table if not exists public.eventos_tarefas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  titulo text not null,
  tipo text not null default 'Outros'
    check (tipo in ('Estrutura','Brinde','Decoração','Mobiliário','Recreação','Climatização',
                     'Alimentação','Som e imagem','Divulgação','Equipe','Transporte','Outros')),
  secao text not null default 'Durante Evento' check (secao in ('Montagem', 'Durante Evento')),
  valor numeric(12,2) not null default 0,
  prazo date,
  status text not null default 'nao_iniciado'
    check (status in ('nao_iniciado','em_andamento','nao_feito','feito','nao_aprovado')),
  responsavel text,
  empresa text default '',
  contato text default '',
  observacao text default '',
  excluido boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por uuid references public.profiles (id),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_tarefas_evento on public.eventos_tarefas (evento_id) where not excluido;

-- ---------------------------------------------------------------------
-- histórico de movimentação por tarefa (append-only)
-- ---------------------------------------------------------------------
create table if not exists public.eventos_tarefas_historico (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.eventos_tarefas (id) on delete cascade,
  quando timestamptz not null default now(),
  quem_id uuid references public.profiles (id),
  quem_nome text not null,
  status_novo text not null,
  nota text default ''
);

create index if not exists idx_historico_tarefa on public.eventos_tarefas_historico (tarefa_id, quando desc);

-- ---------------------------------------------------------------------
-- trigger: mantém atualizado_em em dia a cada update de tarefa
-- ---------------------------------------------------------------------
create or replace function public.eventos_tarefas_set_atualizado()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_eventos_tarefas_atualizado on public.eventos_tarefas;
create trigger trg_eventos_tarefas_atualizado
  before update on public.eventos_tarefas
  for each row execute function public.eventos_tarefas_set_atualizado();

-- ---------------------------------------------------------------------
-- Helper: papel do usuário atual no setor 'eventos' (reaproveita a
-- matriz do portal). is_super_admin do portal também conta como admin.
-- ---------------------------------------------------------------------
create or replace function public.papel_em_eventos()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when (select is_super_admin from public.profiles where id = auth.uid()) then 'admin'
    else (select papel from public.acessos_setor
          where user_id = auth.uid() and setor_chave = 'eventos')
  end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.eventos enable row level security;
alter table public.eventos_tarefas enable row level security;
alter table public.eventos_tarefas_historico enable row level security;

-- eventos: qualquer papel em 'eventos' (mesmo leitor) pode ver.
drop policy if exists "eventos_select" on public.eventos;
create policy "eventos_select" on public.eventos for select
  using (public.papel_em_eventos() is not null);

-- criar/editar/excluir evento: só admin (= "equipe" do protótipo).
drop policy if exists "eventos_insert_admin" on public.eventos;
create policy "eventos_insert_admin" on public.eventos for insert
  with check (public.papel_em_eventos() = 'admin');

drop policy if exists "eventos_update_admin" on public.eventos;
create policy "eventos_update_admin" on public.eventos for update
  using (public.papel_em_eventos() = 'admin');

-- tarefas: leitura para qualquer papel; escrita para admin e colaborador
-- (colaborador não pode excluir tarefa — só marcar status/observação).
drop policy if exists "tarefas_select" on public.eventos_tarefas;
create policy "tarefas_select" on public.eventos_tarefas for select
  using (public.papel_em_eventos() is not null);

drop policy if exists "tarefas_insert" on public.eventos_tarefas;
create policy "tarefas_insert" on public.eventos_tarefas for insert
  with check (public.papel_em_eventos() in ('admin', 'colaborador'));

drop policy if exists "tarefas_update" on public.eventos_tarefas;
create policy "tarefas_update" on public.eventos_tarefas for update
  using (public.papel_em_eventos() in ('admin', 'colaborador'));

-- histórico: leitura para qualquer papel; inserção para quem edita tarefa.
-- Nunca update/delete — é log append-only, por isso não há policy para eles
-- (RLS bloqueia por padrão o que não tem policy correspondente).
drop policy if exists "historico_select" on public.eventos_tarefas_historico;
create policy "historico_select" on public.eventos_tarefas_historico for select
  using (public.papel_em_eventos() is not null);

drop policy if exists "historico_insert" on public.eventos_tarefas_historico;
create policy "historico_insert" on public.eventos_tarefas_historico for insert
  with check (public.papel_em_eventos() in ('admin', 'colaborador'));

-- ---------------------------------------------------------------------
-- Realtime: permite que a tela atualize sozinha quando outro colaborador
-- muda uma tarefa (equivalente ao polling de "Atualizar" do protótipo,
-- só que automático).
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.eventos_tarefas;
alter publication supabase_realtime add table public.eventos;
