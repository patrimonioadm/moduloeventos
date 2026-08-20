-- =====================================================================
-- Exclusão de tarefa — só admin, garantido pelo próprio Postgres
-- ---------------------------------------------------------------------
-- A policy de update de eventos_tarefas já permitia admin E colaborador
-- editarem qualquer campo da tarefa — incluindo, em tese, "excluido".
-- Esconder o botão de excluir no front-end para quem não é admin não
-- seria suficiente: alguém poderia chamar a API diretamente. Este
-- ajuste faz o banco recusar a alteração de "excluido" para true por
-- qualquer papel que não seja admin, independente do que o front-end
-- envie.
-- =====================================================================

drop policy if exists "tarefas_update" on public.eventos_tarefas;
create policy "tarefas_update" on public.eventos_tarefas for update
  using (public.papel_em_eventos() in ('admin', 'colaborador'))
  with check (
    public.papel_em_eventos() in ('admin', 'colaborador')
    and (public.papel_em_eventos() = 'admin' or coalesce(excluido, false) = false)
  );
