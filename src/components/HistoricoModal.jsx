import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { STATUS, relativo } from "../lib/dominio";

export function HistoricoModal({ tarefa, onClose }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("eventos_tarefas_historico")
        .select("*")
        .eq("tarefa_id", tarefa.id)
        .order("quando", { ascending: false });
      setHistorico(data || []);
      setCarregando(false);
    })();
  }, [tarefa.id]);

  return (
    <div className="fundo" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cartao">
        <div className="topo-cartao">
          <h2>Histórico</h2>
          <button className="icone" onClick={onClose} title="Fechar">✕</button>
        </div>
        <div className="conteudo">
          <p style={{ fontWeight: 600, marginTop: 0 }}>{tarefa.titulo}</p>
          {carregando ? (
            <p>Carregando…</p>
          ) : historico.length === 0 ? (
            <p style={{ color: "var(--aco)" }}>Nenhuma movimentação registrada ainda.</p>
          ) : (
            historico.map((h) => (
              <div className="linhaHist" key={h.id}>
                <div className="quando">{relativo(h.quando)} · {new Date(h.quando).toLocaleString("pt-BR")}</div>
                <div>
                  <strong>{h.quem_nome}</strong> marcou como <strong>{STATUS[h.status_novo]?.rotulo || h.status_novo}</strong>
                </div>
                {h.nota && <div style={{ fontSize: 13, color: "var(--aco)" }}>{h.nota}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
