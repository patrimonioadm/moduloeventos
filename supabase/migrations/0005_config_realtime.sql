-- =====================================================================
-- Habilita Realtime em eventos_config — necessário para que a troca de
-- equipe de operação (ou logo do clube) feita por um admin apareça
-- automaticamente pra quem já está com o app aberto, sem precisar
-- recarregar a página.
-- =====================================================================
alter publication supabase_realtime add table public.eventos_config;
