// IA de consulta: conversa só sobre o que a empresa registrou na plataforma (não cria informação).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/+esm";
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3/+esm";
import { FER, DIAS_FER, registroTexto, migrar, notasTexto } from "./ferramentas-def.js";

const C = window.TC_CONFIG; const sb = createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const md = t => DOMPurify.sanitize(marked.parse(String(t || ""), { breaks: true }));
const ic = n => (window.IC ? IC(n) : "");
const t = x => String(x ?? "").trim();
const fmt = ts => ts ? new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
const brl = v => "R$ " + Math.round(Number(v) || 0).toLocaleString("pt-BR");

const AREAS = {
  visita: { nome: "Matriz da visita técnica (18/11)", la: "O que vi", areas: { fluxo: "Fluxo e layout da produção", "5s": "Organização e limpeza", pcp: "Planejamento e controle da produção", visual: "Gestão visual e indicadores", qualidade: "Qualidade", pessoas: "Pessoas e liderança", maquinas: "Máquinas e tecnologia", estoque: "Estoque e expedição" } },
  dia1: { nome: "Matriz do 1º dia (19/11)", la: "O que aprendi", areas: { raiox: "Raio-X da confecção", producao: "Produção e processos", equip: "Equipamentos e produtividade", caseop: "Case: operação", vendas: "Vendas e gestão comercial", ia: "Inteligência artificial no comercial", marca: "Marca e produto", caseint: "Case: integrado" } },
  dia2: { nome: "Matriz do 2º dia (20/11)", la: "O que aprendi", areas: { lider: "Liderança e pessoas", plano: "Planejamento estratégico", fin: "Gestão e financeiro", swot: "Forças, fraquezas e escolhas", dados: "Sistemas e dados", orc: "Orçamentos 2027", kpi: "Objetivos, indicadores e projetos", iagestao: "IA na gestão" } },
};
const NIV = ["não faço", "faço pouco", "faço parecido", "igual ou melhor"];

const { data: { session } } = await sb.auth.getSession();
if (session) {
  const { data: eu } = await sb.from("participantes").select("id,nome,status,empresa_id,empresas(nome)").eq("id", session.user.id).maybeSingle();
  if (eu && eu.status === "aprovado" && eu.empresa_id) iniciar(eu);
}

