-- =====================================================================
-- Portal DKP — schema base multi-setor
-- =====================================================================
-- Este schema é DELIBERADAMENTE separado do schema de cada módulo
-- (ex.: a tabela "descartes" do módulo de Patrimônio continua existindo
-- no mesmo projeto Supabase, intocada). O portal só adiciona:
--   1. profiles      -> identidade única do colaborador (já deve existir
--                        se você rodou o schema do módulo de Descartes;
--                        aqui só garantimos as colunas que o portal usa)
--   2. setores        -> catálogo dos setores do clube
--   3. acessos_setor  -> matriz de permissão usuário x setor x papel
--
-- Rode este arquivo no SQL Editor do Supabase (ou via supabase db push).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles — se já existe (vindo do módulo de Descartes), só
--    adiciona colunas que faltarem, sem recriar a tabela.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  ativo boolean not null default true,
  is_super_admin boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table public.profiles add column if not exists is_super_admin boolean not null default false;
alter table public.profiles add column if not exists criado_em timestamptz not null default now();

-- ---------------------------------------------------------------------
-- 2. setores — catálogo. "chave" é o identificador estável usado pelo
--    front-end (src/config/modulos.js) — nunca mude depois de criado,
--    é o link entre o config do React e a linha do banco.
-- ---------------------------------------------------------------------
create table if not exists public.setores (
  chave text primary key,
  nome text not null,
  descricao text,
  status text not null default 'em_breve' check (status in ('ativo', 'em_breve', 'manutencao')),
  ordem int not null default 0
);

insert into public.setores (chave, nome, descricao, status, ordem) values
  ('eventos',     'Eventos',      'Produção e agenda de eventos do clube',                 'ativo',    1),
  ('patrimonio',  'Patrimônio',   'Inventário, descartes e controle de bens',              'ativo',    2),
  ('rh',          'RH',           'Gestão de colaboradores e folha',                       'em_breve', 3),
  ('financeiro',  'Financeiro',   'Contas, mensalidades e fluxo de caixa',                 'em_breve', 4),
  ('secretaria',  'Secretaria',   'Atas, associados e correspondência oficial',            'em_breve', 5)
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- 3. acessos_setor — matriz de permissão. Um usuário pode ter papéis
--    diferentes em setores diferentes (ex.: admin em Eventos,
--    colaborador em Patrimônio, sem nenhum acesso a RH).
-- ---------------------------------------------------------------------
create table if not exists public.acessos_setor (
  user_id uuid not null references public.profiles (id) on delete cascade,
  setor_chave text not null references public.setores (chave) on delete cascade,
  papel text not null default 'colaborador' check (papel in ('admin', 'colaborador', 'leitor')),
  concedido_em timestamptz not null default now(),
  primary key (user_id, setor_chave)
);

-- ---------------------------------------------------------------------
-- Função auxiliar (security definer) para checar super admin sem
-- recursão de RLS dentro das próprias policies de profiles.
-- ---------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_super_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.setores enable row level security;
alter table public.acessos_setor enable row level security;

-- profiles: cada um vê o próprio perfil; super admin vê todos.
-- Escrita de outros perfis (criar usuário, ativar/desativar, mudar
-- is_super_admin) só acontece pela Edge Function com service_role,
-- que ignora RLS — por isso não existe policy de "insert" aberta aqui.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists "profiles_update_self_limited" on public.profiles;
create policy "profiles_update_self_limited"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_super_admin = (select is_super_admin from public.profiles where id = auth.uid()));

-- setores: catálogo público para qualquer usuário autenticado.
drop policy if exists "setores_select_authenticated" on public.setores;
create policy "setores_select_authenticated"
  on public.setores for select
  to authenticated
  using (true);

-- acessos_setor: cada um vê os próprios acessos; super admin vê tudo.
-- Escrita (conceder/revogar acesso a um setor) só via Edge Function.
drop policy if exists "acessos_select_self_or_admin" on public.acessos_setor;
create policy "acessos_select_self_or_admin"
  on public.acessos_setor for select
  using (user_id = auth.uid() or public.is_super_admin());

-- =====================================================================
-- Notas de manutenção:
-- * Nunca dê GRANT em auth.users para o client. Tudo que envolve criar
--   usuário, resetar senha de terceiros, ou promover super admin passa
--   pela Edge Function "create-user" (service_role, roda no servidor).
-- * Ao adicionar um módulo novo, basta um INSERT em "setores" com a
--   chave certa — o React lê essa tabela dinamicamente.
-- =====================================================================
