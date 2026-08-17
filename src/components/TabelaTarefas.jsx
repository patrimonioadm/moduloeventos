import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  STATUS, TIPOS, HORAS_PARADA,
  analisar, dataBR, dinheiro, plural, relativo, horaEm, soHora, semAcento,
} from "../lib/dominio";

const COLUNAS = [
  ["", "", "flag"], ["Atividade", "titulo", ""], ["Tipo", "tipo", ""], ["Empresa", "empresa", ""],
  ["Contato", "contato", ""], ["Valor", "valor", "dir"], ["Prazo", "prazo", ""], ["Status", "status", ""],
  ["Responsável", "responsavel", ""], ["Observações", "", ""], ["Atualização", "mov", ""], ["Ações", "", ""],
];
const LARGURAS = ["6px", "15%", "7%", "10%", "9%", "7%", "7%", "9%", "9%", "13%", "9%", "5%"];

const ROTULO_CAMPO = { empresa: "Empresa", contato: "Contato", status: "Status", responsavel: "Responsável" };

function celulaAtualizacao(mov) {
  if (!mov) return <span className="vazioCampo">sem movimentação</span>;
  return (
    <>
      <strong>{mov.quem_nome}</strong>
      <br />{relativo(mov.quando)}
      <br />{horaEm("America/Sao_Paulo", mov.quando)} SP
      <br />{soHora("Europe/Berlin", mov.quando)} Berlim
    </>
  );
}

function CelulaTexto({ tarefa, campo, podeEditar, profile, notify }) {
  const [valor, setValor] = useState(tarefa[campo] || "");
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    const v = valor.trim();
    if ((tarefa[campo] || "") === v) return;
    const antes = tarefa[campo];
    const { error } = await supabase.from("eventos_tarefas").update({ [campo]: v }).eq("id", tarefa.id);
    if (error) { notify("ruim", error.message); return; }
    await supabase.from("eventos_tarefas_historico").insert({
      tarefa_id: tarefa.id, quem_id: profile.id, quem_nome: profile.nome, status_novo: tarefa.status,
      nota: `${ROTULO_CAMPO[campo]}: ${antes || "vazio"} → ${v || "vazio"}`,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 1400);
  }

  const digitos = String(valor).replace(/\D/g, "");
  return (
    <>
      <input
        className={`celula${salvo ? " salvo" : ""}`}
        value={valor}
        placeholder="a preencher"
        disabled={!podeEditar}
        title={!podeEditar ? "Sem permissão para editar" : undefined}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      {campo === "contato" && digitos.length >= 8 && (
        <a className="contato mono" href={`tel:${digitos}`}>ligar</a>
      )}
    </>
  );
}