function iniciar(eu) {
  const st = document.createElement("style");
  st.textContent = `
  .cq-fab{position:fixed;right:18px;bottom:18px;z-index:80;display:flex;align-items:center;gap:8px;min-height:56px;padding:0 18px 0 14px;border-radius:999px;border:0;background:#0b0b0a;color:#fff;font:600 15px var(--f-body);box-shadow:0 10px 30px rgba(0,0,0,.28),0 0 0 3px var(--gold);cursor:pointer}
  .cq-fab .ico{width:30px;height:30px;border-radius:50%;background:var(--gold);color:#0b0b0a;display:grid;place-items:center}
  .cq-fab .ico svg{width:18px;height:18px}
  @media (max-width:560px){.cq-fab span.tx{display:none}.cq-fab{padding:0;width:58px;justify-content:center}}
  .cq{position:fixed;right:18px;bottom:86px;z-index:81;width:min(420px,calc(100vw - 24px));height:min(620px,calc(100vh - 120px));background:var(--surface);border:1.5px solid #0b0b0a;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden}
  @media (max-width:560px){.cq{right:12px;bottom:82px}}
  .cq[hidden]{display:none}
  .cq-h{background:#0b0b0a;color:#fff;padding:14px 16px;display:flex;gap:10px;align-items:center}
  .cq-h b{display:block;font:700 15.5px var(--f-display)}.cq-h small{color:var(--gold-hi);font-size:12.5px}
  .cq-h button{margin-left:auto;width:38px;height:38px;border-radius:10px;border:1px solid #333;background:transparent;color:#fff;display:grid;place-items:center;cursor:pointer}
  .cq-b{flex:1;overflow:auto;padding:14px;display:grid;gap:10px;align-content:start;background:var(--paper)}
  .cq-m{border-radius:12px;padding:10px 12px;font-size:14.5px;line-height:1.5;max-width:92%}
  .cq-m.ai{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--gold)}
  .cq-m.eu{background:#0b0b0a;color:#f4efe4;justify-self:end;white-space:pre-wrap}
  .cq-m.ai p{margin:4px 0}.cq-m.ai ul,.cq-m.ai ol{margin:4px 0 4px 18px}.cq-m.ai table{border-collapse:collapse;font-size:13px}.cq-m.ai td,.cq-m.ai th{border:1px solid var(--line);padding:4px 6px}
  .cq-sug{display:flex;flex-wrap:wrap;gap:6px}.cq-sug button{border:1px dashed var(--line-2);background:var(--surface);border-radius:999px;padding:7px 11px;font:600 13px var(--f-body);color:var(--ink-2);cursor:pointer}
  .cq-f{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px;border-top:1px solid var(--line);background:var(--surface)}
  .cq-f textarea{min-height:46px;max-height:120px;resize:none;font-size:15px}
  .cq-f button{min-width:52px;border-radius:10px;border:0;background:var(--gold);color:#0b0b0a;font-weight:700;cursor:pointer}
  .cq-aviso{background:var(--warn-bg);border:1px solid var(--warn-line);color:var(--warn);border-radius:10px;padding:10px 12px;font-size:13.5px}
  .cq-limpar{border:0;background:none;color:var(--muted);font:600 12.5px var(--f-body);text-decoration:underline;cursor:pointer;justify-self:center}`;
  document.head.appendChild(st);
  document.body.insertAdjacentHTML("beforeend", `
    <button class="cq-fab" type="button" id="cqFab" aria-label="Abrir a IA de consulta"><span class="ico">${ic("spark")}</span><span class="tx">Consultar anotações</span></button>
    <section class="cq" id="cq" hidden aria-label="IA de consulta">
      <div class="cq-h"><div><b>Consulta da empresa</b><small>Responde só com o que ${esc(eu.empresas?.nome || "a empresa")} registrou</small></div><button type="button" id="cqX" aria-label="Fechar">${ic("x")}</button></div>
      <div class="cq-b" id="cqB"></div>
      <form class="cq-f" id="cqF"><textarea id="cqT" placeholder="Pergunte sobre o que foi anotado…" rows="1"></textarea><button type="submit" aria-label="Enviar">${ic("arrow")}</button></form>
    </section>`);
  const CH = `tc_consulta_${eu.id}`;
  let conv = []; try { conv = JSON.parse(sessionStorage.getItem(CH) || "[]"); } catch {}
  let ocupado = false, aviso = "", contexto = null;
  const guardar = () => { try { sessionStorage.setItem(CH, JSON.stringify(conv.slice(-30))); } catch {} };
  const SUG = ["O que eu anotei na visita técnica?", "Quais são as 3 ações que eu me comprometi?", "O que a empresa registrou sobre vendas?", "Qual é o faturamento projetado no Plano Anual?", "O que a Têxtil Club comentou?"];

  function render() {
    const b = document.getElementById("cqB");
    b.innerHTML = (conv.length ? "" : `<div class="cq-m ai">Olá, ${esc(eu.nome.split(" ")[0])}! Eu consulto tudo o que a sua empresa registrou na imersão: matrizes, ferramentas, Plano Anual, anotações dos sócios e observações da Têxtil Club. Não invento nada: se não estiver registrado, eu aviso.</div><div class="cq-sug">${SUG.map(s => `<button type="button">${esc(s)}</button>`).join("")}</div>`)
      + conv.map(m => m.r === "ai" ? `<div class="cq-m ai">${md(m.t)}</div>` : `<div class="cq-m eu">${esc(m.t)}</div>`).join("")
      + (ocupado ? `<div class="cq-m ai" style="color:var(--muted)">Consultando os registros…</div>` : "")
      + (aviso ? `<div class="cq-aviso">${aviso}</div>` : "")
      + (conv.length && !ocupado ? `<button type="button" class="cq-limpar" id="cqLimpar">Começar nova conversa</button>` : "");
    b.querySelectorAll(".cq-sug button").forEach(x => x.onclick = () => perguntar(x.textContent));
    const l = document.getElementById("cqLimpar"); if (l) l.onclick = () => { conv = []; aviso = ""; guardar(); render(); };
    b.scrollTop = b.scrollHeight;
  }
  async function perguntar(q) {
    q = t(q); if (!q || ocupado) return;
    conv.push({ r: "eu", t: q }); ocupado = true; aviso = ""; render();
    try {
      if (!contexto) contexto = await montarContexto(eu);
      const { data, error } = await sb.functions.invoke("agente-360", { body: { modulo: "consulta", dados: contexto, historico: conv } });
      let res = data; if (error) { try { res = await error.context.json(); } catch { res = { erro: "rede" }; } }
      if (res?.texto) conv.push({ r: "ai", t: res.texto });
      else { conv.pop(); aviso = res?.erro === "sem_chave" ? "A IA ainda não foi ativada." : "Não foi possível consultar agora. Tente de novo."; }
    } catch { conv.pop(); aviso = "Não foi possível consultar agora. Verifique a internet."; }
    ocupado = false; guardar(); render();
  }
  document.getElementById("cqFab").onclick = () => { const p = document.getElementById("cq"); p.hidden = !p.hidden; if (!p.hidden) { contexto = null; render(); document.getElementById("cqT").focus(); } };
  document.getElementById("cqX").onclick = () => { document.getElementById("cq").hidden = true; };
  document.getElementById("cqF").onsubmit = e => { e.preventDefault(); const ta = document.getElementById("cqT"); const q = ta.value; ta.value = ""; perguntar(q); };
  document.getElementById("cqT").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); document.getElementById("cqF").requestSubmit(); } });
}

