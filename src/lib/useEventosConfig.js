import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useEventosConfig() {
  const [config, setConfig] = useState({ organizacao: "", logo_clube_url: null, equipe_operacao: [] });
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

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(chave, valor) {
    const { error } = await supabase.from("eventos_config").update({ valor }).eq("chave", chave);
    if (error) throw error;
    await carregar();
  }

  return { config, loading, salvar, recarregar: carregar };
}
