// Progresso e resumo da empresa (usado no painel do participante e na visão do cliente do administrador)
import { FER, DIAS_FER, rotulos, trilha, radarSVG } from "./ferramentas-def.js";

const t = x => String(x ?? "").trim();
export const brl = v => "R$ " + Math.round(Number(v) || 0).toLocaleString("pt-BR");
export const fmt = ts => ts ? new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
const NA = 8;

const notaTem = n => t(n?.vi) || t(n?.eu);
const areasFeitas = d => Object.values(d?.areas || {}).filter(v => (Array.isArray(v.notas) ? v.notas.some(notaTem) : (t(v.vi) || t(v.eu))) && v.nivel != null).length;
const areasTocadas = d => Object.values(d?.areas || {}).filter(v => (Array.isArray(v.notas) ? v.notas.some(notaTem) : (t(v.vi) || t(v.eu))) || v.nivel != null).length;
const ferTocada = d => !!d && ((d.chat || []).length || Object.values(d.out || {}).some(x => t(x)) || Object.values(d.in || {}).some(x => t(x?.v)) || Object.values(d.g || {}).some(l => (l || []).some(n => t(n.t) || Object.values(n.c || {}).some(x => t(x?.v)))));

/** Lista de todas as ações da imersão para um participante, com status. regs: {tipo: {dados, atualizado_em}}, ex: exercício da empresa. q: sufixo de URL (ex.: "&p=ID") */
export function itens(regs, ex, q = "") {
  const L = [];
  const pq = q ? "?" + q.replace(/^&/, "") : "";
  // Plano Anual (da empresa)
  const exSt = !ex ? "falta" : ex.status === "concluido" ? "feito" : (ex.resumo?.receita || (ex.resumo?.etapa || 0) > 0) ? "andamento" : "falta";
  L.push({ k: "plano", grupo: "Antes da imersão", data: "2026-11-17", titulo: "Plano Anual 2027", sub: "Planilha de planejamento da empresa", st: exSt, link: "exercicio.html" + (q && ex?.empresa_id ? `?empresa=${ex.empresa_id}` : ""), upd: ex?.atualizado_em });
  // Visita
  const vis = regs.visita?.dados;
  const vf = areasFeitas(vis);
  L.push({ k: "visita", grupo: "Visita técnica · 18/11", data: "2026-11-18", titulo: "Matriz: o que vi × minha empresa", sub: `${vf} de ${NA} áreas comparadas`, st: vf >= NA ? "feito" : areasTocadas(vis) ? "andamento" : "falta", link: `visita.html?dia=visita${q}`, upd: regs.visita?.atualizado_em });
  const acs = (vis?.acoes || []).filter(a => t(a.o)).length;
  L.push({ k: "card", grupo: "Visita técnica · 18/11", data: "2026-11-18", titulo: "Compromisso da visita (card das 3 ações)", sub: `${acs} de 3 ações`, st: vis?.compromisso ? "feito" : acs ? "andamento" : "falta", link: `visita.html?dia=visita${q}#compromissoEx`, upd: regs.visita?.atualizado_em });
  // Dias
  [["dia1", "1º dia · 19/11", "2026-11-19", "fer_dia1"], ["dia2", "2º dia · 20/11", "2026-11-20", "fer_dia2"]].forEach(([dia, grupo, data, tipoF]) => {
    const d = regs[dia]?.dados, af = areasFeitas(d);
    L.push({ k: dia, grupo, data, titulo: "Matriz: o que aprendi × minha empresa", sub: `${af} de ${NA} áreas${d?.compromisso ? " · compromisso assumido" : ""}`, st: d?.compromisso ? "feito" : (af || areasTocadas(d)) ? "andamento" : "falta", link: `visita.html?dia=${dia}${q}`, upd: regs[dia]?.atualizado_em });
    const fd = regs[tipoF]?.dados || {};
    DIAS_FER[dia].ordem.forEach(k => L.push({ k, grupo, data, titulo: FER[k].nome, sub: FER[k].saida, st: fd[k]?.ok ? "feito" : ferTocada(fd[k]) ? "andamento" : "falta", link: `ferramentas.html?dia=${dia}${q}#${k}`, upd: regs[tipoF]?.atualizado_em }));
  });
  return L;
}

