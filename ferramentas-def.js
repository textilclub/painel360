// Definição das ferramentas 360° (entradas, contas automáticas e registro de saída). Os prompts ficam na Edge Function agente-360.
const PILARES = [["producao","Produção"],["vendas","Vendas"],["marca","Marca/Produto"],["fin","Gestão/Financeiro"],["pessoas","Liderança/Pessoas"],["estrat","Estratégia"]];
const NOTAS = ["", ...[...Array(11).keys()].map(String), "P"];
const NOTA_L = { "": "Sem nota", 0: "0 · Crítico", 1: "1 · Crítico", 2: "2 · Crítico", 3: "3 · Frágil", 4: "4 · Frágil", 5: "5 · Parcial", 6: "6 · Parcial", 7: "7 · Consistente", 8: "8 · Consistente", 9: "9 · Sólido", 10: "10 · Sólido", P: "Dado pendente" };
const STATUS = ["", "Confirmada", "Hipótese", "Informação pendente"];
const ANALISE = ["", "Em análise", "Confirmada"];
const GRAV = ["", "Alta", "Média", "Baixa"];
const SNN = ["", "Sim", "Não", "Não sei"];
const ALAV = ["", "Novos clientes", "Recorrência", "Ticket médio", "Canais de venda"];
const A = (k, l, ph, f = true) => ({ k, l, tipo: "area", ph, f });
const T = (k, l, ph, f = true) => ({ k, l, tipo: "text", ph, f });
const N = (k, l, ph, f = true) => ({ k, l, tipo: "text", ph, f, num: true });
const S = (k, l, op, opl) => ({ k, l, tipo: "sel", op, opl });
const C = (k, l, op) => ({ k, l, tipo: "chk", op });

// Legenda única (mesma linguagem em todas as ferramentas)
export const LEG = { R: ["Dado real", "Informação apurada, com fonte e período conhecidos"], H: ["Hipótese", "Premissa ou estimativa que ainda precisa ser validada"], P: ["Dado pendente", "Informação que ainda precisa ser levantada"] };

// ---------- números ----------
// Valor numérico flexível (aceita "40.000", "39,90", "R$ 39")
export const numero = s => { const t = String(s || "").replace(/[^\d,.-]/g, ""); if (!t) return NaN; const n = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : (t.split(".").length > 2 ? t.replace(/\./g, "") : (/\.\d{3}$/.test(t) ? t.replace(".", "") : t)); return parseFloat(n); };
// Valor em reais: entende "R$ 2,9 mi", "R$ 120 mil", "4.500.000"
export const moeda = s => { const x = String(s || "").toLowerCase(); const m = x.match(/-?\d[\d.,]*/); if (!m) return NaN; let v = numero(m[0]); const resto = x.slice(m.index + m[0].length, m.index + m[0].length + 12);
  if (/^\s*(mi\b|mi\.|milh|mm\b)/.test(resto)) v *= 1e6; else if (/^\s*(mil\b|k\b)/.test(resto)) v *= 1e3; return v; };
export const brl = v => "R$ " + Math.round(v || 0).toLocaleString("pt-BR");
const pctf = v => (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
const nf = v => Math.round(v).toLocaleString("pt-BR");
const ok = x => Number.isFinite(x);
const temChk = (v, op) => String(v || "").split(";").map(s => s.trim()).includes(op);
const chks = v => String(v || "").split(";").map(s => s.trim()).filter(Boolean);

// Gráfico radar (notas 0–10). itens: [{l, n}] — n NaN = sem nota/pendente
export function radarSVG(itens, tam = 260) {
  const c = tam / 2, r = tam / 2 - 46, n = itens.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i, v) => [c + Math.cos(ang(i)) * r * v / 10, c + Math.sin(ang(i)) * r * v / 10];
  const aneis = [2, 4, 6, 8, 10].map(v => `<polygon points="${itens.map((_, i) => pt(i, v).join(",")).join(" ")}" fill="none" stroke="#D9D0BC" stroke-width="1"/>`).join("");
  const eixos = itens.map((_, i) => `<line x1="${c}" y1="${c}" x2="${pt(i, 10)[0]}" y2="${pt(i, 10)[1]}" stroke="#D9D0BC"/>`).join("");
  const poli = itens.map((it, i) => pt(i, ok(it.n) ? it.n : 0).join(",")).join(" ");
  const rot = itens.map((it, i) => { const [x, y] = pt(i, 12.6); const a = Math.cos(ang(i)); return `<text x="${x}" y="${y}" text-anchor="${a > .3 ? "start" : a < -.3 ? "end" : "middle"}" dominant-baseline="middle" font-size="11" font-weight="600" fill="#2b2a26">${it.l}<tspan x="${x}" dy="13" font-weight="700" fill="${ok(it.n) ? "#76560B" : "#B42318"}">${ok(it.n) ? it.n : "pendente"}</tspan></text>`; }).join("");
  return `<svg viewBox="0 0 ${tam} ${tam}" width="100%" style="max-width:${tam + 60}px;overflow:visible" role="img" aria-label="Radar das notas">${aneis}${eixos}<polygon points="${poli}" fill="rgba(184,145,47,.28)" stroke="#B8912F" stroke-width="2"/>${itens.map((it, i) => ok(it.n) ? `<circle cx="${pt(i, it.n)[0]}" cy="${pt(i, it.n)[1]}" r="3.5" fill="#0b0b0a"/>` : "").join("")}${rot}</svg>`;
}

// Contas do FINANCEIRO 360 (também usadas em outras ferramentas)
function contasFin(x) {
  const rb = x.m("rb"), ded = x.m("ded"), cv = x.m("cv"), dv = x.m("dv"), gf = x.m("gf");
  const rl = rb - (ok(ded) ? ded : 0), mc = rl - (ok(cv) ? cv : 0) - (ok(dv) ? dv : 0);
  const mcp = ok(rb) && rb > 0 && (ok(cv) || ok(dv)) ? mc / rb : NaN, ro = ok(gf) ? mc - gf : NaN, pe = ok(gf) && mcp > 0 ? gf / mcp : NaN;
  const gf27 = x.m("gf27"), res27 = x.m("res27"); let mc27 = x.n("mc27"); const mc27h = !ok(mc27) && ok(mcp); if (mc27h) mc27 = mcp * 100;
  const fatN = ok(gf27) && ok(res27) && mc27 > 0 ? (gf27 + res27) / (mc27 / 100) : NaN;
  return { rb, ded, cv, dv, gf, rl, mc, mcp, ro, pe, gf27, res27, mc27, mc27h, fatN };
}
// Total do orçamento comercial (ORÇAMENTO 2027)
function totalOrc(d) { const o = d?.out || {}; let t = 0; for (let i = 0; i < 5; i++) { const q = numero(o[`l${i}_q`]), p = numero(o[`l${i}_pr`]); if (q > 0 && p > 0) t += q * p; } return t; }

