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

// ---------- importar planilha preenchida (qualquer Excel: .xlsx, .xls, .xlsm, .xlsb, .ods ou .csv) ----------
let libXLSX = null;
const carregarXLSX = () => libXLSX || (libXLSX = new Promise((ok, erro) => {
  if (window.XLSX) return ok(window.XLSX);
  const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  sc.onload = () => ok(window.XLSX); sc.onerror = () => { libXLSX = null; erro(new Error("Não foi possível carregar o leitor de planilhas. Verifique a internet e tente de novo.")); };
  document.head.appendChild(sc);
}));
const semAcento = x => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

// CSV: detecta separador (; , ou tab) e respeita aspas
function lerCSV(txt) {
  txt = txt.replace(/^﻿/, "");
  const l1 = txt.split(/\r?\n/).find(l => l.trim()) || "", sep = [";", "\t", ","].map(c => [c, l1.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const linhas = []; let lin = [], cel = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else q = false; } else cel += ch; continue; }
    if (ch === '"') q = true; else if (ch === sep) { lin.push(cel); cel = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; lin.push(cel); linhas.push(lin); lin = []; cel = ""; }
    else cel += ch;
  }
  if (cel || lin.length) { lin.push(cel); linhas.push(lin); }
  return linhas;
}
const colLetra = n => { let s = ""; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - 1 - m) / 26 | 0; } return s; };
const gradeParaAba = linhas => { const out = {}; let maxRow = 0;
  linhas.forEach((l, r) => l.forEach((v, c) => { if (String(v).trim() === "") return; out[colLetra(c) + (r + 1)] = v; if (r + 1 > maxRow) maxRow = r + 1; })); return { out, maxRow }; };

// Lê as células de entrada do modelo e devolve { regime, celulas, campos, modelo, parcial, aviso }.
export async function lerPlanilha(arquivo, regimeAtual) {
  const nome = (arquivo.name || "").toLowerCase();
  let abas = {}, regime = null, parcial = false, aviso = "", formatoPlat = false;
  const ehCSV = /\.(csv|txt)$/.test(nome) || /csv|text\/plain/.test(arquivo.type || "");
  if (ehCSV) {
    const linhas = lerCSV(await arquivo.text());
    const cab = (linhas[0] || []).map(semAcento);
    const iAba = cab.indexOf("ABA"), iCel = cab.findIndex(c => c === "CELULA" || c === "CÉLULA"), iVal = cab.indexOf("VALOR");
    const rg = linhas.find(l => semAcento(l[0]) === "#REGIME"); if (rg) regime = /PRESUM/.test(semAcento(rg[1])) ? "presumido" : /SIMPLES/.test(semAcento(rg[1])) ? "simples" : null;
    if (iAba >= 0 && iCel >= 0 && iVal >= 0) {
      // formato da plataforma: Aba;Célula;Descrição;Valor
      linhas.slice(1).forEach(l => { const a = String(l[iAba] || "").trim(), c = String(l[iCel] || "").trim().toUpperCase(), v = l[iVal];
        if (!a || !c || a.startsWith("#") || v === undefined || String(v).trim() === "") return; (abas[a] = abas[a] || { out: {}, maxRow: 0 }).out[c] = v; });
      parcial = true; formatoPlat = true;
    } else {
      // uma aba da planilha salva como CSV: descobre qual pelo conteúdo
      const g = gradeParaAba(linhas), txt = Object.values(g.out).map(semAcento).join(" ");
      const qual = txt.includes("TOTAL PECAS") || txt.includes("CUSTO UNITARIO POR PRODUTO") ? "Projeção de Vendas" : txt.includes("PACOTE DRE") ? "Orçamento" : txt.includes("CAPACIDADE PRODUTIVA") ? "Premissas" : null;
      if (!qual) throw new Error("Não reconheci este CSV. Use o botão \"Baixar em CSV\" da plataforma, ou salve como CSV a aba Projeção de Vendas, Orçamento ou Premissas da planilha da imersão.");
      abas[qual] = g; parcial = true; aviso = `CSV da aba "${qual}": só essa parte do exercício será atualizada.`;
    }
  } else {
    const X = await carregarXLSX();
    let wb; try { wb = X.read(await arquivo.arrayBuffer(), { type: "array", cellFormula: false, cellHTML: false, cellText: false }); }
    catch (e) { throw new Error("Não consegui abrir este arquivo. Salve a planilha no Excel como .xlsx, .xls ou .csv e envie de novo."); }
    wb.SheetNames.forEach(n => { const ws = wb.Sheets[n], out = {}; let maxRow = 0;
      Object.keys(ws).forEach(ref => { if (ref[0] === "!") return; const c = ws[ref]; if (!c || c.v === undefined || c.v === null || c.v === "") return;
        out[ref.replace(/\$/g, "")] = c.t === "d" ? String(c.w || c.v) : c.v; const r = +ref.replace(/[A-Z$]+/, ""); if (r > maxRow) maxRow = r; });
      abas[n] = { out, maxRow }; });
    // nomes das abas podem vir sem acento em versões antigas do Excel
    const alvo = ["Premissas", "Projeção de Vendas", "Orçamento", "Fluxo de Caixa", "Orçado x Realizado"];
    Object.keys(abas).forEach(n => { const t = alvo.find(a => semAcento(a) === semAcento(n)); if (t && t !== n && !abas[t]) abas[t] = abas[n]; });
    if (!abas["Projeção de Vendas"] && !abas["Orçamento"] && !abas["Premissas"]) throw new Error("Esta planilha não é a planilha do Planejamento 2027 da imersão. Baixe a planilha pela plataforma, preencha e envie de novo.");
    if (!abas["Projeção de Vendas"] || !abas["Orçamento"] || !abas["Premissas"]) { parcial = true; aviso = "Algumas abas não foram encontradas: só as abas presentes serão atualizadas."; }
    const b7 = semAcento(abas["Orçamento"]?.out["B7"]);
    regime = b7.includes("SIMPLES") ? "simples" : b7.includes("PIS") ? "presumido" : null;
  }
  regime = regime || regimeAtual;
  if (!regime) throw new Error("Não foi possível identificar o regime (Simples ou Presumido). Escolha o regime na etapa 1 e envie de novo.");
  const M = await carregarModelo(regime);

  // versão antiga (menos produtos): reposiciona os blocos da Projeção de Vendas
  const pv = abas["Projeção de Vendas"];
  if (pv && !formatoPlat) {
    const achar = rotulo => { for (const [ref, v] of Object.entries(pv.out)) if (/^A\d+$/.test(ref) && semAcento(v).startsWith(rotulo)) return +ref.slice(1); return 0; };
    const tot = achar("TOTAL PECAS"), cu = achar("CUSTO UNITARIO POR PRODUTO");
    const nAnt = tot ? tot - 6 : M.N, c0Ant = cu ? cu + 1 : M.CUSTO0;
    if (tot && (nAnt !== M.N || c0Ant !== M.CUSTO0)) {
      const novo = {}, n = Math.min(nAnt, M.N);
      for (let i = 0; i < n; i++) {
        ["A", "B", "C", "D"].forEach(c => { const v = pv.out[`${c}${M.QTD0 + i}`]; if (v !== undefined) novo[`${c}${M.QTD0 + i}`] = v; });
        ["E", "F"].forEach(c => { const v = pv.out[`${c}${c0Ant + i}`]; if (v !== undefined) novo[`${c}${M.CUSTO0 + i}`] = v; });
      }
      abas["Projeção de Vendas"] = { out: novo, maxRow: M.CUSTO0 + M.N };
      aviso = (aviso ? aviso + " " : "") + `Planilha de uma versão anterior (${nAnt} produtos): os dados foram ajustados para a versão atual${nAnt > M.N ? ` (só os ${M.N} primeiros produtos)` : ""}.`;
    }
  }

  const celulas = {}; let campos = 0;
  for (const [aba, refs] of Object.entries(M.inputs)) {
    const dados = abas[aba]; if (!dados) continue;
    for (const [ref, tipo] of Object.entries(refs)) {
      let v = dados.out[ref]; if (v === undefined || v === null || v === "") continue;
      if (typeof v === "string" && /^(true|false|verdadeiro|falso)$/i.test(v.trim()) && tipo !== "txt") v = /^(true|verdadeiro)$/i.test(v.trim());
      if (tipo === "num" && typeof v !== "number") { const s2 = String(v).trim(); const pc = s2.endsWith("%"); const n = parse(s2); if (n === null) continue; v = pc ? n / 100 : n; }
      if (tipo === "txt" && typeof v === "number") v = String(v);
      celulas[`${aba}!${ref}`] = v; campos++;
    }
  }
  if (!campos) throw new Error("Não encontrei nenhum campo preenchido para importar neste arquivo.");
  return { regime, celulas, campos, modelo: M, parcial, aviso };
}

