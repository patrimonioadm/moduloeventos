-- =====================================================================
-- Exclusão de tarefa — só admin, garantido no banco
-- ---------------------------------------------------------------------
-- A exclusão de tarefa é "soft delete" (excluido = true), igual já é
-- feito para eventos. A policy "tarefas_update" continua permitindo
-- admin E colaborador editarem campos normais (status, empresa,
-- responsável etc.) — não dá pra restringir só a coluna "excluido"
-- via RLS puro (RLS não diferencia quais colunas mudaram dentro de um
-- UPDATE). Por isso, um trigger BEFORE UPDATE intercepta especificamente
-- a transição excluido=false -> true e bloqueia se quem está fazendo a
-- alteração não for admin — funciona mesmo que alguém tente chamar a
-- API do Supabase direto, contornando a tela.
-- =====================================================================

create or replace function public.eventos_tarefas_bloquear_exclusao_nao_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.excluido = true and coalesce(old.excluido, false) = false then
    if public.papel_em_eventos() <> 'admin' then
      raise exception 'Apenas administradores podem excluir tarefas.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_eventos_tarefas_bloquear_exclusao on public.eventos_tarefas;
create trigger trg_eventos_tarefas_bloquear_exclusao
  before update on public.eventos_tarefas
  for each row execute function public.eventos_tarefas_bloquear_exclusao_nao_admin();
