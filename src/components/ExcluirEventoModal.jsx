import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useEventos } from "../context/EventosContext";

export function ExcluirEventoModal({ onClose, notify }) {
  const { profile } = useAuth();
  const { evento, recarregarEventos, setEventoId } = useEventos();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function excluir(e) {
    e.preventDefault();
    if (!motivo.trim()) {
      setErro("Informe o motivo da exclusão — fica registrado no histórico.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const { error } = await supabase
        .from("eventos")
        .update({
          excluido: true,
          excluido_motivo: motivo.trim(),
          excluido_em: new Date().toISOString(),
          excluido_por: profile.id,
        })
        .eq("id", evento.id);
      if (error) throw error;
      notify("info", `"${evento.nome}" foi excluído.`);
      const lista = await recarregarEventos();
      setEventoId(lista[0]?.id || null);
      onClose();
    } catch (err) {
      setErro(err.message || "Não foi possível excluir.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fundo" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cartao" style={{ maxWidth: 440 }}>
        <div className="topo-cartao">
          <h2>Excluir evento</h2>
          <button className="icone" onClick={onClose} title="Fechar">✕</button>
        </div>
        <form onSubmit={excluir} className="conteudo" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0 }}>
            Tem certeza que deseja excluir <strong>{evento?.nome}</strong>? O evento sai da lista, mas
            fica registrado (nome, data e motivo) para consulta futura.
          </p>
          <div className="campo">
            <label>Motivo</label>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required autoFocus />
          </div>
          {erro && <p className="erroCampo">{erro}</p>}
          <div className="rodapeCartao">
            <button type="submit" className="btn alerta" disabled={salvando}>{salvando ? "Excluindo…" : "Excluir evento"}</button>
            <button type="button" className="btn linha" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
