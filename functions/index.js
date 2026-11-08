/**
 * Cloud Functions (precisam do plano Blaze do Firebase; com este uso, na prática 0 €/mês).
 * Avisos no Telegram para ti:
 *   - novo pedido de orçamento pelo site
 *   - mensagem, ficheiro ou link novo de um cliente na área de cliente
 * Emails para o cliente (enviados da tua conta Gmail):
 *   - confirmação do pedido de orçamento
 *   - "tens uma mensagem nova" quando respondes no painel (no máximo um por conversa até o cliente ver)
 *   - "as tuas fotografias estão prontas" quando publicas uma entrega
 * Segredos (um comando de cada vez):
 *   firebase functions:secrets:set TELEGRAM_TOKEN / TELEGRAM_CHAT / MAIL_USER / MAIL_PASS
 * Sem segredos definidos, a parte correspondente é simplesmente ignorada.
 */
const { onValueCreated } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const MARCA = require("./marca.json");

admin.initializeApp();
const TELEGRAM_TOKEN = defineSecret("TELEGRAM_TOKEN");
const TELEGRAM_CHAT = defineSecret("TELEGRAM_CHAT");
const MAIL_USER = defineSecret("MAIL_USER");
const MAIL_PASS = defineSecret("MAIL_PASS");
const TODOS = [TELEGRAM_TOKEN, TELEGRAM_CHAT, MAIL_USER, MAIL_PASS];
const base = { region: MARCA.regiaoBD, secrets: TODOS };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const corta = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || "");
const linkCliente = (c) => `${(MARCA.site || "").replace(/\/$/, "")}/cliente.html?c=${c}`;
const dataPt = (iso) => { if (!iso) return ""; const d = new Date(iso + "T12:00:00"); return isNaN(d) ? iso : d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: MARCA.fuso }); };

async function avisar(texto) {
  const token = (TELEGRAM_TOKEN.value() || "").trim(), chat = (TELEGRAM_CHAT.value() || "").trim();
  if (!token || !chat || token === "placeholder") return;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }),
  });
  if (!r.ok) console.error("Telegram falhou", r.status);
}