export function TabelaTarefas({ tarefas, evento, ultimasMovimentacoes, equipe, podeEditar, profile, notify, onHistorico, onEditar, onIncluir }) {
  const [filtros, setFiltros] = useState({ busca: "", tipo: "", status: "", resp: "", empresa: "", soAlerta: false });
  const [ordenar, setOrdenar] = useState({ col: "prazo", dir: 1 });

  const analises = useMemo(
    () => tarefas.map((t) => ({ t, a: analisar(t, evento?.data, ultimasMovimentacoes[t.id] || null) })),
    [tarefas, evento, ultimasMovimentacoes]
  );

  const empresas = useMemo(
    () => Array.from(new Set(tarefas.map((t) => t.empresa).filter(Boolean))).sort(),
    [tarefas]
  );
  const tiposPresentes = useMemo(
    () => Array.from(new Set(TIPOS.concat(tarefas.map((t) => t.tipo).filter(Boolean)))),
    [tarefas]
  );

  const listaFiltrada = useMemo(() => {
    const busca = semAcento(filtros.busca.trim());
    let lista = analises.filter(({ t, a }) => {
      if (filtros.soAlerta && !a.alerta) return false;
      if (filtros.tipo && t.tipo !== filtros.tipo) return false;
      if (filtros.status && t.status !== filtros.status) return false;
      if (filtros.resp === "__sem" ? !!t.responsavel : filtros.resp && t.responsavel !== filtros.resp) return false;
      if (filtros.empresa === "__sem" ? !!t.empresa : filtros.empresa && t.empresa !== filtros.empresa) return false;
      if (busca && !semAcento([t.titulo, t.tipo, t.empresa, t.contato, t.observacao, t.responsavel].join(" ")).includes(busca)) return false;
      return true;
    });

    const chave = (x) => {
      switch (ordenar.col) {
        case "valor": return Number(x.t.valor) || 0;
        case "status": return STATUS[x.t.status]?.ordem ?? 9;
        case "prazo": return x.t.prazo || "9999-99-99";
        case "mov": return x.a.mov ? x.a.mov.quando : "";
        default: return semAcento(x.t[ordenar.col] || "zzz");
      }
    };
    lista.sort((x, y) => {
      if (x.a.alerta !== y.a.alerta) return x.a.alerta ? -1 : 1;
      const a = chave(x), b = chave(y);
      if (a < b) return -1 * ordenar.dir;
      if (a > b) return 1 * ordenar.dir;
      return 0;
    });
    return lista;
  }, [analises, filtros, ordenar]);

  const somaFiltro = listaFiltrada.filter((x) => x.t.status !== "nao_aprovado").reduce((s, x) => s + (Number(x.t.valor) || 0), 0);

  function clicarColuna(chave) {
    if (!chave) return;
    setOrdenar((o) => (o.col === chave ? { col: chave, dir: o.dir * -1 } : { col: chave, dir: 1 }));
  }

  function limparFiltros() {
    setFiltros({ busca: "", tipo: "", status: "", resp: "", empresa: "", soAlerta: false });
  }

  async function mudarCampoSelect(tarefa, campo, valor) {
    if ((tarefa[campo] || "") === valor) return;
    const antes = tarefa[campo];
    const { error } = await supabase.from("eventos_tarefas").update({ [campo]: valor }).eq("id", tarefa.id);
    if (error) { notify("ruim", error.message); return; }
    const nota = campo === "status"
      ? `Status: ${STATUS[antes]?.rotulo || "—"} → ${STATUS[valor].rotulo}`
      : `Responsável: ${antes || "sem responsável"} → ${valor || "sem responsável"}`;
    await supabase.from("eventos_tarefas_historico").insert({
      tarefa_id: tarefa.id, quem_id: profile.id, quem_nome: profile.nome,
      status_novo: campo === "status" ? valor : tarefa.status, nota,
    });
  }

  return (
    <>
      <div className="filtros">
        <div className="campos">
          <div className="campo largo">
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
              {tiposPresentes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Status</label>
            <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}>
              <option value="">Todos</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Responsável</label>
            <select value={filtros.resp} onChange={(e) => setFiltros((f) => ({ ...f, resp: e.target.value }))}>
              <option value="">Todos</option>
              <option value="__sem">Sem responsável</option>
              {equipe.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Empresa</label>
            <select value={filtros.empresa} onChange={(e) => setFiltros((f) => ({ ...f, empresa: e.target.value }))}>
              <option value="">Todas</option>
              <option value="__sem">Sem empresa</option>
              {empresas.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div className="fim">
          <label className="marcar">
            <input type="checkbox" checked={filtros.soAlerta} onChange={(e) => setFiltros((f) => ({ ...f, soAlerta: e.target.checked }))} />
            Só as sinalizadas
          </label>
          <button className="btn linha pequeno" onClick={limparFiltros}>Limpar filtros</button>
          <span style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 12 }}>{listaFiltrada.length} de {tarefas.length} itens</span>
          {podeEditar && <button className="btn" onClick={onIncluir}>+ Incluir tarefa</button>}
        </div>
      </div>

      <div className="rolagem">
        <table>
          <colgroup>{LARGURAS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr>
              {COLUNAS.map(([rotulo, chave, cls], i) => (
                <th
                  key={i}
                  className={`${cls}${chave ? " ord" : ""}`}
                  onClick={() => clicarColuna(chave)}
                >
                  {rotulo}
                  {chave && ordenar.col === chave && <span className="seta">{ordenar.dir === 1 ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.length === 0 ? (
              <tr><td colSpan={12}><div className="vazio" style={{ border: 0, background: "transparent" }}>Nenhuma tarefa com esses filtros. Use "Limpar filtros".</div></td></tr>
            ) : listaFiltrada.map(({ t, a }) => {
              const classes = [a.alerta ? "alerta" : "", t.status === "nao_aprovado" ? "recusada" : ""].filter(Boolean).join(" ");
              return (
                <tr key={t.id} className={classes}>
                  <td className="flag" />
                  <td>
                    <div className="atividade">{t.titulo}</div>
                    {a.alerta && <span className="selo aviso">⚠ {a.semMov ? "Sem registro" : `Parada ${relativo(a.mov.quando)}`}</span>}
                    {a.prazoVencido && <span className="selo venceu">Prazo vencido</span>}
                  </td>
                  <td>{t.tipo ? <span className="tipo">{t.tipo}</span> : <span className="vazioCampo">—</span>}</td>
                  <td><CelulaTexto tarefa={t} campo="empresa" podeEditar={podeEditar} profile={profile} notify={notify} /></td>
                  <td><CelulaTexto tarefa={t} campo="contato" podeEditar={podeEditar} profile={profile} notify={notify} /></td>
                  <td className="cifra">
                    {t.valor ? dinheiro(t.valor) : "—"}
                    {t.status === "nao_aprovado" && <div className="vazioCampo" style={{ fontStyle: "normal" }}>fora do total</div>}
                  </td>
                  <td className={`prazo mono${a.diasPrazo !== null && a.diasPrazo <= 1 ? " perto" : ""}`}>
                    {t.prazo ? dataBR(t.prazo) : <span className="vazioCampo">sem prazo</span>}
                    {t.prazo && (
                      <em>{a.diasPrazo === 0 ? "é hoje" : a.diasPrazo > 0 ? `em ${plural(a.diasPrazo, "dia", "dias")}` : `há ${plural(Math.abs(a.diasPrazo), "dia", "dias")}`}</em>
                    )}
                  </td>
                  <td>
                    <select
                      data-s={t.status}
                      value={t.status}
                      disabled={!podeEditar}
                      title={!podeEditar ? "Sem permissão para editar" : undefined}
                      onChange={(e) => mudarCampoSelect(t, "status", e.target.value)}
                    >
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      value={t.responsavel || ""}
                      disabled={!podeEditar}
                      title={!podeEditar ? "Sem permissão para editar" : undefined}
                      onChange={(e) => mudarCampoSelect(t, "responsavel", e.target.value)}
                    >
                      <option value="">— sem resp.</option>
                      {equipe.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                    </select>
                  </td>
                  <td><div className="obs">{t.observacao ? t.observacao : <span className="vazioCampo">—</span>}</div></td>
                  <td className="atualizacao">{celulaAtualizacao(ultimasMovimentacoes[t.id])}</td>
                  <td>
                    <div className="acoes">
                      <button className="icone" title="Histórico" onClick={() => onHistorico(t)}>🕘</button>
                      <button className="icone" title="Editar ficha" onClick={() => onEditar(t)}>✎</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td /><td colSpan={4}>Soma dos itens exibidos</td>
              <td className="cifra">{dinheiro(somaFiltro)}</td>
              <td colSpan={6} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rodapeNota">
        <b>Editar:</b> empresa e contato podem ser digitados direto na tabela — sai do campo e já está salvo. Status e responsável salvam ao escolher. O lápis abre a ficha completa.<br />
        <b>Sinalização:</b> faixa amarela quando o evento está a poucos dias e a tarefa não tem registro, ou está sem atualização há mais de {HORAS_PARADA}h.<br />
        <b>Fusos:</b> a coluna Atualização mostra o horário em São Paulo e em Berlim, para o time acompanhar de qualquer fuso.
      </div>
    </>
  );
}
