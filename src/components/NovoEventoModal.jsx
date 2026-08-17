import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useEventos } from "../context/EventosContext";

export function NovoEventoModal({ onClose, notify }) {
  const { profile } = useAuth();
  const { recarregarEventos, setEventoId } = useEventos();
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [local, setLocal] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const { data: criado, error } = await supabase
        .from("eventos")
        .insert({ nome: nome.trim(), data: data || null, local: local.trim(), criado_por: profile.id })
        .select("id")
        .single();
      if (error) throw error;
      notify("sucesso", "Evento criado.");
      await recarregarEventos();
      setEventoId(criado.id);
      onClose();
    } catch (err) {
      setErro(err.message || "Não foi possível criar o evento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fundo" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cartao">
        <div className="topo-cartao">
          <h2>Novo evento</h2>
          <button className="icone" onClick={onClose} title="Fechar">✕</button>
        </div>
        <form onSubmit={salvar} className="conteudo" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="campo">
            <label>Nome do evento</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex.: Dia dos Pais" />
          </div>
          <div className="campo">
            <label>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="campo">
            <label>Local</label>
            <input value={local} onChange={(e) => setLocal(e.target.value)} />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--aco)", margin: 0 }}>
            Ficha completa (funcionamento das áreas, patrocinadores, programação e responsáveis) chega na
            próxima etapa — por ora, crie o evento aqui e monte as tarefas no painel.
          </p>
          {erro && <p className="erroCampo">{erro}</p>}
          <div className="rodapeCartao">
            <button type="submit" className="btn" disabled={salvando}>{salvando ? "Criando…" : "Criar evento"}</button>
            <button type="button" className="btn linha" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