export const FER = {
  // ======================= QUINTA 19/11 =======================
  iniciar: { dia: "dia1", nome: "INICIAR 360", curto: "Visão 2027", quando: "Sua Confecção em 2027 começa agora",
    obj: "Construir ficha inicial da empresa e lista de dados prioritários", saida: "Ficha de contexto + visão 2027 + cinco números + lacunas classificadas",
    grupos: [
      { t: "A empresa hoje", dois: true, campos: [T("segmento", "Segmento", "Ex.: uniformes corporativos, moda, facção, esportivo"), T("produtos", "Principais produtos/linhas", "Ex.: uniformes, camisetas, fitness"),
        T("fat", "Faturamento 2025 / 2026", "Ex.: 2025 R$ 2,9 mi; 2026 até out R$ 2,6 mi"), T("operacao", "Operação", "Ex.: costura própria + 2 facções; 1 turno"), T("equipe", "Equipe", "Ex.: 32 funcionários, 3 líderes")] },
      { t: "Sua confecção cresceu. Mas virou uma empresa melhor?", unico: true, ajuda: "Crescer não basta: faturar, produzir e contratar mais não é o mesmo que gerar resultado, ganhar eficiência e desenvolver autonomia.",
        campos: [C("cresceu", "Nos últimos anos, a empresa cresceu em…", ["Mais pedidos", "Mais funcionários", "Mais problemas", "Mais dependência do dono"]),
          C("melhor", "…e ficou melhor em…", ["Mais resultado (lucro)", "Mais eficiência", "Mais autonomia da equipe", "Nada disso ainda"])] },
      { t: "O destino de 2027", campos: [A("visao", "Que empresa você quer estar administrando em 31/12/2027?", "Pense em resultado, organização, clientes, liderança e no seu próprio papel como dono.")] },
      { t: "Cinco números do ano (preliminares)", unico: true, dois: true, campos: [1, 2, 3, 4, 5].map(n => T("n" + n, "Indicador-alvo " + n, n === 1 ? "Ex.: faturamento R$ 3,8 mi" : n === 2 ? "Ex.: margem líquida 12%" : n === 3 ? "Ex.: 95% de entregas no prazo" : "")) },
      { t: "O que o destino exige", campos: [A("deixar", "O que precisa deixar de acontecer na sua empresa?", ""), A("construir", "Qual capacidade precisa ser construída?", ""), A("liderar", "O que precisa mudar na sua forma de liderar?", "")] },
      { t: "Lacunas", campos: [A("lacunas", "O que ainda precisa descobrir ou validar?", "Ex.: margem por produto; capacidade real da costura")] } ],
    calc: x => {
      const L = [], cr = chks(x.v("cresceu")), me = chks(x.v("melhor")).filter(s => s !== "Nada disso ainda");
      if (cr.length) L.push({ l: "Cresceu em", v: cr.join(", "), st: "info" });
      if ((temChk(x.v("cresceu"), "Mais problemas") || temChk(x.v("cresceu"), "Mais dependência do dono")) && !me.length) L.push({ l: "Atenção", v: "A empresa cresceu, mas ainda não virou uma empresa melhor. A visão 2027 precisa atacar isso.", st: "warn" });
      const sit = [0, 1, 2, 3, 4].map(i => x.o[`num${i}_f`]).filter(Boolean);
      if (sit.length) L.push({ l: "Cinco números", v: ["Dado real", "Hipótese", "Dado pendente"].map(s => `${sit.filter(y => y === s).length} ${s.toLowerCase()}`).join(" · "), st: sit.includes("Dado pendente") ? "warn" : "ok" });
      return L; },
    out: [
      { b: "visao", tipo: "campo", l: "Visão de futuro (31/12/2027)", ph: "", obr: true },
      { b: "num", tipo: "linhas", t: "Cinco números do ano", n: 5, obr: 3, cols: [{ k: "v", l: "Indicador e meta", ph: "" }, { k: "f", l: "Situação", tipo: "sel", op: ["", "Dado real", "Hipótese", "Dado pendente"] }] },
      { b: "lac", tipo: "linhas", t: "Cinco informações mais críticas a levantar", n: 5, obr: 2, cols: [{ k: "l", l: "Informação", ph: "" }, { k: "como", l: "Como / onde levantar", ph: "Documento, sistema, pessoa" }] } ] },

  diag: { dia: "dia1", nome: "DIAGNÓSTICO 360", curto: "Diagnóstico", quando: "Raio-X Confecção 360°",
    obj: "Mapear maturidade e gargalo principal dos seis pilares", saida: "Quadro de seis pilares + um gargalo por pilar + gargalo mais crítico + pendências",
    usa: ["iniciar"],
    grupos: PILARES.map(([k, t]) => ({ t, campos: [
      A(`${k}_ev`, "Evidência concreta", "Fato, número ou situação real. Ex.: atrasamos 3 de cada 10 pedidos"),
      A(`${k}_sint`, "Sintoma → causa provável", "O que aparece e o que você acha que causa (hipótese até ser comprovada)"),
      T(`${k}_ind`, "Indicador que você já acompanha", "Ex.: peças/dia, ticket médio, margem… ou 'nenhum'"),
      S(`${k}_nota`, "Sua nota (0 a 10)", NOTAS, NOTA_L) ] })),
    calc: x => {
      const L = [], vis = x.oo("iniciar").visao || x.vo("iniciar", "visao");
      if (vis) L.push({ l: "2027 · Onde quero chegar (INICIAR 360)", v: vis, st: "info" });
      const it = PILARES.map(([k, t], i) => { const nv = x.o[`pil${i}_nota`] || x.v(`${k}_nota`); return { k, l: t, nv, n: nv === "" || nv === "P" ? NaN : +nv }; });
      if (it.some(i => i.nv !== "")) L.push({ l: "2026 · Onde estou hoje", svg: radarSVG(it.map(i => ({ l: i.l, n: i.n }))) });
      const sem = it.filter(i => ok(i.n) && !x.v(`${i.k}_ev`)).map(i => i.l);
      if (sem.length) L.push({ l: "Nota sem evidência", v: `${sem.join(", ")}: sem evidência, a nota é apenas uma percepção.`, st: "warn" });
      const pend = it.filter(i => i.nv === "P").map(i => i.l);
      if (pend.length) L.push({ l: "Dado pendente (não é nota zero)", v: pend.join(", "), st: "warn" });
      const cand = [0, 1, 2].map(i => ({ g: x.o[`filtro${i}_g`], s: ["q1", "q2", "q3"].filter(q => x.o[`filtro${i}_${q}`] === "Sim").length })).filter(c => c.g);
      if (cand.length) { const m = Math.max(...cand.map(c => c.s)); const melhores = cand.filter(c => c.s === m);
        L.push({ l: "Sugestão de gargalo mais crítico", v: m ? `${melhores.map(c => c.g).join(" / ")} (${m} de 3 perguntas com "Sim"). A escolha final é sua.` : "Nenhum candidato marcou 'Sim' nas três perguntas ainda.", st: m ? "ok" : "info" }); }
      return L; },
    out: [
      { b: "pil", tipo: "linhas", t: "Quadro dos seis pilares", rot: PILARES.map(p => p[1]), obr: 6,
        cols: [{ k: "garg", l: "Gargalo principal", ph: "O principal gargalo deste pilar" }, { k: "nota", l: "Nota final", tipo: "sel", op: NOTAS, opl: NOTA_L }] },
      { b: "filtro", tipo: "linhas", t: "Se você pudesse resolver um gargalo primeiro, qual seria? (até 3 candidatos)", n: 3, obr: 0,
        cols: [{ k: "g", l: "Gargalo candidato", ph: "" }, { k: "q1", l: "Mais compromete o resultado?", tipo: "sel", op: SNN }, { k: "q2", l: "Afeta outros pilares?", tipo: "sel", op: SNN }, { k: "q3", l: "Exige decisão do dono?", tipo: "sel", op: SNN }] },
      { b: "crit", tipo: "linhas", t: "Gargalo mais crítico: da descoberta à decisão", rot: ["Problema identificado"], obr: 1,
        cols: [{ k: "p", l: "Problema", ph: "Mais compromete o resultado, afeta outros pilares e exige decisão do dono" }, { k: "ev", l: "Evidência concreta", ph: "" }, { k: "c", l: "Causa provável a validar", ph: "Hipótese até ser comprovada" }, { k: "i", l: "Impacto no negócio", ph: "" }, { k: "d", l: "Decisão necessária", ph: "Não precisa ser concluída agora" }] },
      { b: "pend", tipo: "campo", l: "Dados pendentes (sem informação não é nota zero: registre aqui)", ph: "Ex.: margem por produto; capacidade real da costura" } ] },

  prod: { dia: "dia1", nome: "PRODUÇÃO 360", curto: "Produção", quando: "Produção e Processos",
    obj: "Diagnosticar fluxo produtivo e gargalos que limitam entrega, qualidade e margem", saida: "Mapa de gargalos (3) + uma ação rápida + uma ação estrutural", visita: true,
    usa: ["diag", "vendas"],
    grupos: [
      { t: "Fluxo", campos: [A("etapas", "Etapas do processo", "Pedido → ficha técnica → materiais → corte → personalização → costura → qualidade → expedição"), A("tempos", "Tempos de cada etapa", "Ex.: corte 1 dia; costura 5 dias; acabamento 2 dias"),
        T("previs", "Onde o pedido perde previsibilidade?", "Ex.: na espera por tecido; na facção")] },
      { t: "Carga × capacidade", dois: true, ajuda: "Capacidade não é quanto você gostaria de produzir: é quanto a operação entrega nas condições reais. Preencha os números da etapa gargalo e a ferramenta faz a conta.",
        campos: [T("gargalo", "Etapa que limita o ritmo (gargalo)", "Ex.: costura de malha"), N("demanda", "Quantidade planejada (peças/mês)", "Ex.: 9000"), T("producao", "Produção real hoje (peças/mês)", "Ex.: 7500"),
          N("tpad", "Tempo por peça na etapa gargalo (minutos)", "Ex.: 14"), N("postos", "Pessoas ou postos na etapa gargalo", "Ex.: 12"), N("hmes", "Horas disponíveis por pessoa no mês", "Ex.: 176"), N("efic", "Eficiência real (%)", "Ex.: 70"),
          T("capacidade", "Observação sobre a capacidade", "Ex.: 1 turno; 2 máquinas paradas")] },
      { t: "Os 4 números da produção", dois: true, campos: [T("otd", "Entregas no prazo", "Ex.: 7 de cada 10 pedidos"), T("prog", "Cumprimento da programação", "Ex.: cumprimos 60% do programado na semana"),
        T("produt", "Produtividade", "Ex.: 420 peças/dia; minutos por peça"), T("retrabalho", "Taxa de retrabalho", "Ex.: 5% das peças voltam"),
        C("confia", "Quais você acompanha com dados confiáveis?", ["Entregas no prazo", "Cumprimento da programação", "Produtividade", "Taxa de retrabalho"])] },
      { t: "Planejamento e padrão", campos: [A("ppcp", "PPCP: quem decide o quê, quanto, quando, onde e com quem?", "Ex.: planilha semanal; prioridade definida pelo dono no dia"),
        C("rotina", "Quando tudo é urgente, nada está planejado. O que já existe?", ["Carteira visível", "Sequência definida", "Reunião diária", "Desvios tratados"]),
        T("quemprio", "Quem determina a prioridade da produção?", "Ex.: o dono, no dia"),
        A("padrao", "Padronização (ficha técnica, peça-piloto, critério de qualidade, responsável)", "O que existe e o que falta"), T("defeito", "Defeito que mais se repete", "Ex.: costura torta na gola"),
        C("retrab", "Esse retrabalho causa", ["Tempo perdido", "Custo adicional", "Prazo ameaçado"])] },
      { t: "Pronto para escalar?", ajuda: "Se tudo precisa passar pelo dono, o processo não está pronto para escalar.",
        campos: [C("escalar", "O que já existe na produção", ["Processo documentado", "Responsabilidade definida", "Rotina de acompanhamento"]), A("dono", "O que ainda precisa passar por você?", "Ex.: aprovar prioridade, liberar pedido, resolver defeito")] } ],
    calc: x => {
      const L = [], q = x.n("demanda"), tp = x.n("tpad"), ps = x.n("postos"), hm = x.n("hmes"), ef = x.n("efic");
      const carga = q * tp / 60, cap = ps * hm * (ok(ef) ? ef / 100 : 1);
      if (ok(carga) && carga > 0) L.push({ l: "Carga necessária", v: `${nf(carga)} h/mês (quantidade × tempo por peça)`, st: "info" });
      if (ok(cap) && cap > 0) L.push({ l: "Capacidade disponível", v: `${nf(cap)} h/mês (pessoas × horas × eficiência${ok(ef) ? "" : "; eficiência não informada, considerada 100%"})`, st: ok(ef) ? "info" : "warn" });
      if (ok(carga) && carga > 0 && ok(cap) && cap > 0) { const g = cap - carga, p = carga / cap;
        L.push({ l: "A carga cabe na capacidade?", v: g >= 0 ? `Sim: sobra ${nf(g)} h/mês (ocupação de ${pctf(p)}).` : `Não: faltam ${nf(-g)} h/mês (ocupação de ${pctf(p)}). Cerca de ${nf(cap / tp * 60)} peças/mês cabem no gargalo.`, st: g >= 0 ? (p > .9 ? "warn" : "ok") : "err" }); }
      const conf = chks(x.v("confia")); L.push({ l: "Números com dado confiável", v: `${conf.length} de 4${conf.length < 4 ? ". Sem dado confiável, o número é percepção." : ""}`, st: conf.length >= 3 ? "ok" : "warn" });
      const esc = ["Processo documentado", "Responsabilidade definida", "Rotina de acompanhamento"].filter(o => !temChk(x.v("escalar"), o));
      if (x.v("escalar") || x.v("dono")) L.push({ l: "Pronto para escalar?", v: esc.length ? "Falta: " + esc.join(", ").toLowerCase() + "." : "Processo documentado, com responsáveis e rotina.", st: esc.length ? "warn" : "ok" });
      const urg = ["Carteira visível", "Sequência definida", "Reunião diária", "Desvios tratados"].filter(o => !temChk(x.v("rotina"), o));
      if (x.v("rotina") || x.v("quemprio")) L.push({ l: "Rotina contra urgências", v: urg.length ? "Falta: " + urg.join(", ").toLowerCase() + "." : "Carteira, sequência, reunião diária e desvios tratados.", st: urg.length ? "warn" : "ok" });
      const mv = x.vo("vendas", "meta"); if (mv) L.push({ l: "Meta comercial (VENDAS 360)", v: `${mv}. A meta precisa caber na capacidade produtiva: vendas → capacidade → margem → resultado.`, st: "info" });
      return L; },
    out: [
      { b: "g", tipo: "linhas", t: "Mapa de gargalos: os 3 maiores problemas operacionais", n: 3, obr: 3,
        cols: [{ k: "s", l: "Problema", ph: "O que aparece" }, { k: "proc", l: "Processo / etapa", ph: "Onde acontece" }, { k: "ev", l: "Evidência", ph: "Fato ou número" }, { k: "c", l: "Causa provável", ph: "Por que acontece" }, { k: "imp", l: "Impacto", ph: "Prazo, custo, qualidade, margem" }, { k: "ind", l: "Indicador", ph: "Como medir" }] },
      { b: "rapida", tipo: "campo", l: "Ação rápida (corrigir o desvio com os recursos disponíveis)", ph: "", obr: true },
      { b: "estrutural", tipo: "campo", l: "Ação estrutural (corrigir a causa que limita o crescimento)", ph: "", obr: true } ] },

  produto: { dia: "dia1", nome: "PRODUTO 360", curto: "Produto", quando: "Marca e Produto",
    obj: "Avaliar posicionamento e mix de produto sob margem, demanda e capacidade", saida: "Posicionamento prioritário + direção de produto + matriz de portfólio com decisões e hipóteses",
    usa: ["diag", "prod"],
    grupos: [
      { t: "Posicionamento (os cinco elementos)", ajuda: "Se você não define seu posicionamento, o mercado define por você.",
        campos: [T("publico", "1. Público: quem é o cliente prioritário?", ""), A("proposta", "2. Proposta de valor: por que querem ser reconhecidos?", ""), A("prodel", "3. Produto: o que o produto entrega que prova a marca?", ""),
          T("ling", "4. Linguagem: como a marca se comunica?", ""), T("precocan", "5. Preço e canais", "Faixa de preço e por onde vende"), A("posic", "Diferenciação percebida pelo cliente", "Por que escolhem você e não o concorrente"),
          A("promessa", "O que a marca promete × o que o cliente percebe", "Branding é a ponte entre promessa, produto e percepção")] },
      { t: "Linhas de produto", item: "linha", dois: true, campos: [
        T("nome", "Nome da linha", "Ex.: camisetas básicas, uniformes corporativos, moda fitness", false),
        T("cli", "Cliente ideal", "Quem compra"), T("preco", "Preço médio", "R$ por peça"), T("vol", "Volume (peças/mês)", "Ex.: 2.000"),
        T("marg", "Margem", "Ex.: 30% ou 'não sei'"), T("ped", "Pedidos e prazo", "Ex.: pedido mínimo 50; prazo 20 dias"),
        S("q_valor", "Marca: o cliente reconhece valor?", SNN), S("q_dem", "Mercado: existe demanda?", SNN), S("q_marg", "Finanças: a margem é adequada?", SNN), S("q_prod", "Produção: a operação consegue entregar?", SNN)] },
      { t: "Sem diferenciação, o preço vira o principal argumento", unico: true, campos: [C("alerta", "Isso acontece na sua empresa?", ["Produtos parecidos com os da concorrência", "Marca pouco reconhecida", "Clientes sem motivo claro para escolher"])] },
      { t: "Como nasce o conceito de uma coleção", unico: true, dois: true, campos: [T("c_insight", "Insight", "O que você descobriu sobre o público"), T("c_hist", "História", "Que história o produto conta"),
        T("c_cod", "Códigos visuais", "Cores, símbolos, linguagem visual"), T("c_prods", "Produtos", "Quais peças materializam o conceito"), T("c_exp", "Experiência", "Como o cliente vive a marca")] },
      { t: "Conceito bom precisa virar produto viável", unico: true, campos: [C("viavel", "Na linha principal, já está definido:", ["Modelagem e caimento", "Materiais e acabamentos", "Cores, estampas e personalização", "Ficha técnica e padrões", "Custo, qualidade e possibilidade de produção"])] },
      { t: "O produto não termina quando sai da fábrica", unico: true, ajuda: "Conceito → produto → apresentação → lançamento → experiência. Cada contato com o cliente pode reforçar ou enfraquecer o posicionamento.",
        campos: [A("reforca", "Onde a marca é reforçada", ""), A("enfraquece", "Onde a marca enfraquece", "")] } ],
    calc: x => {
      const L = [], al = chks(x.v("alerta"));
      if (al.length >= 2) L.push({ l: "Alerta de preço", v: `${al.length} de 3 sinais marcados: sem diferenciação, o preço vira o principal argumento.`, st: "err" });
      else if (al.length === 1) L.push({ l: "Sinal de atenção", v: al[0], st: "warn" });
      (x.D.g?.[1] || []).forEach((n, i) => { const nome = String(n.c?.nome?.v || "").trim(); if (!nome) return;
        const r = { valor: n.c?.q_valor?.v, dem: n.c?.q_dem?.v, marg: n.c?.q_marg?.v, prod: n.c?.q_prod?.v }, dec = x.o[`lin${i}_dec`];
        const nao = Object.entries(r).filter(([, v]) => v === "Não").map(([k]) => ({ valor: "valor percebido", dem: "demanda", marg: "margem", prod: "entrega" }[k]));
        const ns = Object.values(r).filter(v => !v || v === "Não sei").length;
        if (dec === "ACELERAR" && nao.length) L.push({ l: nome, v: `Está em ACELERAR, mas tem "Não" em ${nao.join(", ")}. Produto desejado também precisa ser um bom negócio.`, st: "err" });
        else if (nao.length) L.push({ l: nome, v: `"Não" em ${nao.join(", ")}${dec ? ` · decisão: ${dec}` : ""}.`, st: "warn" });
        else if (ns) L.push({ l: nome, v: `${ns} das 4 perguntas sem resposta clara: candidata a VALIDAR.`, st: "info" });
        else L.push({ l: nome, v: `Passa nas 4 perguntas${dec ? ` · decisão: ${dec}` : ""}.`, st: "ok" }); });
      return L; },
    out: [
      { b: "posp", tipo: "campo", l: "1. Posicionamento prioritário (para quem queremos ser relevantes e por quê)", ph: "", obr: true },
      { b: "conc", tipo: "campo", l: "2. Direção de produto (conceito ou proposta a desenvolver/fortalecer)", ph: "" },
      { b: "lin", tipo: "linhas", t: "3. Decisão de portfólio", n: 3, obr: 1, rotIn: { g: 1, c: "nome" },
        cols: [{ k: "dec", l: "Decisão", tipo: "sel", op: ["", "ACELERAR", "CORRIGIR", "REDUZIR", "VALIDAR"] }, { k: "ev", l: "Evidência e risco", ph: "Marca, mercado, produção e finanças" },
          { k: "hip", l: "Hipótese a validar", ph: "O que ainda precisa ser confirmado" }, { k: "st", l: "Status", tipo: "sel", op: ANALISE }] },
      { b: "valid", tipo: "campo", l: "Decisão preliminar: o que validar com produção, comercial e financeiro", ph: "" } ] },

  vendas: { dia: "dia1", nome: "VENDAS 360", curto: "Vendas", quando: "Vendas e Gestão Comercial",
    obj: "Auditar a equação de metas comerciais sem criar metas não aprovadas", saida: "Equação da meta comercial 2027 + alavanca prioritária + teste de consistência + dados a validar",
    usa: ["diag", "produto", "prod"],
    grupos: [
      { t: "Meta e histórico", dois: true, campos: [T("meta", "Meta de faturamento proposta para 2027", "Ex.: R$ 6 milhões"), T("fat", "Faturamento anterior (2025/2026)", "Ex.: 2025: R$ 4,2 mi; 2026 até out: R$ 3,9 mi")] },
      { t: "Carteira de clientes", dois: true, ajuda: "Sua carteira não é uma lista de contatos: é um ativo que precisa ser gerenciado.",
        campos: [N("clientes", "Clientes compradores (ativos nos últimos 12 meses)", "Ex.: 46"), N("ticket", "Ticket médio por pedido (R$)", "Ex.: 5400"),
          N("recorr", "Pedidos por cliente em 2027", "Ex.: 3"), T("concent", "Quanto da receita depende dos maiores clientes?", "Ex.: 70% em 12 clientes"),
          N("crec", "Clientes recorrentes", "Ex.: 30"), N("cest", "Clientes estratégicos", "Ex.: 8"), N("inativos", "Clientes inativos para reativar", "Ex.: 25")] },
      { t: "Prospecção e conversão", dois: true, ajuda: "ICP → canal → oportunidade qualificada. Volume de contatos não é sinônimo de potencial de vendas.",
        campos: [T("icp", "Cliente ideal (ICP)", "Ex.: empresas de 50 a 500 funcionários em Goiás"), N("funil", "Oportunidades qualificadas por mês", "Ex.: 35"),
          N("propostas", "Propostas enviadas por mês", "Ex.: 20"), N("pedidos", "Pedidos fechados de clientes novos por mês", "Ex.: 5"),
          N("novos", "Clientes novos por mês (se não souber o funil)", "Ex.: 2"), N("freqn", "Pedidos previstos por cliente novo dentro de 2027", "Ex.: 2")] },
      { t: "Canais, equipe e gestão", campos: [A("canais", "Canais de venda", "Ex.: representantes 50%, loja própria 20%, online 30%"), A("vend", "Vendedores e metas", "Quantos são, quanto cada um vende, se têm meta"),
        T("crm", "Processo comercial e CRM", "Lead → qualificação → proposta → negociação → pedido. Onde fica registrado?"),
        C("crmchk", "Toda oportunidade tem:", ["Responsável", "Próxima ação", "Data"]),
        C("rotina", "Rotina comercial", ["Indicadores acompanhados", "Responsáveis definidos", "Reunião comercial semanal"])] },
      { t: "As 6 engrenagens da máquina comercial", unico: true, dois: true, campos: [["e_cart", "Carteira"], ["e_prosp", "Prospecção"], ["e_conv", "Conversão"], ["e_tick", "Ticket e mix"], ["e_rec", "Recorrência"], ["e_gest", "Gestão"]].map(([k, l]) => S(k, l + " (nota 0 a 10)", NOTAS, NOTA_L)) },
      { t: "Clientes que já compraram", campos: [A("recompra", "Quanto do crescimento de 2027 pode vir de recompra, reativação e expansão da carteira?", "Ex.: reativar 10 dos 25 inativos; vender polo para quem só compra camiseta")] } ],
    calc: x => {
      const L = [], cl = x.n("clientes"), fr = x.n("recorr"), tk = x.m("ticket"), meta = x.m("meta"), fu = x.n("funil"), pr = x.n("propostas"), pe = x.n("pedidos"), nv = x.n("novos"), fn = x.n("freqn");
      const cart = cl * fr * tk;
      if (ok(cart)) L.push({ l: "Receita da carteira atual", v: `${brl(cart)} (${nf(cl)} clientes × ${fr} pedidos × ${brl(tk)})`, st: "info" });
      else L.push({ l: "Receita da carteira atual", v: "Preencha clientes, pedidos por cliente e ticket médio.", st: "warn" });
      if (fu > 0 && pr > 0) L.push({ l: "Conversão oportunidade → proposta", v: pctf(pr / fu), st: "info" });
      if (pr > 0 && pe > 0) L.push({ l: "Conversão proposta → pedido", v: pctf(pe / pr), st: "info" });
      const novosAno = fu > 0 && pe > 0 ? pe * 12 : (nv > 0 ? nv * 12 : NaN), recN = novosAno * fn * tk;
      if (ok(recN)) L.push({ l: "Receita de novos clientes", v: `${brl(recN)} (${nf(novosAno)} clientes novos no ano × ${fn} pedidos em 2027 × ${brl(tk)})`, st: "info" });
      else L.push({ l: "Receita de novos clientes", v: "Preencha oportunidades e pedidos fechados (ou clientes novos por mês) e os pedidos previstos por cliente novo em 2027.", st: "warn" });
      if (ok(cart)) { const tot = cart + (ok(recN) ? recN : 0);
        L.push({ l: "Meta comercial fundamentada", v: brl(tot), st: "ok" });
        if (ok(meta)) { const g = meta - tot; L.push({ l: "Comparação com a meta proposta", v: g > 0 ? `Faltam ${brl(g)} para a meta de ${brl(meta)} (${pctf(g / meta)}). Meta sem plano comercial é apenas um desejo.` : `A equação cobre a meta de ${brl(meta)}.`, st: g > 0 ? (g / meta > .15 ? "err" : "warn") : "ok" }); } }
      const eng = [["e_cart", "Carteira"], ["e_prosp", "Prospecção"], ["e_conv", "Conversão"], ["e_tick", "Ticket e mix"], ["e_rec", "Recorrência"], ["e_gest", "Gestão"]].map(([k, l]) => ({ l, nv: x.v(k) })).filter(e => e.nv !== "");
      const num = eng.filter(e => e.nv !== "P");
      if (num.length) { const m = Math.min(...num.map(e => +e.nv)); L.push({ l: "Engrenagem mais fraca", v: num.filter(e => +e.nv === m).map(e => `${e.l} (${m})`).join(", "), st: m <= 4 ? "err" : m <= 6 ? "warn" : "ok" }); }
      const crm = ["Responsável", "Próxima ação", "Data"].filter(o => !temChk(x.v("crmchk"), o));
      if (x.v("crmchk") || x.v("crm")) L.push({ l: "CRM", v: crm.length ? `Oportunidade sem ${crm.join(", ").toLowerCase()} está fora de controle.` : "Responsável, próxima ação e data em toda oportunidade.", st: crm.length ? "warn" : "ok" });
      const rt = ["Indicadores acompanhados", "Responsáveis definidos", "Reunião comercial semanal"].filter(o => !temChk(x.v("rotina"), o));
      if (x.v("rotina")) L.push({ l: "Rotina comercial", v: rt.length ? "Falta: " + rt.join(", ").toLowerCase() + ". O que não entra na rotina não vira resultado." : "Completa.", st: rt.length ? "warn" : "ok" });
      return L; },
    out: [
      { b: "eqn", tipo: "linhas", t: "Equação da meta comercial 2027", rot: ["Receita da carteira atual", "Receita de novos clientes", "Meta comercial fundamentada"], obr: 2,
        cols: [{ k: "conta", l: "Conta", ph: "Ex.: 46 clientes × 3 pedidos × R$ 5.400" }, { k: "v", l: "Valor", ph: "R$" }] },
      { b: "alav", tipo: "linhas", t: "Alavanca prioritária de crescimento", rot: ["Alavanca"], obr: 1,
        cols: [{ k: "a", l: "Alavanca", tipo: "sel", op: ["", "Novos clientes", "Recorrência", "Ticket médio", "Canais de venda", "Reativação"] }, { k: "por", l: "Por quê", ph: "" }] },
      { b: "teste", tipo: "linhas", t: "Teste de consistência: sua meta resiste?", rot: ["Clientes: temos clientes e oportunidades suficientes?", "Conversão: é realista?", "Margem: mix e margem fazem sentido?", "Capacidade: a fábrica consegue entregar?"], obr: 4,
        cols: [{ k: "st", l: "Resposta", tipo: "sel", op: SNN }, { k: "obs", l: "Observação", ph: "" }] },
      { b: "validar", tipo: "campo", l: "Dados que precisam ser validados", ph: "", obr: true } ] },

  oficina: { dia: "dia1", nome: "OFICINA 360 — ANÁLISE CRUZADA", curto: "Análise cruzada", quando: "Oficina Confecção 360° — Aplicação na minha empresa",
    obj: "Cruzar decisões comerciais, produtivas e de portfólio na mesma empresa", saida: "Matriz cruzada: evidência / decisão inicial / pendência por pilar + conflitos",
    usa: ["prod", "produto", "vendas"],
    grupos: [
      { t: "Produção: o que está limitando seu resultado?", item: "gargalo", ajuda: "Identifique os 3 gargalos que mais comprometem sua operação (um por anotação).",
        campos: [T("onde", "Onde a operação está travando?", ""), C("afeta", "Como isso afeta?", ["Prazo", "Custo", "Qualidade", "Produtividade"]), T("mudar", "O que precisa mudar primeiro?", "")] },
      { t: "Produto: você está vendendo os produtos certos?", unico: true, ajuda: "Faturamento não é o único critério para definir seu portfólio.",
        campos: [A("acel", "ACELERAR: produtos com potencial de crescimento e resultado", ""), A("corr", "CORRIGIR: produtos que precisam de ajuste", ""),
          C("corrq", "O ajuste é de", ["Margem", "Preço", "Posicionamento", "Operação"]), A("red", "REDUZIR: produtos cuja contribuição não justifica a mesma prioridade", ""),
          S("papel", "O papel estratégico foi avaliado antes de reduzir?", SNN)] },
      { t: "Vendas: de onde virá o crescimento?", unico: true, ajuda: "Uma meta só faz sentido quando sabemos como alcançá-la.",
        campos: [S("alav", "Alavanca comercial que muda primeiro", ALAV), A("dvend", "Por quê", ""), S("suporta", "Sua operação e seu portfólio suportam essa estratégia?", SNN)] },
      { t: "Suas três áreas estão alinhadas?", unico: true, dois: true, ajuda: "Crescimento exige coerência entre decisões: uma decisão em uma área pode comprometer o resultado das outras.",
        campos: [["al_cap", "Capacidade"], ["al_rent", "Rentabilidade"], ["al_pos", "Posicionamento"], ["al_pq", "Prazo e qualidade"], ["al_dep", "Dependências"]].map(([k, l]) => S(k, l, ["", "Alinhado", "Conflito", "Não sei"])).concat([A("al_obs", "Quais são os conflitos?", "")]) } ],
    calc: x => {
      const L = [], g = (x.D.g?.[0] || []).filter(n => String(n.c?.onde?.v || "").trim());
      L.push({ l: "Gargalos de produção", v: g.length > 3 ? `${g.length} anotados: escolha os 3 que mais comprometem a operação.` : `${g.length} de 3`, st: g.length > 3 ? "warn" : g.length ? "ok" : "info" });
      const al = [["al_cap", "capacidade"], ["al_rent", "rentabilidade"], ["al_pos", "posicionamento"], ["al_pq", "prazo e qualidade"], ["al_dep", "dependências"]];
      const cf = al.filter(([k]) => x.v(k) === "Conflito").map(a => a[1]), ns = al.filter(([k]) => x.v(k) === "Não sei").map(a => a[1]);
      if (cf.length) L.push({ l: "Conflitos entre as áreas", v: cf.join(", "), st: "err" });
      if (ns.length) L.push({ l: "Ainda sem resposta", v: ns.join(", "), st: "warn" });
      if (x.v("suporta") === "Não") L.push({ l: "Vendas × operação", v: "A operação ou o portfólio não suportam a estratégia comercial escolhida.", st: "err" });
      if (x.v("red") && x.v("papel") !== "Sim") L.push({ l: "Reduzir", v: "Avalie o papel estratégico do produto antes de reduzir a prioridade.", st: "warn" });
      return L; },
    out: [
      { b: "m", tipo: "linhas", t: "Diagnóstico sem decisão não muda empresa", rot: ["Produção", "Produto", "Vendas"], obr: 3,
        cols: [{ k: "ev", l: "Evidências e problemas", ph: "O que comprova" }, { k: "dec", l: "Decisão inicial", ph: "O que pretende fazer" }, { k: "pend", l: "Dados pendentes", ph: "O que falta saber" }] },
      { b: "cf", tipo: "linhas", t: "Conflitos mais relevantes (até 3)", n: 3, obr: 1, cols: [{ k: "c", l: "Conflito entre pilares", ph: "Ex.: vender mais uniforme sem capacidade na costura" }, { k: "p", l: "Pergunta de decisão", ph: "O que precisa ser decidido" }] } ] },

  painel: { dia: "dia1", nome: "PAINEL DE DECISÕES 360", curto: "Painel de decisões", quando: "Painel de Decisões 360° — Meu Plano 2027",
    obj: "Consolidar três decisões para preparar a sexta-feira", saida: "Painel das três decisões + teste de coerência + dados a obter na sexta",
    usa: ["oficina", "prod", "produto", "vendas", "diag"],
    grupos: [
      { t: "Decisão 01: qual decisão muda a sua produção?", unico: true, ajuda: "Escolha o gargalo que mais compromete o resultado da sua confecção.",
        campos: [T("pprob", "Problema: qual gargalo precisa ser enfrentado?", ""), C("pimp", "Impacto: o que ele compromete?", ["Prazo", "Custo", "Qualidade", "Produtividade"]), A("pdec", "Decisão: o que precisa mudar?", "")] },
      { t: "Decisão 02: qual decisão muda seu portfólio?", unico: true, ajuda: "Nem todo produto que vende merece crescer.",
        campos: [A("acel", "ACELERAR: o que merece maior prioridade?", ""), A("corr", "CORRIGIR: o que precisa melhorar?", ""), A("red", "REDUZIR: o que precisa perder prioridade?", ""),
          S("melhora", "Essa escolha melhora posicionamento e resultado?", SNN)] },
      { t: "Decisão 03: qual decisão muda suas vendas?", unico: true, ajuda: "Crescimento previsível exige escolhas comerciais claras.",
        campos: [S("alav", "Qual alavanca precisa mudar primeiro?", ALAV), A("dv", "Por quê e como", "")] } ],
    pre: x => ({ d0_dec: x.v("pdec"), d1_dec: [x.v("acel") && "Acelerar: " + x.v("acel"), x.v("corr") && "Corrigir: " + x.v("corr"), x.v("red") && "Reduzir: " + x.v("red")].filter(Boolean).join(" · "), d2_dec: x.v("alav") ? x.v("alav") + (x.v("dv") ? ": " + x.v("dv") : "") : "" }),
    preIn: x => ({ pprob: x.vo("oficina", "onde"), pimp: x.vo("oficina", "afeta"), pdec: x.vo("oficina", "mudar"), acel: x.vo("oficina", "acel"), corr: x.vo("oficina", "corr"), red: x.vo("oficina", "red"), alav: x.vo("oficina", "alav"), dv: x.vo("oficina", "dvend") }),
    calc: x => {
      const L = [], st = [0, 1, 2].map(i => x.o[`d${i}_st`]).filter(Boolean);
      if (st.length) L.push({ l: "Status das decisões", v: ["Confirmada", "Hipótese", "Informação pendente"].map(s => `${st.filter(y => y === s).length} ${s.toLowerCase()}`).join(" · "), st: st.every(s => s === "Confirmada") ? "ok" : "warn" });
      const nao = [0, 1, 2].filter(i => x.o[`coer${i}_r`] === "Não").length; if (nao) L.push({ l: "Teste de coerência", v: `${nao} pergunta(s) com "Não": identifique os conflitos antes de definir as metas.`, st: "err" });
      if (x.v("melhora") === "Não") L.push({ l: "Portfólio", v: "A escolha de portfólio não melhora posicionamento e resultado: revise.", st: "warn" });
      L.push({ l: "Lembrete", v: "Não transforme achismo em estratégia: confirmada = com evidência; hipótese = a validar; pendente = falta dado.", st: "info" });
      return L; },
    out: [
      { b: "d", tipo: "linhas", t: "Painel das três decisões", rot: ["Produção", "Produto", "Vendas"], obr: 3,
        cols: [{ k: "dec", l: "Decisão", ph: "O que foi decidido" }, { k: "ev", l: "Evidência", ph: "Por quê" }, { k: "imp", l: "Impacto", ph: "O que muda" },
          { k: "risco", l: "Risco", ph: "O que pode dar errado" }, { k: "dep", l: "Dependência", ph: "Do que depende" }, { k: "st", l: "Status", tipo: "sel", op: STATUS }] },
      { b: "coer", tipo: "linhas", t: "Teste de coerência: as decisões fazem sentido juntas?", rot: ["A produção consegue entregar?", "O produto contribui para o resultado?", "A estratégia comercial é viável?"], obr: 3,
        cols: [{ k: "r", l: "Resposta", tipo: "sel", op: ["", "Sim", "Não", "Não sei (pendente)"] }, { k: "obs", l: "Conflito ou observação", ph: "" }] },
      { b: "dados", tipo: "campo", l: "Dados a obter para a sexta-feira", ph: "Ex.: DRE de 2025; vendas por produto; custo por peça", obr: true } ] },

  // ======================= SEXTA 20/11 =======================
  pessoas: { dia: "dia2", nome: "PESSOAS 360", curto: "Pessoas", quando: "Liderança e Pessoas",
    obj: "Reduzir dependência do dono e testar capacidade de execução estratégica", saida: "Mapa de dependência do dono + três delegações + lacuna",
    usa: ["painel", "diag"],
    grupos: [
      { t: "O que depende de você", campos: [A("central", "Atividades centralizadas no dono", "Tudo o que só você faz ou aprova. Ex.: compras, preços, prioridade da produção")] },
      { t: "Estrutura atual", campos: [A("lideres", "Líderes e papéis", "Quem lidera o quê. Ex.: Ana na costura, João no comercial"), A("rotinas", "Rotinas de gestão", "Reuniões, acompanhamentos, indicadores"),
        A("org", "Organograma", "Como a empresa está organizada hoje"), T("metas", "Metas da equipe", "A equipe tem metas? Quais?")] } ],
    out: [
      { b: "mapa", tipo: "linhas", t: "Mapa de dependência do dono", n: 5, obr: 3,
        cols: [{ k: "at", l: "Atividade", ph: "O que é feito" }, { k: "ex", l: "Executor atual", ph: "Quem faz hoje" }, { k: "resp", l: "Responsável desejado", ph: "Quem deveria fazer" }, { k: "lac", l: "Lacuna", ph: "O que falta" }, { k: "prazo", l: "Prazo", ph: "Até quando" }] },
      { b: "del", tipo: "linhas", t: "Três responsabilidades a descentralizar", n: 3, obr: 3, cols: [{ k: "r", l: "Responsabilidade", ph: "O que sai das suas mãos" }, { k: "p", l: "Para quem", ph: "Nome" }, { k: "pz", l: "Prazo", ph: "Até quando" }] },
      { b: "lac", tipo: "campo", l: "Lacuna crítica de liderança", ph: "A posição ou competência de liderança que mais falta hoje", obr: true } ] },

  financeiro: { dia: "dia2", nome: "FINANCEIRO 360", curto: "Financeiro", quando: "Gestão e Financeiro · Do faturamento ao resultado",
    obj: "Montar a DRE gerencial, achar o que compromete o resultado e calcular o faturamento necessário para 2027", saida: "DRE 2026 com R/H/P + diagnóstico financeiro + meta 2027 + riscos e decisão para a SWOT",
    usa: ["painel", "vendas", "prod"],
    grupos: [
      { t: "Minha confecção em números (DRE 2026)", unico: true, dois: true,
        ajuda: "Varia com cada peça vendida? Variável. Existe mesmo sem vender? Fixo. Escolha um critério e mantenha o mesmo em 2026 e 2027. Sem o dado? Não invente: marque P.",
        campos: [T("periodo", "Período de 2026", "Ex.: jan a out/2026", false), N("rb", "Receita bruta de vendas (R$)", "Tudo o que foi faturado no período"), N("ded", "(–) Deduções (R$)", "Impostos sobre vendas, devoluções e abatimentos"),
          N("cv", "(–) Custos variáveis (R$)", "Tecido, aviamentos, facção, estampa terceirizada"), N("dv", "(–) Despesas variáveis (R$)", "Comissões, frete de venda, taxas de cartão"),
          N("gf", "(–) Gastos fixos (R$)", "Folha fixa, aluguel, administrativo, pró-labore"), A("quem", "Linhas marcadas como P: quem vai apurar e até quando?", "Ex.: custos variáveis — contadora, até 05/12")] },
      { t: "Caixa e investimentos", campos: [T("caixa", "Caixa e capital de giro", "Ex.: R$ 300 mil em caixa; prazo médio de recebimento 45 dias"),
        A("invest", "Investimentos previstos e dívidas", "Ex.: máquina de R$ 200 mil; empréstimo de R$ 150 mil"), A("dre", "Outras informações da DRE (opcional)", "Despesas financeiras, depreciação, IR/CSLL")] },
      { t: "Comece pelo lucro desejado: meta 2027", unico: true, dois: true, ajuda: "Faturamento necessário = (gastos fixos projetados + resultado operacional desejado) ÷ margem de contribuição %.",
        campos: [N("gf27", "Gastos fixos projetados 2027 (R$/ano)", "Ex.: 1.440.000"), N("res27", "Resultado operacional desejado 2027 (R$)", "Ex.: 360.000"), N("mc27", "Margem de contribuição prevista (%)", "Em branco = usa a de 2026"),
          S("t_mix", "A margem prevista é coerente com o mix?", SNN), S("t_cap", "A capacidade produtiva comporta o volume?", SNN), S("t_com", "O comercial sustenta essa venda?", SNN), S("t_cx", "O caixa financia o crescimento?", SNN)] } ],
    calc: x => {
      const L = [], c = contasFin(x);
      if (ok(c.rb) && c.rb > 0) {
        const p = v => ok(v) ? ` (${pctf(v / c.rb)})` : "";
        L.push({ l: "Receita líquida", v: brl(c.rl) + p(c.rl), st: "info" });
        if (ok(c.mcp)) L.push({ l: "Margem de contribuição", v: `${brl(c.mc)} (${pctf(c.mcp)}): o que sobra para pagar a estrutura`, st: c.mc > 0 ? "ok" : "err" });
        if (ok(c.ro)) L.push({ l: "Resultado operacional", v: brl(c.ro) + p(c.ro), st: c.ro >= 0 ? "ok" : "err" });
        if (ok(c.pe)) L.push({ l: "Ponto de equilíbrio", v: `${brl(c.pe)} no período (gastos fixos ÷ MC %). Até aqui as vendas só pagam a estrutura; acima disso, cada R$ 100 vendidos geram ${brl(c.mcp * 100)} de resultado.`, st: c.rb >= c.pe ? "info" : "err" });
        const sin = [];
        if (ok(c.gf) && c.mc > 0 && c.gf / c.mc > .9) sin.push("Gastos fixos consomem quase toda a margem → estrutura, ociosidade, produtividade. A estrutura cabe no volume que você vende?");
        if (ok(c.pe) && c.rb < c.pe) sin.push("Faturamento abaixo do ponto de equilíbrio → volume, força comercial ou estrutura. Falta venda ou sobra estrutura?");
        if (ok(c.ro) && c.ro > 0 && /apertad|negativ|falta|sem caixa|curto/i.test(x.v("caixa"))) sin.push("Resultado positivo e caixa apertado → prazos, estoques, investimentos, dívidas. Onde o lucro ficou preso?");
        const ps = ["rb", "ded", "cv", "dv", "gf"].filter(k => x.f(k) === "P").length;
        if (ps >= 2) sin.push(`${ps} linhas marcadas como P → controles e classificação de gastos. Qual dado precisa ser apurado primeiro?`);
        sin.forEach(s => L.push({ l: "Gargalo provável", v: s, st: "warn" }));
      } else L.push({ l: "DRE", v: "Preencha a receita bruta e as linhas da DRE para a ferramenta calcular margem, resultado e ponto de equilíbrio.", st: "warn" });
      if (ok(c.fatN)) {
        L.push({ l: "Faturamento bruto necessário 2027", v: `${brl(c.fatN)} = (${brl(c.gf27)} + ${brl(c.res27)}) ÷ ${c.mc27.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%${c.mc27h ? " (MC de 2026, hipótese)" : ""}`, st: "ok" });
        const mv = moeda(x.vo("vendas", "meta")); if (ok(mv)) { const d = mv - c.fatN; L.push({ l: "Comparação com a meta comercial (VENDAS 360)", v: `Meta comercial ${brl(mv)}: ${d >= 0 ? "cobre" : "fica " + brl(-d) + " abaixo d"}o faturamento necessário.`, st: d >= 0 ? "ok" : "err" }); }
        const nao = [["t_mix", "mix"], ["t_cap", "capacidade"], ["t_com", "comercial"], ["t_cx", "caixa"]].filter(([k]) => x.v(k) && x.v(k) !== "Sim").map(a => a[1]);
        if (nao.length) L.push({ l: "Antes de aceitar o número", v: `Ainda não validado: ${nao.join(", ")}.`, st: "warn" });
      }
      return L; },
    pre: x => { const c = contasFin(x); return { meta0_v: ok(c.res27) ? brl(c.res27) : "", meta1_v: ok(c.mc27) && x.v("mc27") ? x.v("mc27").replace(/%?$/, "%") : "", meta2_v: ok(c.fatN) ? brl(c.fatN) : "" }; },
    out: [
      { b: "gar", tipo: "linhas", t: "Meu diagnóstico financeiro: o que mais compromete o resultado?", rot: ["Principal gargalo"], obr: 1,
        cols: [{ k: "g", l: "Meu principal gargalo", ph: "Ex.: gastos fixos consomem a margem" }, { k: "ev", l: "Evidência na DRE", ph: "Ex.: fixos = 92% da MC" }, { k: "falta", l: "Dado que ainda falta", ph: "" }] },
      { b: "meta", tipo: "linhas", t: "O resultado que queremos exige escolhas", rot: ["Resultado operacional desejado 2027", "Margem de contribuição desejada", "Faturamento necessário"], obr: 1,
        cols: [{ k: "v", l: "Valor", ph: "Valor ou 'pendente'" }, { k: "base", l: "Como chegou", ph: "Fórmula ou premissa" }] },
      { b: "risco", tipo: "linhas", t: "Principais riscos financeiros", n: 3, obr: 2, cols: [{ k: "r", l: "Risco", ph: "Ex.: crescer vendas sem capital de giro" }, { k: "g", l: "Gravidade", tipo: "sel", op: GRAV }, { k: "a", l: "Ação preventiva", ph: "O que fazer" }] },
      { b: "swot", tipo: "campo", l: "Uma decisão prioritária para a SWOT", ph: "O que você precisa mudar antes de simplesmente vender mais?", obr: true },
      { b: "hip", tipo: "campo", l: "Hipóteses e dados a validar", ph: "" } ] },

  swot: { dia: "dia2", nome: "SWOT 360", curto: "SWOT", quando: "SWOT 360° e escolhas estratégicas",
    obj: "Organizar forças, fraquezas, oportunidades e ameaças comprováveis", saida: "SWOT priorizada + cruzamentos úteis",
    usa: ["diag", "painel", "pessoas", "financeiro"],
    grupos: [
      { t: "Mercado", campos: [A("mercado", "Mercado que você conhece", "Tendências, clientes, demanda na sua região ou nicho"), A("conc", "Concorrência", "Quem são, onde são melhores ou piores que você")] },
      { t: "Sua percepção", dois: true, campos: [A("forcas", "Forças que você percebe", "O que a sua empresa faz bem"), A("fraq", "Fraquezas que você percebe", "O que trava a empresa")] } ],
    out: [
      { b: "F", tipo: "linhas", t: "Forças (internas)", n: 3, obr: 2, cols: [{ k: "i", l: "Força", ph: "" }, { k: "e", l: "Evidência", ph: "Fato que comprova" }] },
      { b: "W", tipo: "linhas", t: "Fraquezas (internas)", n: 3, obr: 2, cols: [{ k: "i", l: "Fraqueza", ph: "" }, { k: "e", l: "Evidência", ph: "Fato que comprova" }] },
      { b: "O", tipo: "linhas", t: "Oportunidades (externas)", n: 3, obr: 2, cols: [{ k: "i", l: "Oportunidade", ph: "" }, { k: "e", l: "Evidência", ph: "Fato que comprova" }] },
      { b: "T", tipo: "linhas", t: "Ameaças (externas)", n: 3, obr: 2, cols: [{ k: "i", l: "Ameaça", ph: "" }, { k: "e", l: "Evidência", ph: "Fato que comprova" }] },
      { b: "tows", tipo: "campo", l: "Cruzamentos úteis (TOWS)", ph: "Ex.: força X + oportunidade Y = ação Z" } ] },

  prioridades: { dia: "dia2", nome: "PRIORIDADES 2027", curto: "Prioridades", quando: "SWOT 360° e escolhas estratégicas",
    obj: "Escolher três a cinco prioridades e explicitar renúncias", saida: "3–5 prioridades justificadas + iniciativas fora de escopo",
    usa: ["swot", "painel", "financeiro", "iniciar"],
    grupos: [{ t: "Insumos", campos: [A("metas", "Metas para 2027", "O que você quer alcançar"), A("cap", "Capacidade e restrições", "Pessoas, caixa, fábrica, tempo do dono"), A("ideias", "Ideias de prioridade", "O que você acha que deveria ser prioridade")] }],
    out: [
      { b: "p", tipo: "linhas", t: "Prioridades estratégicas 2027", n: 5, obr: 3, cols: [{ k: "p", l: "Prioridade", ph: "" }, { k: "j", l: "Justificativa", ph: "Por que agora" }, { k: "o", l: "Ordem", tipo: "sel", op: ["", "1", "2", "3", "4", "5"] }] },
      { b: "fora", tipo: "linhas", t: "O que NÃO será feito agora", n: 3, obr: 1, cols: [{ k: "i", l: "Iniciativa", ph: "" }, { k: "m", l: "Por que fica fora", ph: "" }] } ] },

  orcamento: { dia: "dia2", nome: "ORÇAMENTO 2027", curto: "Orçamento", quando: "Orçamento Comercial 2027",
    obj: "Estruturar orçamento comercial rastreável por produto × volume × preço", saida: "Tabelas para Planilha: venda anual, mensal, canal e vendedor",
    usa: ["prioridades", "vendas", "produto"],
    grupos: [
      { t: "Base", dois: true, campos: [T("base", "Base 2026 (faturamento)", "Ex.: R$ 4,6 mi"), A("linhas", "Linhas e preços", "Ex.: camiseta R$ 39; polo R$ 59; uniforme R$ 85")] },
      { t: "Premissas", campos: [A("vol", "Volumes por linha", "Ex.: camiseta 40 mil peças/ano"), A("saz", "Sazonalidade", "Meses fortes e fracos"), A("canais", "Canais", "Quanto cada canal vende"), A("vend", "Vendedores", "Quanto cada vendedor deve vender")] } ],
    out: [
      { b: "l", tipo: "linhas", t: "Venda anual por linha", n: 5, obr: 1, calc: true,
        cols: [{ k: "lin", l: "Linha / produto", ph: "" }, { k: "q", l: "Quantidade/ano", ph: "Ex.: 40000" }, { k: "pr", l: "Preço médio", ph: "Ex.: 39" }, { k: "f", l: "Origem", tipo: "sel", op: ["", "[R]", "[H]", "[P]"] }] },
      { b: "mes", tipo: "campo", l: "Distribuição mensal", ph: "Ex.: jan 6%, fev 6%… ou meses fortes/fracos" },
      { b: "canal", tipo: "campo", l: "Por canal", ph: "Ex.: representantes 50%, loja 20%, online 30%" },
      { b: "vend", tipo: "campo", l: "Por vendedor (se aplicável)", ph: "Ex.: Ana R$ 1,2 mi; Bruno R$ 900 mil" } ] },

  viabilidade: { dia: "dia2", nome: "VIABILIDADE 360", curto: "Viabilidade", quando: "Orçamento de Resultado e Capacidade",
    obj: "Testar se a meta comercial dá lucro, cabe na fábrica e tem caixa", saida: "Cheque de coerência (resultado, capacidade, caixa) + principal restrição, decisão corretiva e dado a validar",
    usa: ["orcamento", "financeiro", "prod", "vendas"],
    grupos: [
      { t: "Teste 1 · Resultado: dá lucro?", unico: true, dois: true, ajuda: "DRE projetada: faça a meta comercial chegar até o resultado operacional. Faturamento não é lucro.",
        campos: [N("rb", "Receita bruta do orçamento comercial (R$)", ""), N("ded", "(–) Impostos e deduções das vendas (R$)", ""), N("cv", "(–) Custos e despesas variáveis (R$)", ""), N("gf", "(–) Custos e despesas fixos (R$)", "")] },
      { t: "Teste 2 · Capacidade: cabe na fábrica?", unico: true, dois: true, ajuda: "Compare demanda e capacidade no mês de pico e no gargalo crítico.",
        campos: [N("vol", "Volume planejado no mês de pico (peças)", ""), N("tpad", "Tempo-padrão por peça no gargalo (minutos)", ""), N("rec", "Recursos no gargalo (pessoas ou máquinas)", ""),
          N("horas", "Horas disponíveis por recurso no mês", ""), N("efic", "Eficiência (%)", ""), T("mes", "Mês ou processo que limita as vendas", "Ex.: março, costura")] },
      { t: "Teste 3 · Capital de giro: tem caixa?", ajuda: "Comprar → produzir → entregar → receber. Lucro projetado não garante dinheiro disponível na hora certa.",
        campos: [N("pmr", "Prazo médio de recebimento dos clientes (dias)", "Ex.: 45"), N("pmp", "Prazo médio de pagamento a fornecedores (dias)", "Ex.: 30"), N("pe", "Tempo de produção e estoque (dias)", "Ex.: 25"),
          A("estoq", "Estoques (tecidos, aviamentos, produtos)", ""), A("invest", "Investimentos (máquinas, estrutura, equipe)", ""), A("financia", "Quem financia o tempo entre pagar e receber?", "")] } ],
    preIn: x => { const t = totalOrc(x.of("orcamento")), cf = contasFin({ m: k => moeda(x.vo("financeiro", k)), n: k => numero(x.vo("financeiro", k)) });
      return { rb: t ? brl(t) : "", gf: ok(cf.gf27) ? brl(cf.gf27) : "", tpad: x.vo("prod", "tpad"), rec: x.vo("prod", "postos"), horas: x.vo("prod", "hmes"), efic: x.vo("prod", "efic"), mes: x.vo("prod", "gargalo") }; },
    calc: x => {
      const L = [], rb = x.m("rb"), ded = x.m("ded"), cv = x.m("cv"), gf = x.m("gf");
      if (ok(rb) && rb > 0) { const rl = rb - (ok(ded) ? ded : 0), mc = rl - (ok(cv) ? cv : 0), ro = ok(gf) ? mc - gf : NaN;
        L.push({ l: "Receita líquida", v: brl(rl), st: "info" });
        if (ok(cv)) L.push({ l: "Margem de contribuição", v: `${brl(mc)} (${pctf(mc / rb)})`, st: mc > 0 ? "ok" : "err" });
        if (ok(ro)) L.push({ l: "Resultado operacional gerencial", v: `${brl(ro)} (${pctf(ro / rb)}). Não é lucro líquido.`, st: ro > 0 ? "ok" : "err" });
        const r27 = moeda(x.vo("financeiro", "res27")); if (ok(ro) && ok(r27)) L.push({ l: "Atende à meta de resultado (FINANCEIRO 360)?", v: ro >= r27 ? `Sim: ${brl(ro)} ≥ ${brl(r27)}.` : `Não: faltam ${brl(r27 - ro)} para ${brl(r27)}.`, st: ro >= r27 ? "ok" : "err" }); }
      const nec = x.n("vol") * x.n("tpad") / 60, efe = x.n("rec") * x.n("horas") * (ok(x.n("efic")) ? x.n("efic") / 100 : 1);
      if (ok(nec) && nec > 0) L.push({ l: "Horas necessárias", v: `${nf(nec)} h (volume × tempo-padrão)`, st: "info" });
      if (ok(efe) && efe > 0) L.push({ l: "Horas efetivas", v: `${nf(efe)} h (recursos × horas × eficiência)`, st: "info" });
      if (ok(nec) && nec > 0 && ok(efe) && efe > 0) L.push({ l: "Gap de capacidade", v: nec <= efe ? `Cabe: sobram ${nf(efe - nec)} h no gargalo.` : `Faltam ${nf(nec - efe)} h no gargalo para cumprir a promessa comercial.`, st: nec <= efe ? "ok" : "err" });
      const pmr = x.n("pmr"), pmp = x.n("pmp"), pe = x.n("pe");
      if (ok(pmr) && ok(pmp)) { const ciclo = (ok(pe) ? pe : 0) + pmr - pmp;
        L.push({ l: "Ciclo financeiro", v: `${nf(ciclo)} dias que a empresa financia entre pagar e receber${ok(pe) ? "" : " (sem o tempo de produção e estoque)"}.`, st: ciclo > 30 ? "warn" : "info" });
        if (ok(rb) && rb > 0 && ciclo > 0) L.push({ l: "Necessidade de capital de giro (estimativa)", v: `≈ ${brl(rb / 360 * ciclo)} (receita diária × ciclo). Hipótese para validar.`, st: "warn" }); }
      return L; },
    out: [
      { b: "cheque", tipo: "linhas", t: "Cheque de coerência: seu plano passou nos três testes?", rot: ["Resultado (DRE projetada · margem e despesas)", "Capacidade (volume por mês · gargalo)", "Caixa (capital de giro · desembolsos)"], obr: 3,
        cols: [{ k: "st", l: "Situação", tipo: "sel", op: ["", "Validado", "Restrição", "Pendente"] }, { k: "obs", l: "Observação", ph: "Se faltar um número, marque Pendente" }] },
      { b: "ent", tipo: "linhas", t: "Qual decisão torna seu plano viável?", rot: ["Principal restrição", "Decisão corretiva", "Dado a validar"], obr: 3, cols: [{ k: "v", l: "Registro", ph: "" }] } ] },

  kpis: { dia: "dia2", nome: "KPIs 2027", curto: "KPIs", quando: "Objetivos, KPIs e Projetos",
    obj: "Transformar prioridades em objetivos, metas e um KPI principal por prioridade", saida: "Matriz prioridade → objetivo → meta → KPI (com fórmula, fonte e responsável)",
    usa: ["prioridades", "orcamento", "financeiro", "viabilidade"],
    grupos: [{ t: "Insumos", ajuda: "Utilize SWOT, Orçamento Comercial, DRE e Capacidade Produtiva. Não confunda objetivos com tarefas.", campos: [A("dados", "Dados que você já tem", "Onde estão os números: sistema, planilha, caderno"), A("resp", "Pessoas que podem ser responsáveis", "Nomes e funções")] }],
    pre: x => { const r = {}, o = x.oo("prioridades"); for (let i = 0; i < 5; i++) if (o[`p${i}_p`]) r[`k${i}_pri`] = o[`p${i}_p`]; return r; },
    calc: x => {
      const L = [], pj = x.oo("projetos");
      for (let i = 0; i < 5; i++) { const pri = x.o[`k${i}_pri`]; if (!pri && !x.o[`k${i}_obj`]) continue;
        const proj = [0, 1, 2, 3, 4].find(j => pj[`pj${j}_pri`] && String(pj[`pj${j}_pri`]).trim() === String(pri || "").trim() && pj[`pj${j}_nome`]);
        const falta = []; if (!x.o[`k${i}_obj`]) falta.push("o que precisamos alcançar (objetivo)"); if (!x.o[`k${i}_ind`] || !x.o[`k${i}_meta`]) falta.push("qual número comprova (KPI e meta)");
        if (proj === undefined) falta.push("qual projeto produz a mudança"); if (!x.o[`k${i}_resp`]) falta.push("quem é responsável"); if (proj === undefined || !pj[`pj${proj}_prazo`]) falta.push("até quando");
        if (!x.o[`k${i}_form`] || !x.o[`k${i}_fonte`]) falta.push("fórmula e fonte do indicador");
        L.push({ l: `Prioridade ${i + 1}${pri ? ": " + pri : ""}`, v: falta.length ? "Falta: " + falta.join("; ") + "." : "Passa nas cinco perguntas.", st: falta.length ? "warn" : "ok" }); }
      if (L.length) L.push({ l: "Regra", v: "Se uma das cinco respostas estiver faltando, o plano ainda não está pronto. O projeto vem do PROJETOS 2027.", st: "info" });
      return L; },
    out: [
      { b: "k", tipo: "linhas", t: "Os números que vão governar 2027 (um KPI principal por prioridade)", n: 5, obr: 3, req: "obj",
        cols: [{ k: "pri", l: "Prioridade", ph: "Vem do PRIORIDADES 2027" }, { k: "obj", l: "Objetivo", ph: "O que queremos alcançar?" }, { k: "meta", l: "Meta 2027", ph: "Quanto e até quando?" },
          { k: "ind", l: "KPI principal", ph: "Como vamos medir?" }, { k: "form", l: "Fórmula", ph: "Como calcula" }, { k: "base", l: "Base atual", ph: "Hoje" },
          { k: "freq", l: "Frequência", tipo: "sel", op: ["", "Diária", "Semanal", "Mensal", "Trimestral"] }, { k: "fonte", l: "Fonte", ph: "De onde vem o dado" }, { k: "resp", l: "Responsável", ph: "Nome" }] },
      { b: "teste", tipo: "linhas", t: "Teste de coerência: sua matriz sobreviveria à realidade da fábrica?",
        rot: ["Metas coerentes com o orçamento", "Indicadores com fórmula e fonte", "Projetos capazes de modificar resultados", "Responsáveis definidos pelo nome", "Prazos compatíveis com os recursos", "Hipóteses e pendências identificadas"], obr: 0,
        cols: [{ k: "st", l: "Situação", tipo: "sel", op: ["", "Sim", "Não", "Pendente"] }, { k: "obs", l: "Observação", ph: "" }] } ] },

  projetos: { dia: "dia2", nome: "PROJETOS 2027", curto: "Projetos", quando: "Objetivos, KPIs e Projetos",
    obj: "Dar a cada prioridade um projeto com dono, entregável e prazo", saida: "Portfólio: prioridade → projeto → entregável → responsável → prazo + dependências",
    usa: ["prioridades", "kpis", "pessoas", "viabilidade"],
    grupos: [{ t: "Insumos", ajuda: "Não existe projeto de ninguém. Existe projeto com dono.", campos: [A("restr", "Restrições", "Caixa, tempo, pessoas, fábrica"), A("pessoas", "Pessoas disponíveis", "Quem pode tocar projetos"), T("prazos", "Prazos importantes", "Ex.: coleção de inverno em março")] }],
    pre: x => { const r = {}, o = x.oo("prioridades"); for (let i = 0; i < 5; i++) if (o[`p${i}_p`]) r[`pj${i}_pri`] = o[`p${i}_p`]; return r; },
    calc: x => {
      const L = [];
      for (let i = 0; i < 5; i++) { const nome = x.o[`pj${i}_nome`], pri = x.o[`pj${i}_pri`]; if (!nome && !pri) continue;
        if (!nome) { L.push({ l: `Prioridade: ${pri}`, v: "Sem projeto. Toda prioridade precisa de uma iniciativa concreta.", st: "err" }); continue; }
        const f = [!x.o[`pj${i}_ent`] && "entregável verificável", !x.o[`pj${i}_resp`] && "responsável nominal", !x.o[`pj${i}_prazo`] && "prazo"].filter(Boolean);
        L.push({ l: nome, v: f.length ? `Falta ${f.join(", ")}. Projeto sem responsável e prazo é apenas intenção.` : "Com entregável, dono e prazo.", st: f.length ? "warn" : "ok" }); }
      return L; },
    out: [
      { b: "pj", tipo: "linhas", t: "Projetos transformam estratégia em resultado (um projeto principal por prioridade)", n: 5, obr: 2, req: "nome",
        cols: [{ k: "pri", l: "Prioridade", ph: "Vem do PRIORIDADES 2027" }, { k: "nome", l: "Projeto", ph: "O que faremos para alcançar?" }, { k: "ent", l: "Entregável verificável", ph: "O que fica pronto" },
          { k: "resp", l: "Responsável", ph: "Um nome" }, { k: "prazo", l: "Prazo", ph: "Data" }, { k: "dep", l: "Dependências", ph: "Do que depende" }] } ] },

  noventa: { dia: "dia2", nome: "90 DIAS", curto: "Plano 90 dias", quando: "Plano 30/60/90 dias + primeiros 7 dias",
    obj: "Transformar até 3 projetos em marcos de 30, 60 e 90 dias e definir a primeira semana", saida: "Marcos 30/60/90 por projeto + primeiros 7 dias + checagem final",
    usa: ["projetos", "kpis", "pessoas"],
    grupos: [{ t: "Insumos", ajuda: "Não transforme projetos em listas infinitas de tarefas: cada etapa deve produzir uma entrega verificável.", campos: [A("equipe", "Equipe disponível", "Quem vai executar"), A("agenda", "Restrições de agenda", "Ex.: dezembro de alta produção; férias coletivas em janeiro")] }],
    pre: x => { const r = {}, pj = x.oo("projetos"), kp = x.oo("kpis"); let j = 0;
      for (let i = 0; i < 5 && j < 3; i++) { if (!pj[`pj${i}_nome`]) continue; r[`pjn${j}_nome`] = pj[`pj${i}_nome`]; if (pj[`pj${i}_resp`]) r[`pjn${j}_resp`] = pj[`pj${i}_resp`];
        const ki = [0, 1, 2, 3, 4].find(q => kp[`k${q}_pri`] && kp[`k${q}_pri`] === pj[`pj${i}_pri`] && kp[`k${q}_ind`]); if (ki !== undefined) r[`pjn${j}_kpi`] = kp[`k${ki}_ind`]; j++; }
      return r; },
    calc: x => {
      const L = [];
      [0, 1, 2].forEach(p => { const nome = x.o[`pjn${p}_nome`]; if (!nome) return;
        const f = []; [0, 1, 2].forEach(m => { if (!x.o[`m${p}${m}_m`]) f.push(`marco de ${[30, 60, 90][m]} dias`); else ["r", "p", "e"].forEach(c => { if (!x.o[`m${p}${m}_${c}`]) f.push(`${{ r: "responsável", p: "prazo", e: "evidência" }[c]} do marco de ${[30, 60, 90][m]} dias`); }); });
        L.push({ l: nome, v: f.length ? "Falta: " + f.join("; ") + "." : "Marcos com responsável, prazo e evidência.", st: f.length ? "warn" : "ok" }); });
      const s = ["a", "r", "p", "e", "reu"].filter(c => !x.o[`sete0_${c}`]);
      L.push({ l: "Primeiros 7 dias", v: s.length === 5 ? "Qual é a primeira ação que não pode ser adiada?" : s.length ? "Falta: " + s.map(c => ({ a: "primeira ação", r: "responsável", p: "prazo", e: "evidência", reu: "primeira reunião de acompanhamento" }[c])).join(", ") + "." : "Definidos.", st: s.length ? "warn" : "ok" });
      const ch = [0, 1, 2, 3].map(i => x.o[`check${i}_st`]); if (ch.some(Boolean)) L.push({ l: "Executável ou apenas ambicioso?", v: ch.every(v => v === "Sim") ? "Passou na checagem final." : "Ainda há respostas diferentes de 'Sim' na checagem final.", st: ch.every(v => v === "Sim") ? "ok" : "warn" });
      return L; },
    out: [
      { b: "pjn", tipo: "linhas", t: "Projetos do primeiro ciclo (até 3)", rot: ["Projeto 1", "Projeto 2", "Projeto 3"], obr: 1,
        cols: [{ k: "nome", l: "Projeto", ph: "Vem do PROJETOS 2027" }, { k: "kpi", l: "KPI relacionado", ph: "Vem do KPIs 2027" }, { k: "resp", l: "Responsável", ph: "Nome" }] },
      ...[0, 1, 2].map(p => ({ b: "m" + p, tipo: "linhas", t: `Marcos do projeto ${p + 1}`, tf: o => `Marcos do projeto ${p + 1}${o[`pjn${p}_nome`] ? ": " + o[`pjn${p}_nome`] : ""}`, rot: ["30 dias", "60 dias", "90 dias"], obr: p === 0 ? 3 : 0,
        cols: [{ k: "m", l: "Entrega verificável", ph: "" }, { k: "r", l: "Responsável", ph: "Nome" }, { k: "p", l: "Prazo", ph: "Data" }, { k: "e", l: "Evidência de conclusão", ph: "Como comprovar" }] })),
      { b: "sete", tipo: "linhas", t: "Primeiros 7 dias: qual é a primeira ação que não pode ser adiada?", rot: ["Compromisso inicial"], obr: 1,
        cols: [{ k: "a", l: "Primeira ação", ph: "" }, { k: "r", l: "Responsável", ph: "Nome" }, { k: "p", l: "Prazo", ph: "Data" }, { k: "e", l: "Evidência de conclusão", ph: "" }, { k: "reu", l: "Primeira reunião de acompanhamento", ph: "Data e quem participa" }] },
      { b: "check", tipo: "linhas", t: "Checagem final: seu plano é executável ou apenas ambicioso?", rot: ["Existe capacidade para executar?", "Existem responsáveis definidos?", "Os prazos são possíveis?", "As ações contribuem para as metas de 2027?"], obr: 4,
        cols: [{ k: "st", l: "Resposta", tipo: "sel", op: SNN }, { k: "obs", l: "Observação", ph: "" }] } ] },

  auditar: { dia: "dia2", nome: "AUDITAR MEU PLANO", curto: "Auditoria", quando: "Auditoria de IA / Teste de estresse",
    obj: "Testar fragilidades do Plano 2027", saida: "Teste de estresse + correções aceitas + riscos restantes",
    usa: ["prioridades", "orcamento", "financeiro", "viabilidade", "kpis", "projetos", "noventa", "pessoas"],
    grupos: [{ t: "O que mais preocupa", campos: [A("caixa", "Caixa e capital de giro", "O crescimento cabe no caixa?"), A("cap", "Capacidade da fábrica", "A fábrica consegue entregar o orçamento?"), A("outros", "Outras preocupações", "")] }],
    out: [
      { b: "f", tipo: "linhas", t: "Teste de estresse: modos de falha", n: 5, obr: 3,
        cols: [{ k: "m", l: "Modo de falha", ph: "Como o plano pode falhar" }, { k: "g", l: "Gravidade", tipo: "sel", op: GRAV }, { k: "e", l: "Evidência", ph: "" }, { k: "a", l: "Ação preventiva", ph: "" },
          { k: "s", l: "Situação", tipo: "sel", op: ["", "Correção aceita", "Risco mantido"] }] } ] },

  onepage: { dia: "dia2", nome: "ONE PAGE 2027", curto: "One Page", quando: "One Page Strategic Plan 2027",
    obj: "Sintetizar estratégia confirmada em uma página", saida: "One Page Strategic Plan 2027 + compromisso", onepage: true,
    usa: ["iniciar", "produto", "prioridades", "orcamento", "financeiro", "viabilidade", "kpis", "projetos", "noventa", "auditar", "painel"],
    grupos: [
      { t: "Visão", campos: [A("visao", "Onde queremos chegar em 31/12/2027", "")] },
      { t: "Os cinco números de 2027", unico: true, dois: true, campos: [1, 2, 3, 4, 5].map(n => T("n" + n, "Número " + n, n === 1 ? "Ex.: faturamento R$ 6 mi" : n === 2 ? "Ex.: margem líquida 10%" : "")) } ],
    pre: x => { const r = {}, ini = x.oo("iniciar"), pr = x.oo("prioridades"), kp = x.oo("kpis"), pj = x.oo("projetos"), nv = x.oo("noventa"), au = x.oo("auditar"), pd = x.oo("produto");
      r.visao = ini.visao || ""; for (let i = 0; i < 5; i++) { r[`num${i}_v`] = ini[`num${i}_v`] || ""; r[`pri${i}_v`] = pr[`p${i}_p`] || ""; }
      for (let i = 0; i < 4; i++) { r[`kpi${i}_o`] = kp[`k${i}_obj`] || ""; r[`kpi${i}_m`] = kp[`k${i}_meta`] || ""; r[`kpi${i}_k`] = kp[`k${i}_ind`] || ""; r[`pj${i}_p`] = pj[`pj${i}_nome`] || ""; r[`pj${i}_r`] = pj[`pj${i}_resp`] || ""; r[`pj${i}_z`] = pj[`pj${i}_prazo`] || ""; }
      r.ex0_v = nv.sete0_a || ""; r.ex1_v = nv.m00_m || ""; r.ex2_v = nv.m01_m || ""; r.ex3_v = nv.m02_m || "";
      const alto = [0, 1, 2, 3, 4].find(i => au[`f${i}_g`] === "Alta" && au[`f${i}_m`]); r.risco = alto !== undefined ? au[`f${alto}_m`] : (au.f0_m || "");
      r.marca0_v = pd.posp || ""; r.marca1_v = pd.conc || ""; r.marca2_v = [0, 1, 2].map(i => pd[`lin${i}_dec`] ? `${String(x.of("produto")?.g?.[1]?.[i]?.c?.nome?.v || "Linha " + (i + 1)).trim()}: ${pd[`lin${i}_dec`]}` : "").filter(Boolean).join("; ");
      return r; },
    out: [
      { b: "visao", tipo: "campo", l: "Visão de futuro", ph: "Onde queremos chegar em 31/12/2027", obr: true },
      { b: "num", tipo: "linhas", t: "Os cinco números de 2027", n: 5, obr: 3, cols: [{ k: "v", l: "Meta", ph: "" }] },
      { b: "pri", tipo: "linhas", t: "Prioridades estratégicas", n: 5, obr: 3, cols: [{ k: "v", l: "Prioridade", ph: "" }] },
      { b: "marca", tipo: "linhas", t: "Marca e produto", rot: ["Posicionamento prioritário", "Direção de produto", "Decisão de portfólio"], obr: 0, cols: [{ k: "v", l: "Registro", ph: "" }] },
      { b: "kpi", tipo: "linhas", t: "Metas e indicadores", n: 4, obr: 1, cols: [{ k: "o", l: "Objetivo", ph: "" }, { k: "m", l: "Meta", ph: "" }, { k: "k", l: "KPI", ph: "" }] },
      { b: "pj", tipo: "linhas", t: "Projetos estratégicos", n: 4, obr: 1, cols: [{ k: "p", l: "Projeto", ph: "" }, { k: "r", l: "Responsável", ph: "" }, { k: "z", l: "Prazo", ph: "" }] },
      { b: "ex", tipo: "linhas", t: "Execução", rot: ["7 dias", "30 dias", "60 dias", "90 dias"], obr: 1, cols: [{ k: "v", l: "O que estará feito", ph: "" }] },
      { b: "risco", tipo: "campo", l: "Maior risco", ph: "", obr: true },
      { b: "comp", tipo: "campo", l: "Compromisso do dono", ph: "O que eu, dono, me comprometo a fazer", obr: true } ] },

  compromisso: { dia: "dia2", nome: "COMPROMISSO 360", curto: "Compromisso", quando: "Encerramento · Compromisso 360°", card: true,
    obj: "Transformar o Plano 2027 em uma decisão assumida para os próximos 7 dias", saida: "Card ESCREVA. ASSUMA. EXECUTE. com a decisão, os próximos 7 dias e o responsável",
    usa: ["prioridades", "onepage", "noventa"],
    grupos: [{ t: "Antes de escrever", ajuda: "Você não veio até aqui apenas para aprender. Veio para decidir o futuro da sua confecção.", campos: [A("pesa", "O que mais pesa na sua decisão?", "Opcional: o que você está considerando")] }],
    calc: x => {
      const L = [], pr = x.oo("prioridades"), op = x.oo("onepage"), nv = x.oo("noventa");
      const p1 = [0, 1, 2, 3, 4].map(i => ({ p: pr[`p${i}_p`], o: +pr[`p${i}_o`] || 9 + i })).filter(a => a.p).sort((a, b) => a.o - b.o)[0];
      if (p1) L.push({ l: "Sugestão · prioridade nº 1 (PRIORIDADES 2027)", v: p1.p, st: "info" });
      if (nv.sete0_a) L.push({ l: "Sugestão · primeira ação (90 DIAS)", v: `${nv.sete0_a}${nv.sete0_r ? " · " + nv.sete0_r : ""}${nv.sete0_p ? " · " + nv.sete0_p : ""}`, st: "info" });
      if (op.comp) L.push({ l: "Compromisso do One Page", v: op.comp, st: "info" });
      L.push({ l: "O resultado de 2027 começa nas decisões de agora", v: "1. Decidir com números · 2. Executar com responsabilidade · 3. Acompanhar com disciplina · 4. Corrigir com agilidade", st: "ok" });
      return L; },
    out: [
      { b: "dec", tipo: "campo", l: "01 · Qual é a decisão mais importante do seu Plano 2027?", ph: "", obr: true },
      { b: "sete", tipo: "campo", l: "02 · O que precisa acontecer nos próximos 7 dias?", ph: "", obr: true },
      { b: "resp", tipo: "campo", l: "03 · Quem será responsável por iniciar essa mudança?", ph: "Nome", obr: true } ] },
};

