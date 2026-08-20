import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const EventosConfigContext = createContext(null);

const CONFIG_VAZIA = { organizacao: "", logo_clube_url: null, equipe_operacao: [] };

export function EventosConfigProvider({ children }) {
  const [config, setConfig] = useState(CONFIG_VAZIA);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from("eventos_config").select("chave, valor");
    const obj = {};
    (data || []).forEach((r) => (obj[r.chave] = r.valor));
    setConfig({
      organizacao: obj.organizacao || "Clube Alemão de Pernambuco",
      logo_clube_url: obj.logo_clube_url || null,
      equipe_operacao: Array.isArray(obj.equipe_operacao) ? obj.equipe_operacao : [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    // Realtime: se outro colaborador editar a equipe/logo do clube em outra
    // aba/aparelho, todo mundo que já está com o app aberto vê a mudança
    // sem precisar recarregar a página.
    const canal = supabase
      .channel("eventos-config")
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos_config" }, carregar)
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, [carregar]);

  async function salvar(chave, valor) {
    const { error } = await supabase.from("eventos_config").update({ valor }).eq("chave", chave);
    if (error) throw error;
    await carregar();
  }

  return (
    <EventosConfigContext.Provider value={{ config, loading, salvar, recarregar: carregar }}>
      {children}
    </EventosConfigContext.Provider>
  );
}

export function useEventosConfig() {
  const ctx = useContext(EventosConfigContext);
  if (!ctx) throw new Error("useEventosConfig precisa estar dentro de <EventosConfigProvider>.");
  return ctx;
}
