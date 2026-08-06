// Runtime config for the quiz -> VSL Essencial funnel.
// Plain script (not a module) loaded before quiz.js, so window.DI_CONFIG is
// already set when the module runs. Nothing here is secret: it all ships to
// the browser anyway.
window.DI_CONFIG = {
  // Checked in the browser on 06/08: title, recurrence and price read off the
  // rendered checkout, not the raw HTML (the "R$ 300" in the source is the ICP
  // ceiling, not a price).
  checkoutAnual: "https://chk.eduzz.com/8WPNDOK30P", // assinatura 1 ano · R$ 997,00
  checkoutTrimestral: "https://chk.eduzz.com/D0R8VBG29Y", // assinatura 3 meses · R$ 297,00
  metaPixelId: "", // plano.html has no pixel today; same id goes here when it gets one
  leadUrl: "https://webhook.drheliobarros.com.br/api/quiz/lead",
  beaconUrl: "https://webhook.drheliobarros.com.br/api/funnel/events",
  // resultado.mjs owns this href for the result-screen CTA. The copy here is
  // for /vsl (Task 6). If the number or the message changes, change both.
  whatsappConsultoria:
    "https://wa.me/551151923850?text=Fiz%20o%20diagn%C3%B3stico%20no%20site%20e%20quero%20falar%20sobre%20a%20consultoria.",
  offerDelaySeconds: 128, // measured on the final cut (Task 11)
};