async function email(para, assunto, paragrafos, botao) {
  const user = (MAIL_USER.value() || "").trim(), pass = (MAIL_PASS.value() || "").replace(/\s+/g, "");
  if (!user || !pass || pass === "placeholder" || !emailOk(para)) return;
  const c = MARCA.cores || {};
  const texto = paragrafos.join("\n\n") + (botao ? `\n\n${botao.texto}: ${botao.url}` : "") + `\n\n${MARCA.nome}`;
  const html = `<div style="background:${c.fundo || "#F6F1EA"};padding:32px 16px"><div style="font:16px/1.6 Georgia,serif;color:${c.texto || "#2B2420"};max-width:34rem;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <p style="font-size:26px;margin:0 0 20px">${esc(MARCA.nome)}</p>
    ${paragrafos.map((p) => `<p style="font-family:system-ui,Arial,sans-serif;margin:0 0 16px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}
    ${botao ? `<p style="margin:24px 0 8px"><a href="${esc(botao.url)}" style="display:inline-block;background:${c.texto || "#2B2420"};color:#fff;text-decoration:none;font-family:system-ui,Arial,sans-serif;padding:12px 22px;border-radius:999px">${esc(botao.texto)}</a></p>` : ""}
  </div></div>`;
  try {
    const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await t.sendMail({ from: `"${MARCA.nome}" <${user}>`, to: para, replyTo: user, subject: assunto, text: texto, html });
  } catch (e) { console.error("Email falhou", e.message); }
}

// 1. Pedido de orçamento pelo site
exports.novoPedido = onValueCreated({ ...base, ref: "/pedidos/{id}" }, async (ev) => {
  const p = ev.data.val(); if (!p) return;
  await avisar(`Novo pedido de orçamento!\n${p.nome} · ${p.tipo}\n${p.data ? "Data: " + dataPt(p.data) + "\n" : ""}${p.local ? "Local: " + p.local + "\n" : ""}${p.convidados ? "Convidados: " + p.convidados + "\n" : ""}Email: ${p.email}${p.telemovel ? "\nTel: " + p.telemovel : ""}${p.mensagem ? "\n\n" + corta(p.mensagem, 600) : ""}`);
  await email(p.email, `Recebi o teu pedido · ${MARCA.nome}`, [
    `Olá ${String(p.nome).split(" ")[0]},`,
    `Obrigada pelo teu pedido de orçamento (${String(p.tipo).toLowerCase()}${p.data ? ", " + dataPt(p.data) : ""}). Respondo em menos de ${MARCA.respostaEmHoras || 48} horas.`,
    "Se quiseres acrescentar alguma coisa, é só responder a este email.",
  ]);
});

const projeto = async (c) => (await admin.database().ref(`projetos/${c}`).once("value")).val() || {};

// 2. Mensagens: do cliente → Telegram; tua → email ao cliente (só se ele já viu a anterior)
exports.novaMensagem = onValueCreated({ ...base, ref: "/projetos/{c}/mensagens/{m}" }, async (ev) => {
  const m = ev.data.val(), c = ev.params.c; if (!m) return;
  const P = await projeto(c), I = P.info || {};
  if (m.de === "cliente") return avisar(`Mensagem de ${I.nome}:\n\n${corta(m.t, 800)}`);
  if (!I.email) return;
  const anteriores = Object.entries(P.mensagens || {}).filter(([k, x]) => k !== ev.params.m && x.de === "marca" && x.em < m.em);
  if (!anteriores.length) return; // a mensagem de boas-vindas vai com o link, por WhatsApp ou email, a partir do painel
  const ultima = Math.max(...anteriores.map(([, x]) => x.em)), viu = (P.visto && P.visto.cliente) || 0;
  if (viu < ultima) return; // ainda não leu a anterior: não enche a caixa de correio
  await email(I.email, `Tens uma mensagem nova · ${MARCA.nome}`, [`Olá ${String(I.nome).split(/\s|&/)[0]},`, corta(m.t, 1200)], { texto: "Responder na área de cliente", url: linkCliente(c) });
});

// 3. Ficheiros e links do cliente → Telegram
exports.novoFicheiro = onValueCreated({ ...base, ref: "/projetos/{c}/ficheiros/{f}" }, async (ev) => {
  const f = ev.data.val(); if (!f || f.de !== "cliente") return;
  const I = (await projeto(ev.params.c)).info || {};
  await avisar(`${I.nome} enviou um ficheiro: ${f.nome}`);
});
exports.novoLink = onValueCreated({ ...base, ref: "/projetos/{c}/links/{l}" }, async (ev) => {
  const l = ev.data.val(); if (!l || l.de !== "cliente") return;
  const I = (await projeto(ev.params.c)).info || {};
  await avisar(`${I.nome} partilhou um link${l.desc ? " (" + l.desc + ")" : ""}:\n${l.url}`);
});

// 4. Entrega publicada → email ao cliente
exports.novaEntrega = onValueCreated({ ...base, ref: "/projetos/{c}/entregas/{e}" }, async (ev) => {
  const x = ev.data.val(); if (!x) return;
  const I = (await projeto(ev.params.c)).info || {};
  await email(I.email, `${x.titulo} · prontas para descarregar`, [
    `Olá ${String(I.nome || "").split(/\s|&/)[0]},`,
    `Já podes descarregar: ${x.titulo}${x.nota ? " (" + x.nota + ")" : ""}.`,
    x.validade ? `O link fica disponível até ${dataPt(x.validade)}. Descarrega e guarda uma cópia antes disso.` : "Descarrega e guarda uma cópia: os links do WeTransfer expiram.",
    "Na tua área de cliente tens um guia passo a passo para descarregar.",
  ], { texto: "Abrir a minha área", url: linkCliente(ev.params.c) });
});
