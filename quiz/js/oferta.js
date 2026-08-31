// Lógica de /oferta: mede a página, carimba o degrau do quiz no checkout e
// fecha a turma sozinha quando o prazo vence.
//
// Módulo (como quiz.js e vsl.js) para importar o beacon, o helper de checkout
// e a janela da campanha em vez de repetir os três. O <script> continua no fim
// do body, depois de config.js, então o timing é o mesmo das outras páginas.
import { enviarBeacon, enviarPixel } from "./beacon.mjs";
import { lerDegrauDoQuiz, comDegrau } from "./checkout.mjs";
import { estadoAgora, FECHADA } from "./campanha.mjs";

const cfg = window.DI_CONFIG || {};

// --- Medição --------------------------------------------------------------
// O PageView do Pixel dispara em config.js, do <head>. Este é o nosso contador
// da mesma chegada, e é o numerador da métrica do Momento 2 do Diário de
// Campanha ("visitas à página de oferta ≥ 600"). Nome próprio de página,
// porque a pergunta que interessa é quanto ESTA página traz.
enviarBeacon("essencial-oferta", "view");

// --- Estado da turma ------------------------------------------------------
// 16/11 é data real. Prorrogar não custa esta campanha, custa a próxima,
// porque em janeiro a conversa é com a mesma lista e ela vai lembrar que o
// prazo não era prazo. Por isso o fechamento não depende de alguém publicar
// alguma coisa às 23:59 de uma segunda-feira: a página se fecha sozinha.
//
// O relógio é o do visitante, e um relógio errado deixa a página aberta depois
// da hora. É o erro tolerável dos dois: quem chegar assim ainda encontra a
// oferta, e a desativação do checkout na Eduzz em 17/11 fecha a porta de vez.
// O inverso (fechar cedo por relógio adiantado) custaria venda em silêncio.
const fechada = estadoAgora(cfg) === FECHADA;
for (const el of document.querySelectorAll(".quando-aberta")) el.hidden = fechada;
for (const el of document.querySelectorAll(".quando-fechada")) el.hidden = !fechada;

// --- Checkout -------------------------------------------------------------
// Só o anual. O trimestral de R$ 297 está fora da comunicação desta campanha
// (Diário de Campanha, § Produto trabalhado), e /vsl e /plano o escondem
// sozinhos enquanto a janela corre.
const degrau = lerDegrauDoQuiz();
const links = document.querySelectorAll("#cta-topo, #cta-preco");
if (cfg.checkoutAnual) {
  const href = comDegrau(cfg.checkoutAnual, degrau);
  for (const link of links) link.href = href;
} else {
  // Sem checkout configurado o botão viraria um link para lugar nenhum, que é
  // pior do que não existir: o visitante clica, nada acontece, e o beacon
  // ainda registra um checkout_click que nunca teve chance de virar venda.
  console.warn("oferta: checkoutAnual ausente no DI_CONFIG, botões desativados");
  for (const link of links) link.removeAttribute("href");
}

// Mesmo passo de funil que /vsl e /plano reportam, e de propósito com o mesmo
// nome de página: assim "cliques no checkout" continua sendo uma consulta só,
// somando as três portas. A separação por origem sai do utm_campaign, que o
// payload do beacon já carrega, sem inventar campo novo.
//
// sendBeacon (dentro de enviarBeacon) é o que faz isso sobreviver à navegação
// que o clique dispara logo em seguida, então não precisa de preventDefault.
function aoClicar() {
  enviarBeacon("essencial", "checkout_click");
  // InitiateCheckout dá ao anúncio um evento intermediário contra o que
  // otimizar durante a janela de oferta. Sem par no servidor, então sem
  // eventID: não há o que deduplicar.
  enviarPixel("InitiateCheckout");
}
for (const link of links) link.addEventListener("click", aoClicar);
