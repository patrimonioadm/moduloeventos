import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useEventos } from "../context/EventosContext";
import { useEventosConfig } from "../lib/useEventosConfig";
import { TabelaTarefas } from "../components/TabelaTarefas";
import { TarefaModal } from "../components/TarefaModal";
import { HistoricoModal } from "../components/HistoricoModal";
import { NovoEventoModal } from "../components/NovoEventoModal";
import { ExcluirEventoModal } from "../components/ExcluirEventoModal";
import FichaEvento from "./FichaEvento";
import RelatorioPreEvento from "./RelatorioPreEvento";
import RelatorioPosEvento from "./RelatorioPosEvento";
import Logomarcas from "./Logomarcas";
import { baixarCsvTarefas } from "../lib/csv";
import { DIAS_ALERTA, HORAS_PARADA, analisar, dataBR, dinheiro, diasEntre, hojeSP, plural } from "../lib/dominio";

export default function Painel() {
  const { profile, papel, podeEditar, podeAdministrar, logout } = useAuth();
  const { loading, eventos, evento, eventoId, setEventoId, tarefas, ultimasMovimentacoes, recarregarTarefas } = useEventos();
  const { config } = useEventosConfig();

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

  const analises = evento ? tarefas.map((t) => ({ t, a: analisar(t, evento.data, ultimasMovimentacoes[t.id] || null) })) : [];
  const aprovadas = analises.filter((x) => x.t.status !== "nao_aprovado");
  const kpis = {
    total: aprovadas.reduce((s, x) => s + (Number(x.t.valor) || 0), 0),
    recusado: analises.filter((x) => x.t.status === "nao_aprovado").reduce((s, x) => s + (Number(x.t.valor) || 0), 0),
    emAberto: aprovadas.filter((x) => !x.a.fechada).length,
    feitas: aprovadas.filter((x) => x.t.status === "feito").length,
    totalAprovadas: aprovadas.length,
    alertas: analises.filter((x) => x.a.alerta).length,
  };

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
                  registro ou sem atualização há mais de {HORAS_PARADA}h. Defina o responsável e o status.
                </p>
              </div>
            )}

            <TabelaTarefas
              tarefas={tarefas}
              evento={evento}
              ultimasMovimentacoes={ultimasMovimentacoes}
              equipe={config.equipe_operacao}
              podeEditar={podeEditar}
              profile={profile}
              notify={notify}
              onHistorico={setHistoricoDe}
              onEditar={setTarefaEditando}
              onIncluir={() => setTarefaEditando(null)}
            />
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
