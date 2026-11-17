// Base compartilhada do exercício (preenchimento guiado + planilha)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const C = window.TC_CONFIG;
export const sb = createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const brl = (v, dec = 0) => "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const num = (v, dec = 2) => (v === null || v === undefined || v === "") ? "" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: dec });
export const parse = s => { s = String(s ?? "").trim(); if (!s) return null; const neg = /^\(.*\)$/.test(s) || s.startsWith("-"); s = s.replace(/[^\d,.]/g, ""); if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); const v = parseFloat(s); return isNaN(v) ? null : (neg ? -v : v); };
export const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
export const COLS = "FGHIJKLMNOPQ".split("");     // meses no Orçamento
export const COLS_FC = "CDEFGHIJKLMN".split("");  // meses no Fluxo / Orçado x Realizado

// formata valor como o Excel mostraria (formato numérico simplificado)
export function fmtExcel(v, nf) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v !== "number") return String(v);
  nf = nf || "";
  const sec = nf.split(";");
  if (v === 0 && sec[2] !== undefined) { const z = sec[2].replace(/\\/g, "").replace(/"/g, ""); return z.trim() === "-" ? "–" : z; }
  const f = (v < 0 && sec[1]) ? sec[1] : sec[0];
  const pct = f.includes("%");
  const decM = /0\.(0+)/.exec(f); const dec = decM ? decM[1].length : 0;
  const paren = v < 0 && /\(/.test(f) && sec[1];
  let x = Math.abs(pct ? v * 100 : v);
  let s = x.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: /#,##|,0/.test(f) || x >= 1000 && !pct && !/^0(\.0+)?$/.test(f) });
  if (pct) s += "%";
  if (/x$|\\x/.test(f)) s += "x";
  if (/R\$/.test(f)) s = "R$ " + s;
  if (v < 0) s = paren ? `(${s})` : "-" + s;
  return s;
}

// ---------- sessão / dados ----------
export async function contexto() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("index.html"); throw new Error("sem sessão"); }
  const params = new URLSearchParams(location.search);
  const { data: adm } = await sb.rpc("is_admin");
  const { data: eu } = await sb.from("participantes").select("id,nome,status,empresa_id").eq("id", session.user.id).maybeSingle();
  const empresaId = params.get("empresa") || eu?.empresa_id;
  if (!empresaId) { location.replace(adm ? "admin.html" : "painel.html"); throw new Error("sem empresa"); }
  const membro = eu && eu.empresa_id === empresaId && eu.status === "aprovado";
  if (!membro && !adm) { location.replace("painel.html"); throw new Error("sem acesso"); }
  const { data: emp } = await sb.from("empresas").select("nome,cidade,uf").eq("id", empresaId).maybeSingle();
  const { data: reg } = await sb.from("exercicios").select("*").eq("empresa_id", empresaId).maybeSingle();
  const d = reg?.dados || {};
  const D = { versao: 2, regime: d.regime || reg?.regime || null, celulas: d.versao === 2 ? (d.celulas || {}) : {}, etapa: d.versao === 2 ? (d.etapa || 0) : 0, concluido: d.versao === 2 ? !!d.concluido : false };
  return { session, adm: !!adm, eu, empresaId, emp, reg, D, RO: !membro };
}

const cacheModelo = {};
export async function carregarModelo(regime) {
  if (!cacheModelo[regime]) cacheModelo[regime] = fetch(`modelo_${regime}.json`).then(r => r.json());
  return cacheModelo[regime];
}

export function resumo(motor) {
  const receita = motor.get("DRE Projetada", "O5") || 0, resultado = motor.get("DRE Projetada", "O34") || 0;
  return { receita, resultado, margem: receita ? resultado / receita : 0, pe: motor.get("DRE Projetada", "O43") || 0,
           menorSaldo: motor.get("Painel", "B15") || 0 };
}

let tSave = null;
export function salvarDepois(ctx, motor, onStatus, imediato = false) {
  if (ctx.RO) return;
  clearTimeout(tSave); onStatus && onStatus("Salvando…", false);
  tSave = setTimeout(async () => {
    const r = { ...resumo(motor), etapa: ctx.D.etapa };
    const { error } = await sb.from("exercicios").upsert({
      empresa_id: ctx.empresaId, regime: ctx.D.regime, dados: ctx.D, status: ctx.D.concluido ? "concluido" : "rascunho", resumo: r,
      atualizado_por: ctx.session.user.id, atualizado_por_nome: ctx.eu?.nome || ctx.session.user.email, atualizado_em: new Date().toISOString()
    });
    onStatus && onStatus(error ? "⚠ Não salvou: verifique a internet" : "✓ Salvo automaticamente", !error);
  }, imediato ? 0 : 800);
}

// ---------- exportar ----------
export async function baixar(ctx, motor, modelo) {
  const buf = await fetch(`modelo_${ctx.D.regime}.xlsx`).then(r => r.arrayBuffer());
  const blob = await window.TC_EXPORT.exportar(window.JSZip, buf, modelo, ctx.D.celulas, motor);
  const nome = (ctx.emp?.nome || "empresa").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `Planejamento_2027_${nome}_${ctx.D.regime === "presumido" ? "Lucro_Presumido" : "Simples"}.xlsx`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

// converte as células ao trocar de regime (Orçamento muda de linha: casa pelo nome da conta)
export function converterRegime(celulas, de, para) {
  if (!de || de === para) return celulas;
  const out = {};
  const mapa = {};
  de.contas.forEach(c => { const alvo = para.contas.find(x => x.conta === c.conta && x.grupo === c.grupo) || para.contas.find(x => x.conta === c.conta); if (alvo) mapa[c.r] = alvo.r; });
  for (const [k, v] of Object.entries(celulas)) {
    if (k.startsWith("Orçamento!")) {
      const m = /^Orçamento!([A-Z]+)(\d+)$/.exec(k); const nr = mapa[+m[2]];
      if (nr && para.inputs["Orçamento"][`${m[1]}${nr}`] !== undefined) out[`Orçamento!${m[1]}${nr}`] = v;
    } else {
      const i = k.lastIndexOf("!"); if (para.inputs[k.slice(0, i)]?.[k.slice(i + 1)] !== undefined) out[k] = v;
    }
  }
  return out;
}