export function pct(lista) { return lista.length ? Math.round(lista.filter(i => i.st === "feito").length / lista.length * 100) : 0; }

/** Próximas pendências: primeiro as do dia de hoje, depois as atrasadas, depois as futuras. */
export function pendencias(lista, n = 4) {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const p = lista.filter(i => i.st !== "feito");
  const peso = i => i.data === hoje ? 0 : i.data < hoje ? 1 : 2;
  return p.sort((a, b) => peso(a) - peso(b) || (a.st === "andamento" ? -1 : 0) - (b.st === "andamento" ? -1 : 0) || a.data.localeCompare(b.data)).slice(0, n);
}

/** Decisões registradas pela empresa (todas as pessoas). rows: [{nome, regs}] */
export function decisoes(rows) {
  const out = [];
  rows.forEach(({ nome, regs }) => {
    const vis = regs.visita?.dados;
    const ac = (vis?.acoes || []).filter(a => t(a.o));
    if (ac.length) out.push({ titulo: "Ações da visita técnica", quem: nome, itens: ac.map(a => `${t(a.o)}${a.q ? " · " + t(a.q) : ""}${a.p ? " · " + a.p : ""}`) });
    const f1 = regs.fer_dia1?.dados || {}, f2 = regs.fer_dia2?.dados || {};
    const lin = (k, d, b, cols) => { const bl = FER[k].out.find(x => x.b === b); if (!bl || !d?.out) return []; const rot = rotulos(FER[k], bl, d);
      return rot.map((r, i) => { const v = cols.map(c => t(d.out[`${b}${i}_${c}`])).filter(Boolean); return v.length ? (bl.rot ? r + ": " : "") + v.join(" · ") : ""; }).filter(Boolean); };
    const pd = lin("painel", f1.painel, "d", ["dec", "st"]); if (pd.length) out.push({ titulo: "Painel de Decisões 360", quem: nome, itens: pd });
    const pr = lin("prioridades", f2.prioridades, "p", ["p"]); if (pr.length) out.push({ titulo: "Prioridades 2027", quem: nome, itens: pr });
    const nu = lin("onepage", f2.onepage, "num", ["v"]); if (nu.length) out.push({ titulo: "Os cinco números de 2027 (One Page)", quem: nome, itens: nu });
    const pj = lin("projetos", f2.projetos, "pj", ["nome", "resp", "prazo"]); if (pj.length) out.push({ titulo: "Projetos 2027", quem: nome, itens: pj });
    const vb = lin("viabilidade", f2.viabilidade, "ent", ["v"]); if (vb.length) out.push({ titulo: "Viabilidade 360 (resultado, capacidade, caixa)", quem: nome, itens: vb });
    const cp = f2.compromisso?.out || {}; if (t(cp.dec)) out.push({ titulo: "Compromisso 360 · ESCREVA. ASSUMA. EXECUTE.", quem: nome, itens: [`Decisão: ${t(cp.dec)}`, t(cp.sete) && `Próximos 7 dias: ${t(cp.sete)}`, t(cp.resp) && `Responsável: ${t(cp.resp)}`].filter(Boolean) });
  });
  return out;
}

/** Agrupa as linhas de atividades por participante: { participante_id: { tipo: row } } */
export function porParticipante(ats) {
  const m = {}; (ats || []).forEach(a => { (m[a.participante_id] = m[a.participante_id] || {})[a.tipo] = a; }); return m;
}

export const ROT_ST = { feito: "Concluído", andamento: "Em andamento", falta: "Não começou" };
export const CLS_ST = { feito: "aprovado", andamento: "pendente", falta: "bloqueado" };

// ---------- blocos de HTML compartilhados ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IC = (n, c) => (window.IC ? window.IC(n, c) : "");

