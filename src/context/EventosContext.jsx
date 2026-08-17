import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const EventosContext = createContext(null);

function hojeSP() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function EventosProvider({ children }) {
  const [eventos, setEventos] = useState([]);
  const [eventoId, setEventoId] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarEventos = useCallback(async () => {
    const { data } = await supabase
      .from("eventos")
      .select("id, nome, data, local")
      .eq("excluido", false)
      .order("data", { ascending: true });
    setEventos(data || []);
    return data || [];
  }, []);

  const carregarTarefas = useCallback(async (idEvento) => {
    if (!idEvento) {
      setTarefas([]);
      return;
    }
    const { data } = await supabase
      .from("eventos_tarefas")
      .select("*")
      .eq("evento_id", idEvento)
      .eq("excluido", false)
      .order("prazo", { ascending: true, nullsFirst: false });
    setTarefas(data || []);
  }, []);

  // carga inicial: escolhe o próximo evento futuro (ou o mais recente) por padrão
  useEffect(() => {
    (async () => {
      setLoading(true);
      const lista = await carregarEventos();
      if (lista.length) {
        const hoje = hojeSP();
        const futuro = lista.find((e) => (e.data || "") >= hoje);
        const escolhido = (futuro || lista[lista.length - 1]).id;
        setEventoId(escolhido);
        await carregarTarefas(escolhido);
      }
      setLoading(false);
    })();
  }, [carregarEventos, carregarTarefas]);

  useEffect(() => {
    if (eventoId) carregarTarefas(eventoId);
  }, [eventoId, carregarTarefas]);

  // realtime: qualquer mudança nas tarefas do evento aberto recarrega a lista
  useEffect(() => {
    if (!eventoId) return;
    const canal = supabase
      .channel(`tarefas-evento-${eventoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eventos_tarefas", filter: `evento_id=eq.${eventoId}` },
        () => carregarTarefas(eventoId)
      )
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, [eventoId, carregarTarefas]);

  const evento = useMemo(() => eventos.find((e) => e.id === eventoId) || null, [eventos, eventoId]);

  const value = {
    loading,
    eventos,
    evento,
    eventoId,
    setEventoId,
    tarefas,
    recarregarEventos: carregarEventos,
    recarregarTarefas: () => carregarTarefas(eventoId),
  };

  return <EventosContext.Provider value={value}>{children}</EventosContext.Provider>;
}

export function useEventos() {
  const ctx = useContext(EventosContext);
  if (!ctx) throw new Error("useEventos precisa estar dentro de <EventosProvider>.");
  return ctx;
}
