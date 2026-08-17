import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useEventos } from "../context/EventosContext";
import { TarefaModal } from "../components/TarefaModal";
import { HistoricoModal } from "../components/HistoricoModal";
import { NovoEventoModal } from "../components/NovoEventoModal";
import { ExcluirEventoModal } from "../components/ExcluirEventoModal";
import FichaEvento from "./FichaEvento";
import RelatorioPreEvento from "./RelatorioPreEvento";
import RelatorioPosEvento from "./RelatorioPosEvento";
import Logomarcas from "./Logomarcas";
import { baixarCsvTarefas } from "../lib/csv";
import {
  STATUS, TIPOS, DIAS_ALERTA, HORAS_PARADA,
  analisar, dataBR, dinheiro, diasEntre, hojeSP, plural,
} from "../lib/dominio";

export default function Painel() {
  const { profile, papel, podeEditar, podeAdministrar, logout } = useAuth();
  const { loading, eventos, evento, eventoId, setEventoId, tarefas, recarregarTarefas } = useEventos();

  const [filtros, setFiltros] = useState({ busca: "", tipo: "", status: "", soAlerta: false });
  const [tarefaEditando, setTarefaEditando] = useState(undefined); // undefined = fechado, null = nova, obj = editar
  const [historicoDe, setHistoricoDe] = useState(null);
  const [novoEventoAberto, setNovoEventoAberto] = useState(false);
  const [excluirEventoAberto, setExcluirEventoAberto] = useState(false);
  const [fichaAberta, setFichaAberta] = useState(false);
  const [relatorioPreAberto, setRelatorioPreAberto] = useState(false);
  const [relatorioPosAberto, setRelatorioPosAberto] = useState(false);
  const [logomarcasAberto, setLogomarcasAberto] = useState(false);
  const [toast, setToast] = useState(null);

  function notify(tipo, texto) {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 3200);
  }

  // Como não guardamos "última movimentação" localmente (o histórico é
  // append-only e vive na outra tabela), aproximamos o "parada há Xh"
  // usando atualizado_em da própria tarefa — suficiente para o alerta
  // visual; o detalhe fino fica no modal de Histórico.
  const analises = useMemo(() => {
    if (!evento) return [];
    return tarefas.map((t) => ({
      t,
      a: analisar(t, evento.data, t.atualizado_em ? { quando: t.atualizado_em } : null),
    }));
  }, [tarefas, evento]);

  const kpis = useMemo(() => {
    const aprovadas = analises.filter((x) => x.t.status !== "nao_aprovado");
    const total = aprovadas.reduce((s, x) => s + (Number(x.t.valor) || 0), 0);
    const recusado = analises.filter((x) => x.t.status === "nao_aprovado").reduce((s, x) => s + (Number(x.t.valor) || 0), 0);
    const emAberto = aprovadas.filter((x) => !x.a.fechada).length;
    const feitas = aprovadas.filter((x) => x.t.status === "feito").length;
    const alertas = analises.filter((x) => x.a.alerta).length;
    return { total, recusado, emAberto, feitas, totalAprovadas: aprovadas.length, alertas };
  }, [analises]);

  const listaFiltrada = useMemo(() => {
    const busca = filtros.busca.trim().toLowerCase();
    let lista = analises.filter(({ t, a }) => {
      if (filtros.soAlerta && !a.alerta) return false;
      if (filtros.tipo && t.tipo !== filtros.tipo) return false;
      if (filtros.status && t.status !== filtros.status) return false;
      if (busca && ![t.titulo, t.tipo, t.empresa, t.contato, t.observacao, t.responsavel]
        .join(" ").toLowerCase().includes(busca)) return false;
      return true;
    });
    lista.sort((x, y) => {
      if (x.a.alerta !== y.a.alerta) return x.a.alerta ? -1 : 1;
      return (x.t.prazo || "9999-99-99").localeCompare(y.t.prazo || "9999-99-99");
    });
    return lista;
  }, [analises, filtros]);

  async function mudarStatusRapido(tarefa, novoStatus) {
    const { error } = await supabase.from("eventos_tarefas").update({ status: novoStatus }).eq("id", tarefa.id);
    if (error) { notify("ruim", error.message); return; }
    await supabase.from("eventos_tarefas_historico").insert({
      tarefa_id: tarefa.id, quem_id: profile.id, quem_nome: profile.nome, status_novo: novoStatus, nota: "",
    });
    recarregarTarefas();
  }

  const dias = evento ? diasEntre(hojeSP(), evento.data) : null;
  const contagem = dias === null ? "—" : dias === 0 ? "HOJE" : dias > 0 ? `D-${dias}` : `+${Math.abs(dias)}`;
  const rotContagem = dias === null ? "sem data" : dias === 0 ? "é hoje" : dias > 0 ? plural(dias, "falta 1 dia", `faltam ${dias} dias`) : "evento realizado";

  return (
    <div className="wrap">
      <header className="topo">
        <div className="inner">
          <div className="marca">Painel de Produção<span>Eventos · Deutscher Klub Pernambuco</span></div>
          <div className="eu">
            <span>{profile?.nome} · {papel}</span>
            <button onClick={logout}>Sair</button>
          </div>
        </div>
      </header>

      <div className="barra">
        <div className="inner">
          <label style={{ fontSize: 13, color: "var(--aco)" }} htmlFor="selEvento">Evento</label>
          <select id="selEvento" value={eventoId || ""} onChange={(e) => setEventoId(e.target.value)}>
            {eventos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          {podeAdministrar && (
            <>
              <button className="btn linha pequeno" onClick={() => setNovoEventoAberto(true)}>+ Novo evento</button>
              {evento && <button className="btn linha pequeno" onClick={() => setExcluirEventoAberto(true)}>Excluir evento</button>}
            </>
          )}
          {evento && (
            <>
              <button className="btn linha pequeno" onClick={() => setFichaAberta(true)}>Ficha do evento</button>
              <button className="btn pequeno" onClick={() => setRelatorioPreAberto(true)}>Relatório pré-evento</button>
              <button className="btn linha pequeno" onClick={() => setRelatorioPosAberto(true)}>Relatório pós-evento</button>
              <button className="btn linha pequeno" onClick={() => baixarCsvTarefas(evento, tarefas)}>Baixar CSV</button>
            </>
          )}
          {podeAdministrar && (
            <button className="btn linha pequeno" onClick={() => setLogomarcasAberto(true)}>Logomarcas</button>
          )}
        </div>
      </div>

      <main className="view-pad">
        {loading ? (
          <p style={{ padding: "40px 0", color: "var(--aco)" }}>Carregando o painel…</p>
        ) : !evento ? (
          <div className="vazio" style={{ marginTop: 32 }}>
            Nenhum evento cadastrado ainda.
            {podeAdministrar && " Clique em “+ Novo evento” para começar."}
          </div>
        ) : (
          <>
            <div className="cab">
              <div className="contagem"><div className="d">{contagem}</div><div className="rot">{rotContagem}</div></div>
              <div>
                <h1>{evento.nome}</h1>
                <div className="data">{dataBR(evento.data)}{evento.local ? ` · ${evento.local}` : ""} · {plural(tarefas.length, "item", "itens")} no painel</div>
              </div>
            </div>

            <div className="indicadores">
              <div className="kpi destaque">
                <div className="rot">Despesa aprovada</div>
                <div className="val">{dinheiro(kpis.total)}</div>
                <div className="obs">{plural(kpis.totalAprovadas, "item", "itens")} contabilizados</div>
              </div>
              <div className="kpi">
                <div className="rot">Cotado e não aprovado</div>
                <div className="val" style={{ color: "var(--morto)" }}>{dinheiro(kpis.recusado)}</div>
                <div className="obs">fora do total · histórico</div>
              </div>
              <div className="kpi">
                <div className="rot">Em aberto</div>
                <div className="val">{kpis.emAberto}</div>
                <div className="obs">{kpis.feitas} de {kpis.totalAprovadas} concluídos</div>
              </div>
              <div className="kpi">
                <div className="rot">Sinalizadas</div>
                <div className="val" style={{ color: kpis.alertas ? "var(--alerta)" : "inherit" }}>{kpis.alertas}</div>
                <div className="obs">paradas a {DIAS_ALERTA} dias do evento</div>
              </div>
            </div>

            {kpis.alertas > 0 && (
              <div className="faixa">
                <strong>{plural(kpis.alertas, "tarefa parada", "tarefas paradas")}</strong>
                <p>
                  O evento é {dias === 0 ? "hoje" : `em ${plural(dias, "dia", "dias")}`} e {kpis.alertas === 1 ? "esta tarefa está" : "estas tarefas estão"} sem
                  atualização há mais de {HORAS_PARADA}h. Defina o responsável e o status.
                </p>
              </div>
            )}

            <div className="filtros">
              <div className="campos">
                <div className="campo" style={{ gridColumn: "1 / -1" }}>
                  <label>Buscar</label>
                  <input
                    placeholder="atividade, empresa, contato, observação…"
                    value={filtros.busca}
                    onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
                  />
                </div>
                <div className="campo">
                  <label>Tipo</label>
                  <select value={filtros.tipo} onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}>
                    <option value="">Todos</option>
                    {TIPOS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="campo">
                  <label>Status</label>
                  <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}>
                    <option value="">Todos</option>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
                  </select>
                </div>
              </div>
              <div className="fim">
                <label className="marcar">
                  <input
                    type="checkbox"
                    checked={filtros.soAlerta}
                    onChange={(e) => setFiltros((f) => ({ ...f, soAlerta: e.target.checked }))}
                  /> Só as sinalizadas
                </label>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: "var(--dado)", fontSize: 12 }}>{listaFiltrada.length} de {tarefas.length} itens</span>
                {podeEditar && <button className="btn" onClick={() => setTarefaEditando(null)}>+ Incluir tarefa</button>}
              </div>
            </div>

            {listaFiltrada.length === 0 ? (
              <div className="vazio">Nenhuma tarefa com esses filtros.</div>
            ) : (
              <ul className="lista-tarefas" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {listaFiltrada.map(({ t, a }) => (
                  <li
                    key={t.id}
                    className={`tcard ${a.alerta ? "alerta" : ""} ${t.status === "nao_aprovado" ? "recusada" : ""}`}
                  >
                    <div className="tcard-topo">
                      <div>
                        <div className="atividade">{t.titulo}</div>
                        <span className="tipo">{t.tipo}</span>
                        {a.alerta && (
                          <span className="selo aviso">
                            ⚠ {a.semMov ? "Sem registro" : "Parada"}
                          </span>
                        )}
                        {a.prazoVencido && <span className="selo venceu">Prazo vencido</span>}
                      </div>
                      <div className="cifra">{t.valor ? dinheiro(t.valor) : "—"}</div>
                    </div>

                    <div className="tcard-linha">
                      <span>{t.empresa || "sem empresa"}{t.contato ? ` · ${t.contato}` : ""}</span>
                      <span>{t.prazo ? `prazo ${dataBR(t.prazo)}` : "sem prazo"}</span>
                      <span>{t.responsavel || "sem responsável"}</span>
                    </div>

                    {t.observacao && <p style={{ fontSize: 12.5, color: "var(--aco)", margin: "6px 0 0" }}>{t.observacao}</p>}

                    <div className="tcard-acoes">
                      <select
                        data-s={t.status}
                        value={t.status}
                        disabled={!podeEditar}
                        onChange={(e) => mudarStatusRapido(t, e.target.value)}
                      >
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
                      </select>
                      <button className="icone" title="Histórico" onClick={() => setHistoricoDe(t)}>🕘</button>
                      {podeEditar && <button className="icone" title="Editar" onClick={() => setTarefaEditando(t)}>✎</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {tarefaEditando !== undefined && (
        <TarefaModal tarefa={tarefaEditando} onClose={() => setTarefaEditando(undefined)} notify={notify} />
      )}
      {historicoDe && <HistoricoModal tarefa={historicoDe} onClose={() => setHistoricoDe(null)} />}
      {novoEventoAberto && <NovoEventoModal onClose={() => setNovoEventoAberto(false)} notify={notify} />}
      {excluirEventoAberto && <ExcluirEventoModal onClose={() => setExcluirEventoAberto(false)} notify={notify} />}
      {fichaAberta && <FichaEvento onFechar={() => setFichaAberta(false)} notify={notify} />}
      {relatorioPreAberto && <RelatorioPreEvento onFechar={() => setRelatorioPreAberto(false)} />}
      {relatorioPosAberto && <RelatorioPosEvento onFechar={() => setRelatorioPosAberto(false)} notify={notify} />}
      {logomarcasAberto && <Logomarcas onFechar={() => setLogomarcasAberto(false)} notify={notify} />}
      {toast && <div className={`toast ${toast.tipo === "ruim" ? "ruim" : ""}`}>{toast.texto}</div>}
    </div>
  );
}