export const DIAS_FER = {
  dia1: { nome: "1º dia", data: "Quinta, 19/11", local: "Aporta Hall", ordem: ["iniciar", "diag", "prod", "produto", "vendas", "oficina", "painel"] },
  dia2: { nome: "2º dia", data: "Sexta, 20/11", local: "Aporta Hall", ordem: ["pessoas", "financeiro", "swot", "prioridades", "orcamento", "viabilidade", "kpis", "projetos", "noventa", "auditar", "onepage", "compromisso"] },
};
export const tipoDia = d => d === "dia2" ? "fer_dia2" : "fer_dia1";

// Trilha "do conhecimento à execução" (7 etapas do Plano 2027)
export const TRILHA = [
  { t: "Visão 2027", k: ["iniciar"], fase: "Conhecimento" }, { t: "Diagnóstico 360°", k: ["diag"], fase: "Conhecimento" }, { t: "SWOT priorizada", k: ["swot"], fase: "Conhecimento" },
  { t: "3–5 prioridades", k: ["prioridades"], fase: "Decisão" }, { t: "Orçamento e resultado", k: ["orcamento", "financeiro", "viabilidade"], fase: "Decisão" },
  { t: "Metas e projetos", k: ["kpis", "projetos"], fase: "Decisão" }, { t: "Execução 7/30/60/90", k: ["noventa"], fase: "Execução" } ];
