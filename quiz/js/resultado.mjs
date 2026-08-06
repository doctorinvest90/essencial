// Result-screen copy for the Essencial quiz. Pure function: takes the
// diagnosticar() output, returns display strings. No DOM, no network.
// Source of screen structure and title wording:
// docs/superpowers/specs/2026-08-06-quiz-vsl-essencial-design.md
// §4 "O resultado" (screen layout) and §3 D5 (the four titles by gap case).

/** @typedef {"A"|"B"|"C"|"D"} Degrau */
/** @typedef {{ real: Degrau|null, energia: Degrau, abertos: Degrau[], motivos: string[], gap: "acima"|"igual"|"abaixo"|"emordem", faixa: "ate100"|"100a300"|"300a500"|"acima500" }} Diag */

// WhatsApp CTA for faixa "acima500" (over R$500k in assets: a consultoria
// candidate, not the R$997/year product, spec D10). Message text lives in
// its own named constant so it's easy to swap without touching the rest of
// the file.
const WHATSAPP_CONSULTORIA_MENSAGEM =
  "Fiz o diagnóstico no site e quero falar sobre a consultoria.";
const WHATSAPP_CONSULTORIA_HREF = `https://wa.me/551151923850?text=${encodeURIComponent(WHATSAPP_CONSULTORIA_MENSAGEM)}`;

// Per-degrau copy: why order matters more than the asset, and the one
// organizing action to take first. Hard rules (regulatory, not stylistic):
// no asset named, no return promised or projected, no tax interpretation
// asserted, primeiroPasso is always an organizing action, never a buy
// instruction.
const DEGRAUS = {
  A: {
    porque:
      "Todo investimento acima da reserva vira provisório enquanto a via aérea segue aberta: o primeiro imprevisto obriga a venda, no momento que você não escolhe. Fechar esse degrau primeiro é o que sustenta os outros três.",
    primeiroPasso:
      "Dimensione sua reserva de emergência: quanto custa o seu padrão de vida por mês, multiplicado pelos meses de folga que você quer ter.",
  },
  B: {
    porque:
      "Sem cobertura clara e com PF e PJ misturados, um imprevisto de saúde ou na clínica pode alcançar o seu patrimônio pessoal e deixar a família sem renda ao mesmo tempo. Proteger vem antes de investir porque defende o que já foi construído.",
    primeiroPasso:
      "Levante o que você já tem de cobertura (vida e invalidez) e separe formalmente o que é PJ do que é patrimônio pessoal.",
  },
  C: {
    porque:
      "Escolher onde investir só porque alguém indicou, ou aportar só quando sobra, entrega o resultado ao acaso. Critério e regularidade pesam mais do que qualquer produto específico.",
    primeiroPasso:
      "Defina um valor fixo de aporte mensal e um critério simples para decidir onde ele entra, antes de olhar qualquer produto.",
  },
  D: {
    porque:
      "Uma carteira bem montada e nunca revisada se desalinha sozinha: o perfil muda, o cenário muda, e ninguém percebe até o extrato surpreender. Manter é o que faz a ordem dos outros três degraus continuar valendo com o tempo.",
    primeiroPasso:
      "Marque uma data fixa no ano para revisar a carteira inteira e organizar como o imposto de investimentos vai ser resolvido, sem deixar para abril.",
  },
};

// real === null: nothing open. Still needs porque + primeiroPasso: praise
// plus the next step (manter), not empty copy. Someone in order is still a
// good buyer, because they want to stay that way (spec D5).
const EM_ORDEM = {
  porque:
    "Sua ordem está de pé porque cada degrau foi resolvido antes do próximo. Isso é raro, e é o que mantém o resultado protegido quando o cenário muda.",
  primeiroPasso: "Marque a próxima revisão da carteira inteira, para a ordem continuar de pé.",
};

// Anatomy name shown next to each degrau letter in the "acima" title (spec
// D4, updated wording confirmed in the Task 3 review: the letter alone
// doesn't decode for someone who closes the tab and comes back later).
const NOMES = { A: "Via aérea", B: "Ventilação", C: "Circulação", D: "Reavaliação" };

/** @param {Diag} diag */
function tituloPorGap(diag) {
  switch (diag.gap) {
    case "acima":
      return `Você está no degrau ${diag.energia} (${NOMES[diag.energia]}) com o ${diag.real} (${NOMES[diag.real]}) ainda aberto.`;
    case "igual":
      return "Você está no degrau certo, e travado nele.";
    case "abaixo":
      return "Você cuida da base enquanto o resto espera.";
    default:
      // "emordem"
      return "Sua ordem está de pé.";
  }
}

/** @param {Diag} diag */
function ctaPor(diag) {
  // Over R$500k is a consultoria candidate, not the R$997/year product
  // (spec D10). Applies even when the diagnosis is in order.
  if (diag.faixa === "acima500") {
    return { label: "Falar sobre a consultoria", href: WHATSAPP_CONSULTORIA_HREF };
  }
  return { label: "Ver o que fazer com isso", href: "/vsl" };
}

/**
 * @param {Diag} diag
 * @returns {{ titulo: string, abertos: string[], porque: string,
 *             primeiroPasso: string, cta: { label: string, href: string } }}
 */
export function textoResultado(diag) {
  const template = diag.real === null ? EM_ORDEM : DEGRAUS[diag.real];
  return {
    titulo: tituloPorGap(diag),
    abertos: diag.motivos,
    porque: template.porque,
    primeiroPasso: template.primeiroPasso,
    cta: ctaPor(diag),
  };
}
