// Where the visitor stops inside the quiz.
//
// The funnel reports two numbers — arrivals (`essencial-quiz`) and finishers
// (`essencial-quiz-done`) — and nothing between them. At 2,12% concluding
// (FREEZE.md, ciclo de R$1.000 fechado em 11/09) that gap cannot tell apart
// two visitors with opposite fixes: the one who left without answering
// anything (the ad and the page promised the wrong thing) and the one who
// answered and gave up partway (the quiz is too long). Guessing between them
// already cost a cycle: the 18→12 screen cut of 25/08 bet on the second
// reading and moved conclusion 1,91% → 1,92%.
//
// Two marks close that blind spot: who answers the first question, and who
// reaches the halfway point. Both ride the `view` event because the backend
// rejects any other value (EVENTOS_VALIDOS in beacon.mjs); the step is carried
// by the page name, exactly the way `essencial-quiz-done` already does it.
// `page` is a free string server-side, so neither needs a backend change.
export const MARCO_INICIO = "essencial-quiz-start";
export const MARCO_MEIO = "essencial-quiz-meio";

/**
 * The mark, if any, that this answer just reached.
 *
 * Pure on purpose: quiz.js touches the DOM at module load, so this is the part
 * a test can actually run.
 *
 * @param {number} respondidas how many DISTINCT questions now carry an answer
 * @param {number} totalPerguntas how many questions the quiz has
 * @returns {string|null} page name to beacon, or null if this answer is not a mark
 */
export function marcoDoFunil(respondidas, totalPerguntas) {
  if (respondidas === 1) return MARCO_INICIO;
  // Half is computed from the real question count instead of written as a
  // literal. The quiz already went from 18 screens to 12 once and will move
  // again; a hardcoded 6 would have quietly turned "halfway" into "two thirds
  // in", and the step would keep its name while measuring something else.
  if (totalPerguntas > 0 && respondidas === Math.ceil(totalPerguntas / 2)) return MARCO_MEIO;
  return null;
}
