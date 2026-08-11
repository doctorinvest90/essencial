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