/** fer: dados de fer_dia1 + fer_dia2 juntos ({k: dados}) → [{t, fase, st}] */
export function trilha(fer) {
  const toc = d => !!d && (Object.values(d.out || {}).some(v => String(v || "").trim()) || Object.values(d.g || {}).some(l => (l || []).some(n => Object.values(n.c || {}).some(c => String(c?.v || "").trim()))));
  return TRILHA.map(e => { const ds = e.k.map(k => fer?.[k]); return { ...e, st: ds.every(d => d?.ok) ? "feito" : ds.some(toc) ? "andamento" : "falta" }; });
}

// Rótulos das linhas de um bloco
export function rotulos(F, bl, dados) {
  if (bl.rot) return bl.rot;
  return [...Array(bl.n).keys()].map(i => {
    if (bl.rotIn) { const v = String(dados?.g?.[bl.rotIn.g]?.[i]?.c?.[bl.rotIn.c]?.v || "").trim(); return v || `Linha ${i + 1}`; }
    return `${i + 1}`;
  });
}

// Registro de saída em texto (para alimentar as ferramentas seguintes)
export function registroTexto(k, dados) {
  const F = FER[k]; if (!F || !dados) return "";
  const o = dados.out || {}, t = x => String(x || "").trim(), linhas = [];
  F.out.forEach(bl => {
    if (bl.tipo === "campo") { if (t(o[bl.b])) linhas.push(`${bl.l}: ${t(o[bl.b])}`); return; }
    const rot = rotulos(F, bl, dados), itens = [];
    rot.forEach((r, i) => {
      const cel = bl.cols.map(c => [c.l, t(o[`${bl.b}${i}_${c.k}`])]).filter(x => x[1]);
      if (!cel.length) return;
      let extra = "";
      if (bl.calc) { const q = numero(o[`${bl.b}${i}_q`]), p = numero(o[`${bl.b}${i}_pr`]); if (q > 0 && p > 0) extra = ` | Receita: R$ ${Math.round(q * p).toLocaleString("pt-BR")}`; }
      itens.push(`- ${bl.rot || bl.rotIn ? r + ": " : ""}${cel.map(([l, v]) => bl.cols.length > 1 ? `${l}: ${v}` : v).join(" | ")}${extra}`);
    });
    if (itens.length) linhas.push(`${bl.tf ? bl.tf(o) : bl.t}:\n${itens.join("\n")}`);
  });
  return linhas.join("\n");
}

