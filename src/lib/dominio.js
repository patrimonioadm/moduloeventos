export const STATUS = {
  nao_iniciado: { rotulo: "Não iniciado", fechado: false, ordem: 0 },
  em_andamento: { rotulo: "Em andamento", fechado: false, ordem: 1 },
  nao_feito: { rotulo: "Não feito", fechado: true, ordem: 2 },
  feito: { rotulo: "Feito", fechado: true, ordem: 3 },
  nao_aprovado: { rotulo: "Não aprovado", fechado: true, ordem: 4 },
};

export const TIPOS = [
  "Estrutura", "Brinde", "Decoração", "Mobiliário", "Recreação", "Climatização",
  "Alimentação", "Som e imagem", "Divulgação", "Equipe", "Transporte", "Outros",
];

export const secaoPorTipo = (tipo) =>
  ["Estrutura", "Som e imagem", "Climatização", "Decoração", "Divulgação", "Transporte"].includes(tipo)
    ? "Montagem"
    : "Durante Evento";

export const AREAS_FUNCIONAMENTO = ["Academia", "Sauna", "Secretaria", "Tênis", "Restaurante", "Piscina", "Escolinhas"];

export const SITUACOES_POS = {
  realizado: "Realizado",
  parcial: "Parcial",
  nao_realizado: "Não realizado",
  nao_avaliado: "Não avaliado",
};

export const DIAS_ALERTA = 5;
export const HORAS_PARADA = 48;

export function hojeSP() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function diasEntre(isoA, isoB) {
  if (!isoA || !isoB) return null;
  return Math.round((Date.parse(isoB + "T12:00:00Z") - Date.parse(isoA + "T12:00:00Z")) / 86400000);
}

export function dataBR(iso) {
  if (!iso) return "—";
  const p = iso.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

export function relativo(quando) {
  const h = (Date.now() - Date.parse(quando)) / 3600000;
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${Math.floor(h)}h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

export const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

export const dinheiro = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Analisa uma tarefa contra a data do evento: se está "fechada"
 * (status terminal), se deve ser sinalizada como parada/sem registro,
 * e se o prazo já venceu.
 */
export function analisar(tarefa, dataEvento, ultimaMovimentacao) {
  const diasEvento = diasEntre(hojeSP(), dataEvento);
  const fechada = STATUS[tarefa.status]?.fechado ?? false;
  const mov = ultimaMovimentacao || null;
  const horas = mov ? (Date.now() - Date.parse(mov.quando)) / 3600000 : Infinity;
  const parada = !mov || horas >= HORAS_PARADA;
  const alerta = !fechada && diasEvento !== null && diasEvento <= DIAS_ALERTA && parada;
  const diasPrazo = tarefa.prazo ? diasEntre(hojeSP(), tarefa.prazo) : null;
  return {
    fechada,
    alerta,
    parada,
    diasEvento,
    diasPrazo,
    prazoVencido: !fechada && diasPrazo !== null && diasPrazo < 0,
    mov,
    semMov: !mov,
  };
}
