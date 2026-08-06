// Result-screen copy for the Essencial quiz. Pure function: takes the
// diagnosticar() output, returns display strings. No DOM, no network.
// Source of screen structure and title wording:
// docs/superpowers/specs/2026-08-06-quiz-vsl-essencial-design.md
// §4 "O resultado" (screen layout) and §3 D5 (the four titles by gap case).

/** @typedef {"A"|"B"|"C"|"D"} Degrau */
/** @typedef {{ real: Degrau|null, energia: Degrau, abertos: Degrau[], motivos: string[], gap: "acima"|"igual"|"abaixo"|"emordem", faixa: "ate100"|"100a300"|"300a500"|"acima500" }} Diag */

// WhatsApp CTA for faixa "acima500" (patrimônio acima de R$500k: candidato a
// consultoria, não ao produto de R$997/ano, spec D10). Mensagem isolada
// numa constante nomeada para trocar sem mexer no resto do arquivo.
const WHATSAPP_CONSULTORIA_MENSAGEM =
  "Fiz o diagnóstico no site e quero falar sobre a consultoria.";
const WHATSAPP_CONSULTORIA_HREF = `https://wa.me/551151923850?text=${encodeURIComponent(WHATSAPP_CONSULTORIA_MENSAGEM)}`;

// Per-degrau copy: por que a ordem importa mais que o ativo, e a única ação
// de organização a fazer primeiro. Regras duras (regulatórias, não de
// estilo): nenhum ativo citado, nenhuma promessa ou projeção de
// rentabilidade, nenhuma interpretação tributária afirmada, primeiroPasso é
// sempre organização, nunca instrução de compra.
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

// real === null: nada aberto. Ainda precisa de porque + primeiroPasso:
// elogio e o próximo passo (manter), não uma cópia vazia. Quem está em
// ordem continua sendo bom comprador, porque quer manter (spec D5).
const EM_ORDEM = {
  porque:
    "Sua ordem está de pé porque cada degrau foi resolvido antes do próximo. Isso é raro, e é o que mantém o resultado protegido quando o cenário muda.",
  primeiroPasso: "Marque a próxima revisão da carteira inteira, para a ordem continuar de pé.",
};

/** @param {Diag} diag */
function tituloPorGap(diag) {
  switch (diag.gap) {
    case "acima":
      return `Você está no ${diag.energia} com o ${diag.real} aberto.`;
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
  // Acima de R$500k é candidato a consultoria, não ao produto de R$997/ano
  // (spec D10). Vale mesmo quando o diagnóstico está em ordem.
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
