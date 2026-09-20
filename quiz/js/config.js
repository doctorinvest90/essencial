// Runtime config for the quiz -> VSL Essencial funnel.
// Plain script (not a module) loaded before quiz.js, so window.DI_CONFIG is
// already set when the module runs. Nothing here is secret: it all ships to
// the browser anyway.
window.DI_CONFIG = {
  // Checked in the browser on 06/08: title, recurrence and price read off the
  // rendered checkout, not the raw HTML (the "R$ 300" in the source is the ICP
  // ceiling, not a price).
  // Trocados em 11/08: os produtos foram refeitos na Eduzz para carregar as aulas da
  // área de membros, e a associação do curso não era possível nos SKUs antigos. Os
  // antigos (8WPNDOK30P anual, D0R8VBG29Y trimestral) vendem o mesmo plano SEM o curso
  // atrelado, então continuar apontando para eles entrega um produto incompleto.
  checkoutAnual: "https://chk.eduzz.com/Z0B1BKE69A", // assinatura 1 ano · R$ 997,00
  checkoutTrimestral: "https://chk.eduzz.com/1W32VO8Q92", // assinatura 3 meses · R$ 297,00
  leadUrl: "https://webhook.drheliobarros.com.br/api/quiz/lead",
  beaconUrl: "https://webhook.drheliobarros.com.br/api/funnel/events",
  // "Pixel de Doctor de Invest" — the same pixel the consultoria landing page
  // fires and the same id the quiz-intake CAPI already reports to
  // (QUIZ_CAPI_PIXEL_ID). One pixel for the whole house is what lets a single
  // ad account optimise, and later dedup pixel against server events.
  pixelId: "1893562330686295",
  // The price bar (a fixed strip with R$997 and the button) appears here, long
  // before the full offer box. Measured 31/08/2026: of the 4 leads who opened
  // /vsl, 3 left before 111s and therefore never saw a price or a button at
  // all. This number is what stops the page from being a locked door; the box
  // below still waits for the narration to name the product.
  // Must stay smaller than offerDelaySeconds (the self-check enforces it).
  precoDelaySeconds: 40,
  // Janela da campanha Essencial (Diário de Campanha, Linha de Marcha):
  // aquecimento 26/10, oferta aberta 03/11, fechamento 16/11. Duas datas, três
  // páginas: /oferta troca o botão pela fila de janeiro quando a janela fecha,
  // /vsl e /plano escondem o trimestral de R$ 297 enquanto ela corre.
  //
  // O offset -03:00 é o que faz o prazo ser 23:59 de Brasília e não do relógio
  // de quem está lendo. 16/11 é data real: prorrogar não custa esta campanha,
  // custa a próxima, porque em janeiro a conversa é com a mesma lista.
  // A comparação mora em campanha.mjs, com self-check em node.
  campanhaAbre: "2026-10-26T00:00:00-03:00",
  campanhaFecha: "2026-11-16T23:59:59-03:00",
  offerDelaySeconds: 109.36, // measured on the final cut: start of the SRT cue that
  // names the product ("Ele se chama Doctor Invest Essencial"). The 128 that stood
  // here was a writing-time estimate at 150 words/min; the cloned voice reads at 174,
  // so the name lands 17s earlier. Re-cut the narration and this number moves with it.
};

// --- Production-domain rule ------------------------------------------------
// The one copy of the rule. It lives here, and not in beacon.mjs, because this
// is the only file every page loads as a classic script inside <head>: it is
// the earliest point at which anything of ours can run. beacon.mjs reads the
// boolean computed below instead of declaring a second regex, which is the
// copy that would drift.
// The leading (^|\.) is what keeps a lookalike host out.
const DOMINIO_DE_PRODUCAO = /(^|\.)drheliobarros\.com\.br$/;
window.DI_CONFIG.producao = DOMINIO_DE_PRODUCAO.test(window.location.hostname);

// --- Meta Pixel ------------------------------------------------------------
// Fires from <head>, not from the end of the module graph, and that position
// IS the feature. Measured on 25/08/2026: initialised from quiz.js the
// PageView sat four network round trips deep (html -> quiz.js -> its three
// imports -> fbevents.js from connect.facebook.net), and over the paid window
// Meta counted 66 landing_page_views against the 209 arrivals our own beacon
// recorded for the same traffic. The missing two thirds were never people
// leaving: they were a third-party request that never got made, failing with
// no console error. Anything that pushes this call back down into the module
// graph brings the undercount back.
//
// Not here on purpose: the "Lead" event (it belongs at quiz completion, see
// enviarPixel in beacon.mjs).
//
// --- Why the PageView carries an eventID ------------------------------------
// Moving this call into <head> on 25/08 cut the undercount but did not close
// it: over the full paid cycle (11/08–11/09, R$1.000) Meta reported 175
// landing_page_views against the 471 arrivals our own beacon recorded for the
// same traffic — still 2,69×. What is left is the part no position fixes: ad
// blockers and ITP refusing connect.facebook.net outright. Only the server
// can report those arrivals, and POST /api/funnel/events now does
// (FUNNEL_CAPI_PAGEVIEW_PAGE in main.py).
//
// That server report is only safe because of the id below. Meta dedups a
// browser event against a Conversions API event by (event_name, event_id); a
// server PageView with an id the browser never used would count the same
// arrival twice, and the inflated denominator would make every cost-per-
// arrival in the account look half of what it is. Same contract the Lead event
// already honours — see enviarPixel in beacon.mjs.
//
// randomUUID needs a secure context; production is https, and the fallback
// keeps a local http test from throwing (it just will not dedup, and outside
// production nothing is sent anyway).
window.DI_CONFIG.pageViewEventId =
  (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
  `pv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

if (window.DI_CONFIG.pixelId && window.DI_CONFIG.producao) {
  carregarFbevents();
  window.fbq("init", window.DI_CONFIG.pixelId);
  window.fbq("track", "PageView", {}, { eventID: window.DI_CONFIG.pageViewEventId });
} else if (!window.DI_CONFIG.producao) {
  console.info(
    `pixel: não carregado porque "${window.location.hostname}" está fora de drheliobarros.com.br. É de propósito, para teste local não poluir o pixel.`
  );
}

/* eslint-disable */
// Vendor snippet, kept byte-for-byte as Meta publishes it. What earns the
// ugliness is the stub queue: it makes an fbq() call that happens before
// fbevents.js finishes downloading still arrive instead of throwing. Rewriting
// this prettier is exactly how that queue gets dropped. Function declaration,
// so it is hoisted above the call site above.
function carregarFbevents() {
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
}
/* eslint-enable */
