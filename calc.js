// Motor de cálculo do Planejamento 2027 — Têxtil Club
// Reproduz a lógica das planilhas (Simples Nacional e Lucro Presumido), cenário Base.
(function (root) {
  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  const GRUPOS = [
    { id:"producao", nome:"Produção", icon:"🧵", dica:"Custos da fábrica que existem mesmo nos meses fracos.", itens:[
      ["mod","Mão de obra direta (salários da produção)"],["insumos","Insumos de produção (linhas, agulhas, embalagens)"],
      ["modelagem","Modelagem"],["outros_custos","Outros custos de produção"]]},
    { id:"comercial", nome:"Comercial e vendas", icon:"🤝", dica:"Tudo o que você gasta para vender, que não depende do valor vendido.", itens:[
      ["folha_vendas","Salários da equipe de vendas"],["pj_comercial","Prestadores PJ comerciais"],["software_comercial","Sistemas / software comercial"],
      ["diarias","Diárias comerciais"],["vt_comercial","Vale-transporte / combustível comercial"],["viagens","Viagens, estadias, alimentação e pedágios"]]},
    { id:"marketing", nome:"Marketing", icon:"📣", dica:"Divulgação da marca e geração de clientes.", itens:[
      ["trafego","Tráfego pago (anúncios)"],["publicidade","Serviços de marketing e publicidade"],["pj_marketing","Prestadores PJ de marketing"],
      ["feiras","Feiras e eventos"],["bonificacao","Bonificações e brindes"],["site","Site"],["marcas","Marcas e patentes"]]},
    { id:"infra", nome:"Estrutura", icon:"🏭", dica:"O custo de manter o espaço funcionando.", itens:[
      ["aluguel","Aluguel do imóvel"],["energia","Energia elétrica"],["agua","Água e esgoto"],["iptu","IPTU"],
      ["manutencao","Manutenção e conservação"],["reforma","Manutenção predial / reforma"],["seguro","Seguro predial"]]},
    { id:"pessoal", nome:"Pessoas", icon:"👥", dica:"Retirada dos sócios e benefícios da equipe.", itens:[
      ["prolabore","Pró-labore dos sócios"],["desp_func","Despesas com funcionários"],["lanche","Lanche / alimentação"],["cursos","Cursos e treinamentos"]]},
    { id:"admin", nome:"Administrativo", icon:"🗂️", dica:"Despesas do escritório.", itens:[
      ["contabil","Contabilidade"],["manut_maquinas","Manutenção de máquinas"],["limpeza","Materiais de limpeza"],["papelaria","Papelaria e escritório"]]},
    { id:"ti", nome:"Tecnologia e telefone", icon:"💻", dica:"Internet, telefones e sistemas.", itens:[
      ["internet","Telefone fixo e internet"],["celular","Telefone celular"],["provedores","Provedores e hospedagens"],["manut_comp","Manutenção de computadores"]]},
    { id:"tributarias", nome:"Taxas", icon:"🧾", dica:"Taxas fixas (não inclua impostos sobre venda aqui).", itens:[
      ["taxas_licencas","Taxas e licenças"],["taxas_estaduais","Taxas estaduais"],["taxas_municipais","Taxas municipais"]]},
    { id:"financeiras", nome:"Banco e financeiro", icon:"🏦", dica:"Juros e tarifas bancárias.", itens:[
      ["juros","Juros de empréstimos"],["juros_antecipacao","Juros de antecipação de cartão"],["aluguel_maquininha","Aluguel de maquininha"],
      ["tarifa_pix","Tarifas DOC / TED / PIX"],["tarifa_conta","Tarifa da conta corrente"],["cartao_debito","Taxas de cartão de débito"]]},
    { id:"depreciacao", nome:"Desgaste das máquinas", icon:"⚙️", dica:"Depreciação: não sai do caixa todo mês, mas é custo real. Se não souber, peça ao contador.", itens:[
      ["depreciacao","Depreciação de máquinas e equipamentos"]]},
  ];

  const PRESUMIDO_PADRAO = { pis:0.65, cofins:3, icms:19, icms_credito:12, irpj_presuncao:8, irpj_aliq:15, irpj_adicional:10,
    irpj_limite:20000, csll_presuncao:12, csll_aliq:9, encargos_folha:27.8, inss_prolabore:20 };

  function novo() {
    const fixos = {}; GRUPOS.forEach(g => g.itens.forEach(([k]) => fixos[k] = null));
    return {
      regime: null,
      operacao: { capacidade:null, dias_uteis:21, pecas_cliente:null },
      produtos: [ { nome:"", linha:"", qtd:null, preco:null, custo_mp:null, custo_terc:null } ],
      sazonalidade: [1,1,1,1,1,1,1,1,1,1,1,1],
      percentuais: { simples:null, comissoes:0, fretes:0, cartao:0, descontos:0, devolucoes:0 },
      presumido: { ...PRESUMIDO_PADRAO },
      fixos, fixos_extra: [], rendimentos: 0,
      caixa: { vista:100, d30:0, d60:0, prazo_mp:0, saldo_inicial:null, receber_jan:0, receber_fev:0, pagar_jan:0, reserva:null, distribuicao:0 },
      etapa: 0, concluido: false
    };
  }

  const n = v => (typeof v === "number" && isFinite(v)) ? v : (parseFloat(v) || 0);
  const pct = v => n(v) / 100;

  function calcular(d, fat = { vol:1, preco:1, mp:1 }) {
    const P = d.percentuais || {}, T = d.presumido || PRESUMIDO_PADRAO, C = d.caixa || {};
    const presumido = d.regime === "presumido";
    const prods = (d.produtos || []).filter(p => n(p.qtd) > 0 || n(p.preco) > 0);
    const fixoBase = Object.values(d.fixos || {}).reduce((s, v) => s + n(v), 0)
                   + (d.fixos_extra || []).reduce((s, x) => s + n(x.valor), 0);
    const enc = presumido
      ? n(d.fixos?.mod) * pct(T.encargos_folha) + n(d.fixos?.folha_vendas) * pct(T.encargos_folha) + n(d.fixos?.prolabore) * pct(T.inss_prolabore)
      : 0;
    const fixoMes = fixoBase + enc - n(d.rendimentos);
    const depMes = n(d.fixos?.depreciacao);

    const m = MESES.map((nome, i) => {
      const s = n(d.sazonalidade?.[i] ?? 1);
      let pecas = 0, receita = 0, mp = 0, terc = 0;
      const porProd = prods.map(p => {
        const q = Math.round(n(p.qtd) * s * fat.vol);
        const r = q * n(p.preco) * fat.preco, cmp = q * n(p.custo_mp) * fat.mp, ct = q * n(p.custo_terc);
        pecas += q; receita += r; mp += cmp; terc += ct;
        return { q, r, custo: cmp + ct };
      });
      const deducoes = receita * (pct(P.descontos) + pct(P.devolucoes));
      let impostos, irpjcsll = 0;
      if (presumido) {
        const icms = receita * pct(T.icms);
        const pis = (receita - icms) * pct(T.pis), cofins = (receita - icms) * pct(T.cofins);
        impostos = pis + cofins + icms - mp * pct(T.icms_credito);
        const baseIR = receita * pct(T.irpj_presuncao);
        irpjcsll = baseIR * pct(T.irpj_aliq) + Math.max(0, baseIR - n(T.irpj_limite)) * pct(T.irpj_adicional)
                 + receita * pct(T.csll_presuncao) * pct(T.csll_aliq);
      } else {
        impostos = receita * pct(P.simples);
      }
      const comerciais = receita * (pct(P.comissoes) + pct(P.fretes) + pct(P.cartao));
      const variaveis = deducoes + impostos + mp + terc + comerciais + irpjcsll;
      const mc = receita - variaveis;
      const resultado = mc - fixoMes;
      return { nome, pecas, receita, mp, terc, deducoes, impostos, irpjcsll, comerciais, variaveis, mc, fixos: fixoMes, resultado, porProd };
    });

    const soma = k => m.reduce((s, x) => s + x[k], 0);
    const receita = soma("receita"), variaveis = soma("variaveis"), mc = soma("mc"), fixos = soma("fixos"), resultado = soma("resultado"), pecas = soma("pecas");
    const mcPct = receita ? mc / receita : 0;
    const pe = mcPct > 0 ? fixos / mcPct : 0;
    const ticket = pecas ? receita / pecas : 0;

    // Caixa (estimativa simplificada)
    let saldo = n(C.saldo_inicial); const caixa = [];
    const vista = pct(C.vista), d30 = pct(C.d30), d60 = pct(C.d60), lagMP = Math.max(0, Math.min(2, Math.round(n(C.prazo_mp))));
    m.forEach((x, i) => {
      const liq = k => (m[k] ? m[k].receita - m[k].deducoes : 0);
      let ent = liq(i) * vista + (i >= 1 ? liq(i-1) * d30 : 0) + (i >= 2 ? liq(i-2) * d60 : 0);
      if (i === 0) ent += n(C.receber_jan); if (i === 1) ent += n(C.receber_fev);
      const mpPago = i - lagMP >= 0 ? m[i - lagMP].mp + m[i - lagMP].terc : 0;
      const impPago = i >= 1 ? m[i-1].impostos + m[i-1].irpjcsll : 0;
      let sai = mpPago + impPago + x.comerciais + (x.fixos - depMes);
      if (i === 0) sai += n(C.pagar_jan);
      saldo += ent - sai;
      caixa.push({ nome: x.nome, entradas: ent, saidas: sai, saldo });
    });
    const menor = caixa.reduce((a, b) => b.saldo < a.saldo ? b : a, caixa[0]);

    const produtos = prods.map((p, j) => {
      const r = m.reduce((s, x) => s + x.porProd[j].r, 0), c = m.reduce((s, x) => s + x.porProd[j].custo, 0);
      const unit = n(p.preco) - n(p.custo_mp) - n(p.custo_terc);
      return { nome: p.nome || "Produto " + (j+1), receita: r, custo: c, margem: r - c, margemPct: r ? (r - c) / r : 0, unit, unitPct: n(p.preco) ? unit / n(p.preco) : 0 };
    }).sort((a, b) => b.margem - a.margem);

    const cap = n(d.operacao?.capacidade);
    const pecasMes = pecas / 12;
    return {
      meses: m, caixa, produtos,
      receita, variaveis, mc, mcPct, fixos, fixoMes, resultado, margem: receita ? resultado / receita : 0,
      pe, peMes: pe / 12, pePecasMes: ticket ? pe / ticket / 12 : 0, ticket, pecas, pecasMes,
      capacidade: cap, utilizacao: cap ? pecasMes / cap : 0,
      mesesPrejuizo: m.filter(x => x.resultado < 0).length,
      menorSaldo: menor ? menor.saldo : 0, mesMenorSaldo: menor ? menor.nome : "", saldoDez: caixa.length ? caixa[11].saldo : 0,
      reserva: n(C.reserva), distribuicao: resultado > 0 ? resultado * pct(C.distribuicao) : 0,
      recebSoma: n(C.vista) + n(C.d30) + n(C.d60)
    };
  }

  function cenarios(d) {
    return {
      pessimista: calcular(d, { vol:0.85, preco:0.97, mp:1.08 }),
      base: calcular(d),
      otimista: calcular(d, { vol:1.10, preco:1.03, mp:0.97 })
    };
  }

  function alertas(r) {
    const a = [], brl = v => "R$ " + Math.round(v).toLocaleString("pt-BR");
    if (r.receita <= 0) return a;
    if (r.utilizacao > 1) a.push(["err", `As vendas planejadas (${Math.round(r.pecasMes).toLocaleString("pt-BR")} peças/mês) passam da sua capacidade (${Math.round(r.capacidade).toLocaleString("pt-BR")}). Vai precisar terceirizar ou aumentar a produção.`]);
    if (r.resultado < 0) a.push(["err", `O plano fecha o ano com prejuízo de ${brl(-r.resultado)}. Resultado negativo em ${r.mesesPrejuizo} ${r.mesesPrejuizo === 1 ? "mês" : "meses"}.`]);
    else if (r.mesesPrejuizo > 0) a.push(["warn", `O ano fecha positivo, mas ${r.mesesPrejuizo} ${r.mesesPrejuizo === 1 ? "mês fica" : "meses ficam"} no prejuízo. Atenção aos meses fracos.`]);
    if (r.pe > r.receita) a.push(["err", `Para empatar você precisa vender ${brl(r.peMes)} por mês, ${Math.round((r.pe / r.receita - 1) * 100)}% acima do planejado.`]);
    if (r.menorSaldo < 0) a.push(["err", `O caixa fica negativo em ${r.mesMenorSaldo} (${brl(r.menorSaldo)}). Planeje aporte, crédito ou renegocie prazos.`]);
    else if (r.reserva && r.menorSaldo < r.reserva) a.push(["warn", `Em ${r.mesMenorSaldo} o caixa fica abaixo da reserva mínima que você definiu (${brl(r.reserva)}).`]);
    if (Math.round(r.recebSoma) !== 100) a.push(["warn", `Os prazos de recebimento somam ${r.recebSoma}%. O correto é somar 100%.`]);
    if (!a.length) a.push(["ok", "Nenhum alerta: o plano fecha positivo, com caixa saudável e dentro da capacidade."]);
    return a;
  }

  root.TC_CALC = { MESES, GRUPOS, PRESUMIDO_PADRAO, novo, calcular, cenarios, alertas };
  if (typeof module !== "undefined") module.exports = root.TC_CALC;
})(typeof window !== "undefined" ? window : globalThis);
