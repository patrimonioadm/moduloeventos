-- =====================================================================
-- Módulo Eventos — Fase 4: seção "Alimentação" da Ficha do evento
-- ---------------------------------------------------------------------
-- Puramente aditiva — mesma lógica das outras seções da ficha
-- (funcionamento, patrocinadores, programacao, responsaveis): um
-- jsonb só, editado como formulário único, sem tabelas novas.
-- =====================================================================

alter table public.eventos add column if not exists alimentacao jsonb not null default '{}';

-- formato esperado de alimentacao:
-- {
--   "gastro": [{ "parceiro": "", "horario": "", "destaques": "" }],
--   "restaurante": {
--     "barHorario": "", "cozinhaHorario": "",
--     "buffet": "nao_definido" | "sim" | "nao", "buffetHorario": "", "buffetPratos": "",
--     "openBar": "nao_definido" | "sim" | "nao", "openBebidas": "",
--     "promocoesTem": "nao_definido" | "sim" | "nao",
--     "promocoes": [{ "item": "", "valor": "", "horario": "" }],
--     "tipoMenu": "", "menuObs": "",
--     "menuArquivo": { "nome": "", "tipo": "", "url": "" } | null
--   }
-- }
