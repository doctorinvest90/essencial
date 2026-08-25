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
  offerDelaySeconds: 111.199, // measured on the final cut: start of the SRT cue that
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
// enviarPixel in beacon.mjs) and the server-side CAPI, which is the next
// upgrade — POST /api/quiz/lead already receives the lead and the fbclid.
if (window.DI_CONFIG.pixelId && window.DI_CONFIG.producao) {
  carregarFbevents();
  window.fbq("init", window.DI_CONFIG.pixelId);
  window.fbq("track", "PageView");
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
