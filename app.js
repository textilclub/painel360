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

// ---------- importar planilha preenchida (xlsx) ----------
// Lê só as células de entrada do modelo e devolve { regime, celulas, campos }.
export async function lerPlanilha(arquivo) {
  const zip = await window.JSZip.loadAsync(arquivo);
  const txt = async p => { const f = zip.file(p); return f ? f.async("string") : null; };
  const wb = await txt("xl/workbook.xml"), rels = await txt("xl/_rels/workbook.xml.rels");
  if (!wb || !rels) throw new Error("O arquivo não é uma planilha Excel (.xlsx) válida.");
  const dp = new DOMParser();
  const W = dp.parseFromString(wb, "application/xml"), Rr = dp.parseFromString(rels, "application/xml");
  const alvoRel = {}; [...Rr.getElementsByTagName("Relationship")].forEach(r => { let t = r.getAttribute("Target"); t = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, ""); alvoRel[r.getAttribute("Id")] = t; });
  const abas = {}; [...W.getElementsByTagName("sheet")].forEach(s => { const id = s.getAttribute("r:id") || s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id"); abas[s.getAttribute("name")] = alvoRel[id]; });
  const ssXml = await txt("xl/sharedStrings.xml");
  const SS = ssXml ? [...dp.parseFromString(ssXml, "application/xml").getElementsByTagName("si")].map(si => [...si.getElementsByTagName("t")].map(t => t.textContent).join("")) : [];
  const lerAba = async nome => {
    const p = abas[nome]; if (!p) return null; const x = await txt(p); if (!x) return null;
    const S = dp.parseFromString(x, "application/xml"), out = {}; let maxRow = 0;
    [...S.getElementsByTagName("c")].forEach(c => {
      const r = c.getAttribute("r"); if (!r) return; const row = +r.replace(/[A-Z]+/, ""); if (row > maxRow) maxRow = row;
      const t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0]?.textContent;
      let val = null;
      if (t === "s") val = v !== undefined ? SS[+v] : null;
      else if (t === "inlineStr") val = [...c.getElementsByTagName("t")].map(e => e.textContent).join("");
      else if (t === "str" || t === "e") val = v ?? null;
      else if (t === "b") val = v === "1";
      else if (v !== undefined && v !== "") val = parseFloat(v);
      out[r] = val;
    });
    return { out, maxRow };
  };
  const orc = await lerAba("Orçamento"), pv = await lerAba("Projeção de Vendas");
  if (!orc || !pv || !abas["Premissas"]) throw new Error("Esta planilha não é a planilha do Planejamento 2027 da imersão. Baixe a planilha pela plataforma, preencha e envie de novo.");
  const b7 = String(orc.out["B7"] || "").toUpperCase();
  const regime = b7.includes("SIMPLES") ? "simples" : b7.includes("PIS") ? "presumido" : null;
  if (!regime) throw new Error("Não foi possível identificar o regime (Simples ou Presumido) desta planilha.");
  if (pv.maxRow < 300) throw new Error("Esta é a versão antiga da planilha (poucos produtos). Baixe a planilha pela plataforma (100 produtos), preencha e envie de novo.");
  const M = await carregarModelo(regime), celulas = {}; let campos = 0;
  for (const [aba, refs] of Object.entries(M.inputs)) {
    const dados = aba === "Orçamento" ? orc : aba === "Projeção de Vendas" ? pv : await lerAba(aba);
    if (!dados) continue;
    for (const [ref, tipo] of Object.entries(refs)) {
      let v = dados.out[ref]; if (v === undefined || v === null || v === "") continue;
      if (tipo === "num" && typeof v !== "number") { const n = parse(v); if (n === null) continue; v = n; }
      if (tipo === "txt" && typeof v === "number") v = String(v);
      celulas[`${aba}!${ref}`] = v; campos++;
    }
  }
  return { regime, celulas, campos, modelo: M };
}
