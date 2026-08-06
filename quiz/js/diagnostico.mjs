// Pure diagnostic engine for the Essencial quiz.
// No DOM, no network, no state: just answers in, diagnosis out.
// Source of the questions/options: docs/superpowers/specs/2026-08-06-quiz-vsl-essencial-design.md §4.

/** @typedef {"A"|"B"|"C"|"D"} Degrau */

// One row per question that can open a degrau. This is the table Hélio edits:
// `degrau` is which of the 4 steps the question belongs to, `ids` are the
// option ids (see quiz UI) that count as "aberto" for that question, `motivo`
// is the reader-facing PT-BR line shown when this question is the reason a
// degrau is open.
//
// q5 is the deliberate trap: "não tenho PJ" (id nao_tenho_pj) means the
// question doesn't apply, not that it's unresolved. It must never appear in
// q5's `ids`. Not applicable never counts as open.
// Exported so the selftest can check it against the `value` attributes in
// index.html. Nothing else reads it from outside.
export const OPENS = {
  q1: { degrau: "A", ids: ["varia_demais", "nao_faco_ideia"], motivo: "Não sabe quanto sobra por mês" },
  q2: { degrau: "A", ids: ["menos1", "1a3"], motivo: "Reserva abaixo de 3 meses" },
  q3: { degrau: "A", ids: ["sim_incomoda"], motivo: "Dívida com juros acima de 1% ao mês" },
  q4: { degrau: "B", ids: ["nao_sei_dizer", "alguns_meses"], motivo: "Sem cobertura clara para a família" },
  q5: { degrau: "B", ids: ["tudo_misturado", "separado_no_papel"], motivo: "PF e PJ misturados" },
  q6: { degrau: "C", ids: ["poupanca", "gerente_indicou"], motivo: "Depende de indicação para decidir onde investir" },
  q7: { degrau: "C", ids: ["quando_sobra", "quando_lembro", "parou"], motivo: "Aporte irregular ou parado" },
  q8: { degrau: "D", ids: ["nao_lembro", "nunca"], motivo: "Carteira sem revisão recente" },
  q9: { degrau: "D", ids: ["correndo_abril", "evito_pensar"], motivo: "Imposto de investimentos sem processo definido" },
};

// Priority order for the 4 steps: lowest index wins as `real`.
const ORDEM = ["A", "B", "C", "D"];

/**
 * @param {string} energia
 * @param {Degrau} real
 * @returns {"acima"|"igual"|"abaixo"}
 */
function compararGap(energia, real) {
  const diff = ORDEM.indexOf(energia) - ORDEM.indexOf(real);
  if (diff === 0) return "igual";
  return diff > 0 ? "acima" : "abaixo";
}

/**
 * @param {Record<string, string>} respostas - answers keyed by question id (q1..q13). Missing keys are fine and never count as open.
 * @returns {{ real: Degrau|null, energia: Degrau, abertos: Degrau[],
 *             motivos: string[], gap: "acima"|"igual"|"abaixo"|"emordem",
 *             faixa: "ate100"|"100a300"|"300a500"|"acima500" }}
 */
export function diagnosticar(respostas = {}) {
  const abertosSet = new Set();
  const motivos = [];

  for (const pergunta of Object.keys(OPENS)) {
    const regra = OPENS[pergunta];
    const resposta = respostas[pergunta];
    if (resposta != null && regra.ids.includes(resposta)) {
      abertosSet.add(regra.degrau);
      motivos.push(regra.motivo);
    }
  }

  const abertos = ORDEM.filter((degrau) => abertosSet.has(degrau));
  const real = abertos[0] ?? null;
  // Q10 and Q11 answer directly with the value we need (energia is already
  // "A"|"B"|"C"|"D"; faixa is already "ate100"|"100a300"|"300a500"|"acima500"),
  // so no lookup table is required. Defaults only matter if the quiz UI lets
  // the flow reach the result without them, which it shouldn't; fall back to
  // the most conservative reading (earliest degrau / smallest faixa).
  const energia = respostas.q10 ?? "A";
  const faixa = respostas.q11 ?? "ate100";
  const gap = real === null ? "emordem" : compararGap(energia, real);

  return { real, energia, abertos, motivos, gap, faixa };
}