export function pronto(k, dados) {
  const F = FER[k], o = dados.out || {}, t = x => String(x || "").trim();
  return F.out.every(bl => {
    if (bl.tipo === "campo") return !bl.obr || t(o[bl.b]);
    const n = (bl.rot || []).length || bl.n, c0 = bl.req || bl.cols[0].k;
    let ok = 0; for (let i = 0; i < n; i++) if (t(o[`${bl.b}${i}_${c0}`])) ok++;
    return ok >= (bl.obr || 0);
  });
}
export function faltaTexto(k) {
  const F = FER[k];
  const p = F.out.filter(bl => bl.obr).map(bl => bl.tipo === "campo" ? bl.l.replace(/^\d+ · /, "").toLowerCase() : `${bl.obr === ((bl.rot || []).length || bl.n) ? "todas as linhas de" : "pelo menos " + bl.obr + (bl.obr > 1 ? " linhas de" : " linha de")} "${bl.t}"`);
  return "Para concluir, preencha: " + p.join("; ") + ".";
}

// ---------- contas automáticas e preenchimento a partir de outras ferramentas ----------
const vNotas = (dados, key) => { for (const l of Object.values(dados?.g || {})) for (const n of (l || [])) { const v = String(n?.c?.[key]?.v ?? "").trim(); if (v) return v; } return ""; };
const fNotas = (dados, key) => { for (const l of Object.values(dados?.g || {})) for (const n of (l || [])) { const c = n?.c?.[key]; if (String(c?.v ?? "").trim() || c?.f) return c?.f || ""; } return ""; };
/** get(k) → dados de outra ferramenta (qualquer dia) */
export function contexto(k, dados, get) {
  const v = key => vNotas(dados, key);
  return { D: dados, o: dados?.out || {}, v, n: key => numero(v(key)), m: key => moeda(v(key)), f: key => fNotas(dados, key),
    of: kk => get(kk) || {}, vo: (kk, key) => vNotas(get(kk), key), oo: kk => get(kk)?.out || {} };
}
export function calcular(k, dados, get) { const F = FER[k]; if (!F?.calc) return []; try { return F.calc(contexto(k, dados, get)) || []; } catch (e) { console.warn("calc", k, e); return []; } }
export function calcTexto(k, dados, get) {
  const L = calcular(k, dados, get).filter(i => i.v);
  return L.length ? "CONTAS E CHECAGENS FEITAS PELA FERRAMENTA (fórmulas aplicadas aos dados informados; trate como cálculo, não como dado novo)\n" + L.map(i => `- ${i.l}: ${i.v}`).join("\n") : "";
}
/** Preenche campos vazios com o que já foi registrado em outras ferramentas. Retorna true se mudou algo. */
export function preencher(k, dados, get, por) {
  const F = FER[k]; if (!F) return false; let mudou = false;
  try {
    if (F.preIn) { const m = F.preIn(contexto(k, dados, get)) || {};
      Object.entries(m).forEach(([key, val]) => { val = String(val ?? "").trim(); if (!val) return;
        const gi = F.grupos.findIndex(g => g.campos.some(c => c.k === key)); if (gi < 0) return;
        if (vNotas({ g: { 0: dados.g?.[gi] } }, key)) return;
        dados.g[gi] = dados.g[gi]?.length ? dados.g[gi] : [novaNota(por)];
        const n = dados.g[gi][0]; n.c = n.c || {}; n.c[key] = { v: val, f: "H" }; mudou = true; }); }
    if (F.pre) { const m = F.pre(contexto(k, dados, get)) || {}; dados.out = dados.out || {};
      Object.entries(m).forEach(([key, val]) => { val = String(val ?? "").trim(); if (val && !String(dados.out[key] ?? "").trim()) { dados.out[key] = val; mudou = true; } }); }
  } catch (e) { console.warn("pre", k, e); }
  return mudou;
}