// Exporta todas as células de entrada em CSV (abre em qualquer Excel, LibreOffice ou Google Planilhas)
export function csvEntradas(M, celulas, regime) {
  const sheets = Object.fromEntries((M.sheets || []).map(s => [s.name, s.cells || {}]));
  const txtCel = (aba, ref) => { const c = sheets[aba]?.[ref]; const v = c && typeof c === "object" ? c.v : c; return typeof v === "string" && !v.startsWith("=") ? v.trim() : ""; };
  const desc = (aba, ref) => {
    const col = ref.replace(/\d+/g, ""), row = +ref.replace(/[A-Z]+/g, "");
    if (aba === "Premissas" && M.labels?.[ref]) return M.labels[ref];
    if (aba === "Projeção de Vendas") { const i = row >= M.CUSTO0 ? row - M.CUSTO0 : row - M.QTD0, nomeP = String(celulas[`Projeção de Vendas!B${M.QTD0 + i}`] ?? "").trim();
      const campo = { A: "Linha", B: "Produto", C: "Qtd base / mês", D: "Ticket base (R$)", E: "Custo unit. matéria-prima", F: txtCel(aba, "F" + (M.CUSTO0 - 1)) || "Outro custo unitário" }[col];
      return `Produto ${i + 1}${nomeP ? " (" + nomeP + ")" : ""} · ${campo}`; }
    const lin = ["A", "B"].map(c => txtCel(aba, c + row)).filter(Boolean).join(" · ");
    let cab = ""; for (let r = row - 1; r >= Math.max(1, row - 120) && !cab; r--) { const t = txtCel(aba, col + r); if (t && !/^\d/.test(t)) cab = t; }
    return [lin, cab].filter(Boolean).join(" · ");
  };
  const q = v => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const fmt = v => typeof v === "number" ? String(v).replace(".", ",") : typeof v === "boolean" ? (v ? "VERDADEIRO" : "FALSO") : v ?? "";
  const linhas = ["Aba;Célula;Descrição;Valor", `#regime;${regime === "presumido" ? "Lucro Presumido" : "Simples Nacional"};Não altere esta linha;`];
  for (const [aba, refs] of Object.entries(M.inputs)) for (const ref of Object.keys(refs)) {
    const k = `${aba}!${ref}`, v = celulas[k] !== undefined ? celulas[k] : M.padrao?.[k];
    linhas.push([aba, ref, desc(aba, ref), fmt(v)].map(q).join(";"));
  }
  return "﻿" + linhas.join("\r\n");
}