export const CSS_RESUMO = `
  .nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:12px}
  .num{min-width:0;overflow-wrap:anywhere}
  .num{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
  .num small{display:block;font:600 11.5px var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .num b{display:block;font:700 clamp(1.25rem,1rem + 1vw,1.6rem)/1.2 var(--f-display);letter-spacing:-.02em;margin-top:6px}
  .num.dest{background:#0b0b0a;border-color:#0b0b0a;color:#fff}.num.dest small{color:var(--gold-hi)}
  .num .neg{color:var(--err)}.num .pos{color:var(--ok)}.num.dest .pos{color:#7fdca0}
  .prog{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center}
  .prog .p{font:800 clamp(2.4rem,2rem + 2vw,3.2rem)/1 var(--f-display);letter-spacing:-.04em}
  .prog .p small{font-size:.45em;letter-spacing:0}
  .prog .fita{height:14px}
  .pend{display:grid;gap:8px;margin-top:14px}
  .pend a{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;min-height:62px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-decoration:none;color:var(--ink)}
  .pend a:hover{border-color:var(--ink)}
  .pend .tag{font:700 11px var(--f-body);letter-spacing:.06em;text-transform:uppercase;padding:4px 8px;border-radius:999px;background:var(--paper-2);color:var(--ink-2);white-space:nowrap}
  .pend .tag.hoje{background:var(--gold);color:#0b0b0a}
  .pend b{display:block;font:600 15px var(--f-display)}.pend small{display:block;color:var(--muted);font-size:13px}
  .chk{display:grid;gap:14px}
  .chk h4{font:700 12px var(--f-body);letter-spacing:.14em;text-transform:uppercase;color:var(--gold-ink);margin-bottom:6px}
  .chk ul{list-style:none;display:grid;gap:4px;margin:0;padding:0}
  .chk li a{display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border-radius:9px;text-decoration:none;color:var(--ink);font-size:14.5px}
  .chk li a:hover{background:var(--paper)}
  .chk .bola{width:20px;height:20px;border-radius:50%;border:2px solid var(--line-2);display:grid;place-items:center}
  .chk .feito .bola{background:var(--ok);border-color:var(--ok);color:#fff}.chk .feito .bola svg{width:13px;height:13px}
  .chk .andamento .bola{border-color:var(--warn);background:conic-gradient(var(--warn) 50%,transparent 0)}
  .chk li small{color:var(--muted);font-size:12.5px;white-space:nowrap}
  .dec{display:grid;gap:10px}
  .dec .d{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:10px;padding:12px 14px}
  .dec .d b{font:700 14.5px var(--f-display)}.dec .d small{color:var(--muted);font-size:12.5px;margin-left:6px}
  .dec .d ul{margin:6px 0 0 18px;font-size:14.5px;line-height:1.5}
  .vazio-b{color:var(--muted);font-size:14.5px;line-height:1.5}`;

export function htmlNumeros(ex, linkPlano) {
  const r = ex?.resumo || {};
  if (!ex || !r.receita) return `<div class="num" style="grid-column:1/-1"><small>Plano Anual 2027</small><p class="vazio-b" style="margin:8px 0 12px">Os números da empresa aparecem aqui assim que o Plano Anual for preenchido.</p><a class="btn sm" href="${linkPlano}" style="width:auto">Preencher o Plano Anual</a></div>`;
  const m = (r.margem || 0) * 100, cls = v => v >= 0 ? "pos" : "neg";
  return `
    <div class="num dest"><small>Faturamento 2027</small><b>${brl(r.receita)}</b></div>
    <div class="num dest"><small>Resultado líquido 2027</small><b class="${cls(r.resultado)}">${brl(r.resultado)}</b></div>
    <div class="num"><small>Margem líquida</small><b class="${cls(m)}">${m.toFixed(1).replace(".", ",")}%</b></div>
    <div class="num"><small>Ponto de equilíbrio (ano)</small><b>${brl(r.pe)}</b></div>
    <div class="num"><small>Menor saldo de caixa</small><b class="${cls(r.menorSaldo)}">${brl(r.menorSaldo)}</b></div>
    <div class="num"><small>Regime</small><b style="font-size:1.1rem">${ex.regime === "presumido" ? "Lucro Presumido" : "Simples Nacional"}</b></div>`;
}