// ---------- anotações (várias por tema) ----------
export const novoId = () => Math.random().toString(36).slice(2, 10);
export function novaNota(por) { return { id: novoId(), t: "", c: {}, ts: new Date().toISOString(), por: por || "" }; }
// Converte o formato antigo (um campo por tema em dados.in) para listas de anotações em dados.g
export function migrar(k, dados, por) {
  const F = FER[k]; if (!F) return dados;
  dados.g = dados.g || {};
  const inn = dados.in || {};
  F.grupos.forEach((g, gi) => {
    if (Array.isArray(dados.g[gi]) && dados.g[gi].length) return;
    const lista = [];
    if (k === "produto" && gi === 1) {
      [1, 2, 3].forEach(n => { const c = {}; ["nome", "cli", "preco", "vol", "marg", "ped"].forEach(f => { const v = inn[`l${n}_${f}`]; if (v && String(v.v || "").trim()) c[f] = v; });
        if (Object.keys(c).length) lista.push({ ...novaNota(por), c }); });
    } else {
      const c = {}; g.campos.forEach(f => { const v = inn[f.k]; if (v && String(v.v || "").trim()) c[f.k] = v; });
      if (Object.keys(c).length) lista.push({ ...novaNota(por), c });
    }
    dados.g[gi] = lista.length ? lista : [novaNota(por)];
  });
  // campos que mudaram de tema: move para o tema certo
  const dono = {}; F.grupos.forEach((g, gi) => g.campos.forEach(c => dono[c.k] = gi));
  Object.keys(dados.g).forEach(gi => (dados.g[gi] || []).forEach(n => Object.keys(n.c || {}).forEach(ck => {
    const alvo = dono[ck]; if (alvo === undefined || alvo === +gi) return;
    const destino = dados.g[alvo][0]; if (!String(destino.c?.[ck]?.v || "").trim()) { destino.c[ck] = n.c[ck]; destino.ts = destino.ts || n.ts; destino.por = destino.por || n.por; }
    delete n.c[ck];
  })));
  // temas que viraram "único": junta numa anotação só
  F.grupos.forEach((g, gi) => { if (g.unico && dados.g[gi].length > 1) { const base = dados.g[gi][0]; dados.g[gi].slice(1).forEach(n => Object.entries(n.c || {}).forEach(([ck, v]) => { if (!String(base.c?.[ck]?.v || "").trim()) base.c[ck] = v; })); dados.g[gi] = [base]; } });
  Object.keys(dados.g).forEach(gi => { if (+gi >= F.grupos.length) delete dados.g[gi]; });
  return dados;
}
// Anotações de um tema em texto (para a IA)
export function notasTexto(F, gi, lista, opts = {}) {
  const g = F.grupos[gi], tag = f => f ? `[${f}]` : "", t = x => String(x || "").trim();
  const vazias = n => !t(n.t) && g.campos.every(c => !t(n.c?.[c.k]?.v));
  const uteis = (lista || []).filter(n => !vazias(n));
  if (!uteis.length) return opts.pularVazio ? "" : g.campos.map(c => `- ${c.l}: [P] não informado`).join("\n");
  return uteis.map((n, i) => {
    const cab = uteis.length > 1 || t(n.t) || opts.autor ? `Anotação ${i + 1}${t(n.t) ? " — " + t(n.t) : ""}${opts.autor && n.por ? ` (por ${n.por}${n.ts ? ", " + new Date(n.ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""})` : ""}\n` : "";
    return cab + g.campos.map(c => { const v = n.c?.[c.k] || {}; const tx = t(v.v);
      if (!tx) return `- ${c.l}: [P] não informado`;
      const val = c.tipo === "sel" && c.opl ? (c.opl[tx] ?? tx) : tx;
      return `- ${c.l}: ${c.f ? (tag(v.f) || "[H]") + " " : ""}${val}`; }).join("\n");
  }).join("\n");
}
