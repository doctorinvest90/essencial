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
  leadUrl: "https://webhook.drheliobarros.com.br/api/quiz/lead",
  beaconUrl: "https://webhook.drheliobarros.com.br/api/funnel/events",
  offerDelaySeconds: 128, // measured on the final cut (Task 11)
};
