import { STATUS } from "./dominio";

function csvEscapar(v) {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function baixarCsvTarefas(evento, tarefas) {
  const colunas = ["Atividade", "Tipo", "Seção", "Empresa", "Contato", "Valor", "Prazo", "Status", "Responsável", "Observação"];
  const linhas = tarefas.map((t) => [
    t.titulo, t.tipo, t.secao, t.empresa, t.contato,
    (Number(t.valor) || 0).toFixed(2).replace(".", ","),
    t.prazo || "", STATUS[t.status]?.rotulo || t.status, t.responsavel, t.observacao,
  ]);
  const csv = [colunas, ...linhas].map((linha) => linha.map(csvEscapar).join(";")).join("\n");
  // BOM para o Excel reconhecer UTF-8 corretamente
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tarefas-${(evento?.nome || "evento").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
