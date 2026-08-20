import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useEventos } from "../context/EventosContext";
import { useEventosConfig } from "../context/EventosConfigContext";
import { STATUS, TIPOS, secaoPorTipo } from "../lib/dominio";

export function TarefaModal({ tarefa, onClose, notify }) {
  const { profile } = useAuth();
  const { eventoId, recarregarTarefas } = useEventos();
  const { config } = useEventosConfig();
  const editando = !!tarefa?.id;

  const [titulo, setTitulo] = useState(tarefa?.titulo || "");
  const [tipo, setTipo] = useState(tarefa?.tipo || TIPOS[0]);
  const [valor, setValor] = useState(tarefa?.valor ?? "");
  const [prazo, setPrazo] = useState(tarefa?.prazo || "");
  const [status, setStatus] = useState(tarefa?.status || "nao_iniciado");
  const [responsavel, setResponsavel] = useState(tarefa?.responsavel || "");
  const [empresa, setEmpresa] = useState(tarefa?.empresa || "");
  const [contato, setContato] = useState(tarefa?.contato || "");
  const [observacao, setObservacao] = useState(tarefa?.observacao || "");
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const statusMudou = editando ? status !== tarefa.status : true;
      const registro = {
        evento_id: eventoId,
        titulo: titulo.trim(),
        tipo,
        secao: secaoPorTipo(tipo),
        valor: Number(valor) || 0,
        prazo: prazo || null,
        status,
        responsavel: responsavel.trim(),
        empresa: empresa.trim(),
        contato: contato.trim(),
        observacao: observacao.trim(),
      };

      let tarefaId = tarefa?.id;
      if (editando) {
        const { error } = await supabase.from("eventos_tarefas").update(registro).eq("id", tarefaId);
        if (error) throw error;
      } else {
        registro.criado_por = profile.id;
        const { data, error } = await supabase.from("eventos_tarefas").insert(registro).select("id").single();
        if (error) throw error;
        tarefaId = data.id;
      }

      // Só grava um registro de histórico se o status mudou ou se
      // alguém deixou uma nota — evita poluir o histórico com edições
      // triviais de empresa/contato.
      if (statusMudou || nota.trim()) {
        const { error: histErro } = await supabase.from("eventos_tarefas_historico").insert({
          tarefa_id: tarefaId,
          quem_id: profile.id,
          quem_nome: profile.nome,
          status_novo: status,
          nota: nota.trim(),
        });
        if (histErro) throw histErro;
      }

      notify("sucesso", editando ? "Tarefa atualizada." : "Tarefa incluída.");
      await recarregarTarefas();
      onClose();
    } catch (err) {
      setErro(err.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fundo" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cartao">
        <div className="topo-cartao">
          <h2>{editando ? "Editar tarefa" : "Incluir tarefa"}</h2>
          <button className="icone" onClick={onClose} title="Fechar">✕</button>
        </div>
        <form onSubmit={salvar} className="conteudo" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="campo">
            <label>Atividade</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required placeholder="Ex.: 2 tendas 10x10" />
          </div>
          <div className="grade">
            <div className="campo">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Valor (R$)</label>
              <input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="campo">
              <label>Prazo</label>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
            <div className="campo">
              <label>Responsável</label>
              <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                <option value="">— sem resp.</option>
                {config.equipe_operacao.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Empresa</label>
              <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </div>
            <div className="campo">
              <label>Contato</label>
              <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Telefone" />
            </div>
          </div>
          <div className="campo">
            <label>Observação</label>
            <textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <div className="campo">
            <label>Nota para o histórico (opcional)</label>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="O que mudou / por quê" />
          </div>
          {erro && <p className="erroCampo">{erro}</p>}
          <div className="rodapeCartao">
            <button type="submit" className="btn" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
            <button type="button" className="btn linha" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
