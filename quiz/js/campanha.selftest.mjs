// Self-check de campanha.mjs. Roda em node, sem DOM:
//     node quiz/js/campanha.selftest.mjs
//
// Existe porque estas comparações decidem duas coisas caras: se o botão de
// R$ 997 aparece, e se o prazo de 16/11 (o compromisso mais difícil do Diário
// de Campanha) é cumprido mesmo que ninguém publique nada naquela noite.
import assert from "node:assert/strict";
import { ANTES, ABERTA, FECHADA, instante, estadoDaCampanha } from "./campanha.mjs";

const ABRE = "2026-10-26T00:00:00-03:00";
const FECHA = "2026-11-16T23:59:59-03:00";
const em = (iso) => Date.parse(iso);

// --- instante -------------------------------------------------------------
assert.equal(instante(FECHA), Date.parse("2026-11-17T02:59:59Z"), "offset -03:00 vira UTC");
assert.ok(Number.isNaN(instante(undefined)));
assert.ok(Number.isNaN(instante("dezesseis de novembro")));

// --- os três estados ------------------------------------------------------
assert.equal(estadoDaCampanha(em("2026-08-31T12:00:00-03:00"), ABRE, FECHA), ANTES);
assert.equal(estadoDaCampanha(em("2026-10-25T23:59:59-03:00"), ABRE, FECHA), ANTES);
assert.equal(estadoDaCampanha(em("2026-10-26T00:00:00-03:00"), ABRE, FECHA), ABERTA, "abre inclusivo");
assert.equal(estadoDaCampanha(em("2026-11-03T09:00:00-03:00"), ABRE, FECHA), ABERTA);
assert.equal(estadoDaCampanha(em("2026-11-16T23:59:59-03:00"), ABRE, FECHA), ABERTA, "fecha inclusivo");
assert.equal(estadoDaCampanha(em("2026-11-17T00:00:00-03:00"), ABRE, FECHA), FECHADA);
assert.equal(estadoDaCampanha(em("2027-01-05T09:00:00-03:00"), ABRE, FECHA), FECHADA);

// O fechamento é 23:59 de Brasília, não do relógio de quem lê. Às 22h de
// 16/11 em Lisboa (UTC) já passou das 23:59 em São Paulo do dia 16? Não:
// 2026-11-16T22:00:00Z é 19:00 em São Paulo. Ainda aberta.
assert.equal(estadoDaCampanha(em("2026-11-16T22:00:00Z"), ABRE, FECHA), ABERTA);
// Já 2026-11-17T03:00:00Z é 00:00 de 17/11 em São Paulo. Fechada.
assert.equal(estadoDaCampanha(em("2026-11-17T03:00:00Z"), ABRE, FECHA), FECHADA);

// --- falha aberta ---------------------------------------------------------
// Config ausente ou quebrada não pode derrubar a venda em silêncio.
const warns = [];
const original = console.warn;
console.warn = (m) => warns.push(m);
try {
  assert.equal(estadoDaCampanha(Date.now(), undefined, undefined), ABERTA);
  assert.equal(estadoDaCampanha(Date.now(), ABRE, "16/11/2026"), ABERTA);
  assert.equal(estadoDaCampanha(Date.now(), FECHA, ABRE), ABERTA, "janela invertida");
} finally {
  console.warn = original;
}
assert.equal(warns.length, 3, "toda falha avisa no console");

console.log("campanha.selftest: ok");