export function htmlPendencias(lista, n = 4) {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const p = pendencias(lista, n);
  if (!p.length) return `<p class="vazio-b" style="margin-top:12px">Tudo concluído. Parabéns!</p>`;
  return `<div class="pend">${p.map(i => `<a href="${i.link}"><span class="tag ${i.data === hoje ? "hoje" : ""}">${i.data === hoje ? "Hoje" : i.grupo.split(" · ").pop()}</span><span><b>${esc(i.titulo)}</b><small>${i.st === "andamento" ? "Em andamento · " : ""}${esc(i.sub)}</small></span>${IC("chev")}</a>`).join("")}</div>`;
}

export function htmlChecklist(lista) {
  const grupos = [...new Set(lista.map(i => i.grupo))];
  return `<div class="chk">${grupos.map(g => { const it = lista.filter(i => i.grupo === g), f = it.filter(i => i.st === "feito").length;
    return `<div><h4>${esc(g)} · ${f}/${it.length}</h4><ul>${it.map(i => `<li class="${i.st}"><a href="${i.link}"><span class="bola">${i.st === "feito" ? IC("check") : ""}</span><span>${esc(i.titulo)}</span><small>${ROT_ST[i.st]}${i.upd && i.st !== "falta" ? " · " + fmt(i.upd) : ""}</small></a></li>`).join("")}</ul></div>`; }).join("")}</div>`;
}

export function htmlDecisoes(dec) {
  if (!dec.length) return `<p class="vazio-b">As decisões registradas nas ações (card da visita, Painel de Decisões, Prioridades, Projetos e One Page) aparecem aqui conforme forem preenchidas.</p>`;
  return `<div class="dec">${dec.map(d => `<div class="d"><b>${esc(d.titulo)}</b><small>${esc(d.quem)}</small><ul>${d.itens.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>`;
}

/** Trilha do Plano 2027 + radar do Diagnóstico para o painel. regs: {tipo: row} */
export function htmlTrilha(regs, q = "") {
  const fer = { ...(regs.fer_dia1?.dados || {}), ...(regs.fer_dia2?.dados || {}) };
  return `<div class="tri">${trilha(fer).map((e, i) => `<a class="${e.st}" href="ferramentas.html?dia=${FER[e.k[0]].dia}${q}#${e.k[0]}"><small>${i + 1} · ${e.fase}</small><b>${esc(e.t)}</b></a>`).join("")}</div>`;
}
export function htmlRadar(regs) {
  const d = regs.fer_dia1?.dados?.diag; if (!d) return "";
  const P = [["producao","Produção"],["vendas","Vendas"],["marca","Marca/Produto"],["fin","Gestão/Financeiro"],["pessoas","Liderança/Pessoas"],["estrat","Estratégia"]];
  const v = key => { for (const l of Object.values(d.g || {})) for (const n of (l || [])) { const x = t(n?.c?.[key]?.v); if (x) return x; } return ""; };
  const it = P.map(([k, l], i) => { const nv = t(d.out?.[`pil${i}_nota`]) || v(`${k}_nota`); return { l, nv, n: nv === "" || nv === "P" ? NaN : +nv }; });
  if (!it.some(x => x.nv !== "")) return "";
  return `<div style="display:grid;place-items:center">${radarSVG(it.map(x => ({ l: x.l, n: x.n })))}</div>`;
}
export const CSS_TRILHA = `.tri{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
  .tri a{display:grid;gap:3px;align-content:start;min-height:64px;min-width:0;overflow-wrap:anywhere;padding:8px;border-radius:10px;background:var(--surface);border:1px solid var(--line);text-decoration:none;color:var(--ink);font:600 12.5px/1.25 var(--f-body)}
  .tri a small{font:700 10px var(--f-body);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
  .tri a.andamento{border-color:var(--warn)}.tri a.feito{background:var(--ink);color:#fff;border-color:var(--ink)}.tri a.feito small{color:var(--gold-hi)}`;