// ---------- monta o texto com tudo o que a empresa registrou ----------
async function montarContexto(eu) {
  const emp = eu.empresa_id;
  const [{ data: parts }, { data: ats }, { data: ex }, { data: obs }] = await Promise.all([
    sb.from("participantes").select("id,nome,cargo,status").eq("empresa_id", emp),
    sb.from("atividades").select("participante_id,tipo,dados,status,atualizado_em").eq("empresa_id", emp),
    sb.from("exercicios").select("regime,resumo,status,atualizado_em,atualizado_por_nome,dados").eq("empresa_id", emp).maybeSingle(),
    sb.from("observacoes").select("alvo,texto,autor,criado_em,participante_id").eq("empresa_id", emp).order("criado_em"),
  ]);
  const nomeP = id => (parts || []).find(p => p.id === id)?.nome || "Participante";
  const L = [];
  L.push(`EMPRESA: ${eu.empresas?.nome || ""}`);
  L.push(`QUEM PERGUNTA: ${eu.nome}`);
  L.push(`PARTICIPANTES DA EMPRESA: ${(parts || []).filter(p => p.status === "aprovado").map(p => p.nome + (p.cargo ? ` (${p.cargo})` : "")).join("; ")}`);

  // Plano Anual
  if (ex) {
    const r = ex.resumo || {};
    L.push(`\n=== PLANO ANUAL 2027 (planilha de planejamento; números são PROJEÇÃO) ===`);
    L.push(`Regime: ${ex.regime === "presumido" ? "Lucro Presumido" : ex.regime === "simples" ? "Simples Nacional" : "não escolhido"} · Situação: ${ex.status === "concluido" ? "concluído" : "em preenchimento"}${ex.atualizado_por_nome ? ` · última atualização por ${ex.atualizado_por_nome} em ${fmt(ex.atualizado_em)}` : ""}`);
    if (r.receita !== undefined) L.push(`Faturamento projetado 2027: ${brl(r.receita)} · Resultado líquido projetado: ${brl(r.resultado)} · Margem: ${((r.margem || 0) * 100).toFixed(1).replace(".", ",")}% · Ponto de equilíbrio: ${brl(r.pe)} · Menor saldo de caixa no ano: ${brl(r.menorSaldo)}`);
    const cel = ex.dados?.celulas || {}, prods = [];
    for (let i = 6; i <= 105; i++) { const pr = t(cel[`Projeção de Vendas!B${i}`]), li = t(cel[`Projeção de Vendas!A${i}`]); if (pr || li) prods.push(`${pr || "(sem nome)"}${li ? " (linha " + li + ")" : ""}${cel[`Projeção de Vendas!C${i}`] ? ` · qtd base/mês ${cel[`Projeção de Vendas!C${i}`]}` : ""}${cel[`Projeção de Vendas!D${i}`] ? ` · ticket base R$ ${cel[`Projeção de Vendas!D${i}`]}` : ""}`); }
    if (prods.length) L.push(`Produtos cadastrados (${prods.length}): ${prods.slice(0, 60).join("; ")}`);
  } else L.push(`\n=== PLANO ANUAL 2027 ===\nAinda não preenchido.`);

  // Matrizes e card
  for (const [tipo, cfg] of Object.entries(AREAS)) {
    const regs = (ats || []).filter(a => a.tipo === tipo); if (!regs.length) continue;
    L.push(`\n=== ${cfg.nome.toUpperCase()} ===`);
    regs.forEach(a => {
      const d = a.dados || {}, nome = nomeP(a.participante_id);
      L.push(`-- Preenchida por ${nome}${d.compromisso ? " (compromisso assumido)" : ""} · atualizado em ${fmt(a.atualizado_em)}`);
      for (const [k, titulo] of Object.entries(cfg.areas)) {
        const v = d.areas?.[k]; if (!v) continue;
        const notas = Array.isArray(v.notas) && v.notas.length ? v.notas : [{ vi: v.vi, eu: v.eu }];
        const ns = notas.filter(n => t(n.vi) || t(n.eu)).map(n => `   • ${cfg.la}: "${t(n.vi) || "—"}" | Na empresa: "${t(n.eu) || "—"}"${n.por ? ` (por ${n.por}${n.ts ? ", " + fmt(n.ts) : ""})` : ""}`);
        if (!ns.length && v.nivel == null) continue;
        L.push(` ${titulo}${v.nivel != null ? ` — comparação: ${NIV[v.nivel]}` : ""}${v.foco ? " — marcou que quer agir" : ""}`); ns.forEach(x => L.push(x));
      }
      const f = (d.fortes || []).filter(t), o = (d.oport || []).filter(t), ac = (d.acoes || []).filter(x => t(x.o));
      if (f.length) L.push(` Pontos fortes/aprendizados: ${f.join("; ")}`);
      if (o.length) L.push(` Lacunas: ${o.join("; ")}`);
      if (ac.length) L.push(` Ações escolhidas: ${ac.map((x, i) => `${i + 1}) ${t(x.o)}${x.q ? " · responsável " + t(x.q) : ""}${x.p ? " · prazo " + x.p : ""}`).join("; ")}`);
      const ia = (d.ia_chat || []).filter(m => m.r === "ai").pop(); if (ia) L.push(` Última análise da IA (PRODUÇÃO 360 da visita) — é sugestão, não decisão: ${t(ia.t).slice(0, 1500)}`);
    });
  }

  // Ferramentas
  for (const [dia, cfgD] of Object.entries(DIAS_FER)) {
    const regs = (ats || []).filter(a => a.tipo === (dia === "dia2" ? "fer_dia2" : "fer_dia1")); if (!regs.length) continue;
    L.push(`\n=== FERRAMENTAS 360° — ${cfgD.nome.toUpperCase()} (${cfgD.data}) ===`);
    for (const k of cfgD.ordem) {
      const F = FER[k], blocos = [];
      regs.forEach(a => {
        const d = a.dados?.[k]; if (!d) return; migrar(k, d, nomeP(a.participante_id));
        const notas = F.grupos.map((g, gi) => { const tx = notasTexto(F, gi, d.g[gi], { autor: true, pularVazio: true }); return tx ? `${g.t}:\n${tx}` : ""; }).filter(Boolean).join("\n");
        const out = registroTexto(k, d), ia = (d.chat || []).filter(m => m.r === "ai").pop();
        if (!notas && !out && !ia) return;
        blocos.push(`-- ${nomeP(a.participante_id)}${d.ok ? " (concluiu)" : ""}\n${notas ? "Dados anotados:\n" + notas + "\n" : ""}${out ? "Registro de saída (decisões do empresário):\n" + out + "\n" : ""}${ia ? "Última análise da IA (sugestão, não decisão): " + t(ia.t).slice(0, 1200) : ""}`);
      });
      if (blocos.length) L.push(`\n# ${F.nome}\n${blocos.join("\n")}`);
    }
  }

  // Calculadora de vendas (CAC, comissão e OTE)
  const cv = (ats || []).filter(a => a.tipo === "calc_vendas" && a.dados?.res);
  if (cv.length) {
    L.push(`\n=== CALCULADORA "QUANTO CUSTA CADA VENDA?" (CAC, COMISSÃO E OTE) ===`);
    const R = v => "R$ " + Math.round(v || 0).toLocaleString("pt-BR");
    cv.forEach(a => { const r = a.dados.res;
      L.push(`-- ${nomeP(a.participante_id)}${a.dados.concluido ? " (concluiu)" : ""}\nCusto fixo do comercial ${R(r.custoFixoMes)}/mês · cadeira ${R(r.cadeira)}/mês por vendedor · ${r.vendedores} vendedores · marketing ${R(r.mktMes)}/mês\nCAC ${R(r.cac)} · custo por lead ${R(r.cpl)} · conversão ${(r.conv || 0).toFixed(1)}% · desperdício ${R(r.desperdicioMes)}/mês\nMargem por venda ${R(r.margemVenda)} · sobra antes da comissão ${R(r.sobraAntesComissaoMes)}/mês\nEmpresa fica no ano: modelo A ${R(r.empresaFicaAno?.A)} · B ${R(r.empresaFicaAno?.B)} · C ${R(r.empresaFicaAno?.C)}\nOTE ${R(r.ote)} (fixo ${R(r.fixoOte)} + variável ${R(r.varAlvo)}) · meta ${r.metaVendedor} vendas/mês · gatilho ${r.gatilho} · acelerador ${r.acelerador}× · teto ${r.teto ? r.teto + "%" : "sem teto"}\nBônus comportamental máximo ${R(r.bonusMaxMes)}/mês: ${(r.bonusItens || []).join(" | ")}\nChecklist trabalhista: ${r.checklistOk} de ${r.checklistTotal}`); });
  }

  // Observações
  if ((obs || []).length) {
    L.push(`\n=== OBSERVAÇÕES DA TÊXTIL CLUB ===`);
    obs.forEach(o => L.push(`- ${fmt(o.criado_em)} · ${o.autor || "Têxtil Club"} · sobre ${rotAlvo(o.alvo)}${o.participante_id ? ` · para ${nomeP(o.participante_id)}` : ""}: ${t(o.texto)}`));
  }
  return L.join("\n").slice(0, 90000);
}
function rotAlvo(a) {
  if (!a || a === "geral") return "a empresa (geral)";
  if (a === "plano") return "o Plano Anual";
  if (AREAS[a]) return AREAS[a].nome;
  if (a.startsWith("fer:")) return FER[a.slice(4)]?.nome || a;
  return a;
}
