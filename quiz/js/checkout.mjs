// O degrau do quiz carimbado no link do checkout, em um lugar só.
//
// Nasceu dentro do vsl.js. Saiu de lá quando /oferta virou a terceira página
// com botão de compra: a terceira cópia de "leia o diagnóstico da sessão e
// escreva utm_content" é a que diverge sem ninguém notar, e o que ela
// carimba é o único elo entre o degrau diagnosticado e a venda.
//
// Continua NÃO importando diagnostico.mjs, pela mesma razão que o vsl.js
// tinha: uma página de venda não deve puxar o motor de diagnóstico inteiro só
// para validar uma letra. As quatro letras são a chave OPENS de
// diagnostico.mjs; se aquele domínio ganhar uma quinta, muda aqui também.
const DEGRAUS_VALIDOS = ["A", "B", "C", "D"];

/** O degrau A/B/C/D da sessão do quiz, ou null quando não houve quiz. */
export function lerDegrauDoQuiz() {
  try {
    const bruto = sessionStorage.getItem("essencial.diag");
    if (!bruto) return null;
    const diag = JSON.parse(bruto);
    return DEGRAUS_VALIDOS.includes(diag.real) ? diag.real : null;
  } catch (falha) {
    console.warn("checkout: sessionStorage indisponível ou diagnóstico inválido", falha);
    return null;
  }
}

/** O checkout com utm_content=degrau-X. Sem degrau, devolve o link cru. */
export function comDegrau(checkoutUrl, degrau) {
  try {
    const alvo = new URL(checkoutUrl);
    if (degrau) alvo.searchParams.set("utm_content", `degrau-${degrau}`);
    return alvo.toString();
  } catch (falha) {
    return checkoutUrl;
  }
}
