// Definição das ferramentas 360° (entradas e registro de saída). Os prompts ficam na Edge Function agente-360.
const PILARES = [["producao","Produção"],["vendas","Vendas"],["marca","Marca/Produto"],["fin","Gestão/Financeiro"],["pessoas","Liderança/Pessoas"],["estrat","Estratégia"]];
const NOTAS = ["", ...[...Array(11).keys()].map(String)];
const STATUS = ["", "Confirmada", "Hipótese", "Informação pendente"];
const ANALISE = ["", "Em análise", "Confirmada"];
const GRAV = ["", "Alta", "Média", "Baixa"];
const A = (k, l, ph, f = true) => ({ k, l, tipo: "area", ph, f });
const T = (k, l, ph, f = true) => ({ k, l, tipo: "text", ph, f });

export const FER = {
  // ======================= QUINTA 19/11 =======================
  diag: { dia: "dia1", nome: "DIAGNÓSTICO 360", curto: "Diagnóstico", quando: "Raio-X Confecção 360°",
    obj: "Mapear maturidade e gargalo principal dos seis pilares", saida: "Quadro de seis pilares + um gargalo por pilar + pendências",
    grupos: PILARES.map(([k, t]) => ({ t, campos: [
      A(`${k}_ev`, "Evidência concreta", "O que acontece hoje, com fatos. Ex.: atrasamos 3 de cada 10 pedidos"),
      T(`${k}_ind`, "Indicador que você já acompanha", "Ex.: peças/dia, ticket médio, margem… ou 'nenhum'"),
      { k: `${k}_nota`, l: "Sua nota (0 a 10)", tipo: "sel", op: NOTAS } ] })),
    out: [
      { b: "pil", tipo: "linhas", t: "Quadro dos seis pilares", rot: PILARES.map(p => p[1]), obr: 6,
        cols: [{ k: "garg", l: "Gargalo principal", ph: "O principal gargalo deste pilar" }, { k: "nota", l: "Nota final", tipo: "sel", op: NOTAS }] },
      { b: "pend", tipo: "campo", l: "Pendências (dados que faltam levantar)", ph: "Ex.: margem por produto; capacidade real da costura" } ] },

  prod: { dia: "dia1", nome: "PRODUÇÃO 360", curto: "Produção", quando: "Oficina de Produção e Processos",
    obj: "Diagnosticar fluxo produtivo e gargalos que limitam entrega, qualidade e margem", saida: "Mapa de gargalos + top 3 + duas ações", visita: true,
    grupos: [
      { t: "Fluxo", campos: [A("etapas", "Etapas do processo", "Ex.: modelagem → corte → costura (terceirizada) → acabamento → expedição"), A("tempos", "Tempos de cada etapa", "Ex.: corte 1 dia; costura 5 dias; acabamento 2 dias")] },
      { t: "Volume e capacidade", dois: true, campos: [T("demanda", "Demanda (peças/mês)", "Quanto o comercial vende ou precisa"), T("producao", "Produção real (peças/mês)", "Quanto a fábrica entrega hoje"),
        T("capacidade", "Capacidade disponível", "Ex.: 12 costureiras, 1 turno, 8h"), T("retrabalho", "Retrabalho / defeitos", "Ex.: 5% das peças voltam")] },
      { t: "Entrega e planejamento", campos: [T("otd", "Entregas no prazo (OTD)", "Ex.: 7 de cada 10 pedidos saem no prazo"), A("ppcp", "Como planeja e controla a produção (PPCP)", "Ex.: planilha semanal; prioridade definida pelo dono no dia")] } ],
    out: [
      { b: "g", tipo: "linhas", t: "Top 3 gargalos", n: 3, obr: 3, cols: [{ k: "s", l: "Gargalo (sintoma)", ph: "O que aparece" }, { k: "c", l: "Causa provável", ph: "Por que acontece" }] },
      { b: "rapida", tipo: "campo", l: "Ação rápida", ph: "Resolve logo, com pouco recurso", obr: true },
      { b: "estrutural", tipo: "campo", l: "Ação estrutural", ph: "Muda o processo de forma duradoura", obr: true } ] },

  produto: { dia: "dia1", nome: "PRODUTO 360", curto: "Produto", quando: "Oficina de Marca e Produto",
    obj: "Avaliar posicionamento e mix de produto sob margem, demanda e capacidade", saida: "Matriz de portfólio com decisões e hipótese explícita",
    grupos: [
      { t: "Posicionamento", campos: [A("posic", "Como a sua marca se posiciona", "Para quem vende, por que escolhem você, faixa de preço")] },
      { t: "Linhas de produto", item: "linha", dois: true, campos: [
        T("nome", "Nome da linha", "Ex.: camisetas básicas, uniformes corporativos, moda fitness", false),
        T("cli", "Cliente ideal", "Quem compra"), T("preco", "Preço médio", "R$ por peça"), T("vol", "Volume (peças/mês)", "Ex.: 2.000"),
        T("marg", "Margem", "Ex.: 30% ou 'não sei'"), T("ped", "Pedidos e prazo", "Ex.: pedido mínimo 50; prazo 20 dias")] } ],
    out: [
      { b: "lin", tipo: "linhas", t: "Matriz de portfólio", n: 3, obr: 1, rotIn: { g: 1, c: "nome" },
        cols: [{ k: "dec", l: "Decisão", tipo: "sel", op: ["", "ACELERAR", "CORRIGIR", "REDUZIR", "VALIDAR"] }, { k: "ev", l: "Evidência e risco", ph: "Por que essa decisão" },
          { k: "hip", l: "Hipótese a validar", ph: "O que ainda precisa ser confirmado" }, { k: "st", l: "Status", tipo: "sel", op: ANALISE }] } ] },

  vendas: { dia: "dia1", nome: "VENDAS 360", curto: "Vendas", quando: "Vendas e Gestão Comercial + IA no comercial",
    obj: "Auditar a equação de metas comerciais sem criar metas não aprovadas", saida: "Equação comercial auditada + riscos + ajustes para validar",
    usa: ["diag", "produto"],
    grupos: [
      { t: "Meta e histórico", dois: true, campos: [T("meta", "Meta de faturamento proposta para 2027", "Ex.: R$ 6 milhões"), T("fat", "Faturamento anterior (2025/2026)", "Ex.: 2025: R$ 4,2 mi; 2026 até out: R$ 3,9 mi")] },
      { t: "Clientes", dois: true, campos: [T("clientes", "Clientes ativos", "Quantos compraram nos últimos 12 meses"), T("ticket", "Ticket médio", "R$ por pedido"),
        T("recorr", "Recorrência", "Quantas vezes por ano o cliente compra"), T("novos", "Clientes novos por mês", "Ex.: 8")] },
      { t: "Funil", dois: true, campos: [T("funil", "Orçamentos/contatos por mês", "Ex.: 60 orçamentos"), T("conv", "Conversão", "Ex.: 1 em cada 4 orçamentos fecha")] },
      { t: "Canais e equipe", campos: [A("canais", "Canais de venda", "Ex.: representantes 50%, loja própria 20%, online 30%"), A("vend", "Vendedores", "Quantos são e quanto cada um vende por mês")] } ],
    out: [
      { b: "eq", tipo: "campo", l: "Equação comercial auditada", ph: "Ex.: R$ 6 mi = 320 clientes × R$ 4.700 de ticket × 4 compras/ano", obr: true },
      { b: "r", tipo: "linhas", t: "Riscos e premissas otimistas", n: 3, obr: 1, cols: [{ k: "risco", l: "Risco ou premissa", ph: "O que pode não acontecer" }, { k: "imp", l: "Impacto", ph: "O que acontece com a meta" }] },
      { b: "aj", tipo: "linhas", t: "Ajustes para validar", n: 3, obr: 1, cols: [{ k: "aj", l: "Ajuste", ph: "O que muda na meta ou no plano" }, { k: "st", l: "Status", tipo: "sel", op: ANALISE }] } ] },

  oficina: { dia: "dia1", nome: "OFICINA 360 — ANÁLISE CRUZADA", curto: "Análise cruzada", quando: "Case 360° integrado",
    obj: "Cruzar decisões comerciais, produtivas e de portfólio na mesma empresa", saida: "Matriz cruzada: evidência / decisão inicial / pendência por pilar",
    usa: ["prod", "produto", "vendas"],
    grupos: [{ t: "Decisões em análise", campos: [A("dprod", "Produção", "A decisão que você está pensando em tomar na produção"), A("dprodu", "Produto", "A decisão que você está pensando em tomar no portfólio"), A("dvend", "Vendas", "A decisão que você está pensando em tomar no comercial")] }],
    out: [
      { b: "m", tipo: "linhas", t: "Matriz cruzada", rot: ["Produção", "Produto", "Vendas"], obr: 3,
        cols: [{ k: "ev", l: "Evidência", ph: "O que comprova" }, { k: "dec", l: "Decisão inicial", ph: "O que pretende fazer" }, { k: "pend", l: "Pendência", ph: "O que falta saber" }] },
      { b: "cf", tipo: "linhas", t: "Conflitos mais relevantes", n: 3, obr: 1, cols: [{ k: "c", l: "Conflito entre pilares", ph: "Ex.: vender mais uniforme sem capacidade na costura" }, { k: "p", l: "Pergunta de decisão", ph: "O que precisa ser decidido" }] } ] },

  painel: { dia: "dia1", nome: "PAINEL DE DECISÕES 360", curto: "Painel de decisões", quando: "Painel de Decisões do Dia 1",
    obj: "Consolidar três decisões para preparar a sexta-feira", saida: "Painel das três decisões + dados a obter na sexta",
    usa: ["oficina", "prod", "produto", "vendas"],
    grupos: [{ t: "Suas três decisões", campos: [A("dp", "Decisão de produção", "Ex.: implantar PCP semanal na costura"), A("dpr", "Decisão de produto", "Ex.: reduzir a linha fitness"), A("dv", "Decisão de vendas", "Ex.: meta por vendedor com acompanhamento semanal")] }],
    out: [
      { b: "d", tipo: "linhas", t: "Painel das três decisões", rot: ["Produção", "Produto", "Vendas"], obr: 3,
        cols: [{ k: "dec", l: "Decisão", ph: "O que foi decidido" }, { k: "ev", l: "Evidência", ph: "Por quê" }, { k: "imp", l: "Impacto", ph: "O que muda" },
          { k: "risco", l: "Risco", ph: "O que pode dar errado" }, { k: "dep", l: "Dependência", ph: "Do que depende" }, { k: "st", l: "Status", tipo: "sel", op: STATUS }] },
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

  financeiro: { dia: "dia2", nome: "FINANCEIRO 360", curto: "Financeiro", quando: "Gestão e Financeiro · Orçamento de Resultado",
    obj: "Distinguir receita, margem, lucro, caixa e financiamento do crescimento", saida: "Meta de resultado e matriz de riscos; nenhuma DRE inventada",
    usa: ["painel", "vendas"],
    grupos: [
      { t: "Resultado atual", dois: true, campos: [T("receita", "Receita (último ano fechado)", "Ex.: 2025: R$ 4,2 mi"), T("cmv", "CMV / custos variáveis", "Ex.: 48% da receita"),
        T("impostos", "Impostos sobre vendas", "Ex.: Simples 9,5%"), T("despesas", "Despesas fixas", "Ex.: R$ 120 mil/mês"), T("lucro", "Lucro do último ano", "Ex.: R$ 250 mil ou 'não sei'")] },
      { t: "Caixa e investimentos", campos: [A("dre", "DRE real (cole ou resuma)", "Se tiver a DRE, cole aqui os principais números"), T("caixa", "Caixa e capital de giro", "Ex.: R$ 300 mil em caixa; prazo médio de recebimento 45 dias"),
        A("invest", "Investimentos previstos e dívidas", "Ex.: máquina de R$ 200 mil; empréstimo de R$ 150 mil")] } ],
    out: [
      { b: "meta", tipo: "linhas", t: "Meta de resultado 2027", rot: ["Lucro-meta", "Margem-meta", "Receita necessária"], obr: 1,
        cols: [{ k: "v", l: "Valor", ph: "Valor ou 'pendente'" }, { k: "base", l: "Como chegou", ph: "Fórmula ou premissa" }] },
      { b: "risco", tipo: "linhas", t: "Matriz de riscos", n: 4, obr: 2, cols: [{ k: "r", l: "Risco", ph: "Ex.: crescer vendas sem capital de giro" }, { k: "g", l: "Gravidade", tipo: "sel", op: GRAV }, { k: "a", l: "Ação preventiva", ph: "O que fazer" }] } ] },

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
    usa: ["swot", "painel", "financeiro"],
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

  kpis: { dia: "dia2", nome: "KPIs 2027", curto: "KPIs", quando: "Objetivos, KPIs e Projetos",
    obj: "Transformar prioridades em metas acompanháveis", saida: "Matriz de objetivos, metas e KPIs",
    usa: ["prioridades", "orcamento", "financeiro"],
    grupos: [{ t: "Insumos", campos: [A("dados", "Dados que você já tem", "Onde estão os números: sistema, planilha, caderno"), A("resp", "Pessoas que podem ser responsáveis", "Nomes e funções")] }],
    out: [
      { b: "k", tipo: "linhas", t: "Matriz de objetivos, metas e KPIs", n: 5, obr: 3,
        cols: [{ k: "obj", l: "Objetivo", ph: "" }, { k: "ind", l: "Indicador", ph: "" }, { k: "form", l: "Fórmula", ph: "Como calcula" }, { k: "base", l: "Base atual", ph: "Hoje" },
          { k: "meta", l: "Meta", ph: "2027" }, { k: "freq", l: "Frequência", tipo: "sel", op: ["", "Diária", "Semanal", "Mensal", "Trimestral"] }, { k: "fonte", l: "Fonte", ph: "De onde vem o dado" }, { k: "resp", l: "Responsável", ph: "Nome" }] } ] },

  projetos: { dia: "dia2", nome: "PROJETOS 2027", curto: "Projetos", quando: "Objetivos, KPIs e Projetos",
    obj: "Definir iniciativas executáveis e responsabilidades", saida: "Canvas e portfólio de projetos estratégicos",
    usa: ["prioridades", "kpis", "pessoas"],
    grupos: [{ t: "Insumos", campos: [A("restr", "Restrições", "Caixa, tempo, pessoas, fábrica"), A("pessoas", "Pessoas disponíveis", "Quem pode tocar projetos"), T("prazos", "Prazos importantes", "Ex.: coleção de inverno em março")] }],
    out: [
      { b: "pj", tipo: "linhas", t: "Portfólio de projetos", n: 4, obr: 2,
        cols: [{ k: "nome", l: "Projeto", ph: "" }, { k: "prob", l: "Problema", ph: "O que resolve" }, { k: "res", l: "Resultado esperado", ph: "" }, { k: "ent", l: "Entregáveis", ph: "" },
          { k: "resp", l: "Responsável", ph: "Nome" }, { k: "prazo", l: "Prazo", ph: "" }, { k: "prova", l: "Prova de conclusão", ph: "Como saber que terminou" }] } ] },

  noventa: { dia: "dia2", nome: "90 DIAS", curto: "Plano 90 dias", quando: "Plano 30/60/90 dias",
    obj: "Sequenciar execução nos primeiros 7, 30, 60 e 90 dias", saida: "Plano 90 dias com primeiros sete dias definidos",
    usa: ["projetos", "kpis", "pessoas"],
    grupos: [{ t: "Insumos", campos: [A("equipe", "Equipe disponível", "Quem vai executar"), A("agenda", "Restrições de agenda", "Ex.: dezembro de alta produção; férias coletivas em janeiro")] }],
    out: ["Primeiros 7 dias", "Dias 0 a 30", "Dias 31 a 60", "Dias 61 a 90"].map((t, i) => ({ b: "f" + i, tipo: "linhas", t, n: 3, obr: i === 0 ? 2 : 1,
      cols: [{ k: "a", l: "Ação", ph: "" }, { k: "r", l: "Responsável", ph: "Nome" }, { k: "p", l: "Prazo", ph: "Data" }, { k: "e", l: "Evidência", ph: "Como comprovar" }] })) },

  auditar: { dia: "dia2", nome: "AUDITAR MEU PLANO", curto: "Auditoria", quando: "Auditoria de IA / Teste de estresse",
    obj: "Testar fragilidades do Plano 2027", saida: "Teste de estresse + correções aceitas + riscos restantes",
    usa: ["prioridades", "orcamento", "financeiro", "kpis", "projetos", "noventa", "pessoas"],
    grupos: [{ t: "O que mais preocupa", campos: [A("caixa", "Caixa e capital de giro", "O crescimento cabe no caixa?"), A("cap", "Capacidade da fábrica", "A fábrica consegue entregar o orçamento?"), A("outros", "Outras preocupações", "")] }],
    out: [
      { b: "f", tipo: "linhas", t: "Teste de estresse: modos de falha", n: 5, obr: 3,
        cols: [{ k: "m", l: "Modo de falha", ph: "Como o plano pode falhar" }, { k: "g", l: "Gravidade", tipo: "sel", op: GRAV }, { k: "e", l: "Evidência", ph: "" }, { k: "a", l: "Ação preventiva", ph: "" },
          { k: "s", l: "Situação", tipo: "sel", op: ["", "Correção aceita", "Risco mantido"] }] } ] },

  onepage: { dia: "dia2", nome: "ONE PAGE 2027", curto: "One Page", quando: "One Page Strategic Plan 2027",
    obj: "Sintetizar estratégia confirmada em uma página", saida: "One Page Strategic Plan 2027 + compromisso", onepage: true,
    usa: ["prioridades", "orcamento", "financeiro", "kpis", "projetos", "noventa", "auditar", "painel"],
    grupos: [
      { t: "Visão", campos: [A("visao", "Onde queremos chegar em 31/12/2027", "")] },
      { t: "Os cinco números de 2027", unico: true, dois: true, campos: [1, 2, 3, 4, 5].map(n => T("n" + n, "Número " + n, n === 1 ? "Ex.: faturamento R$ 6 mi" : n === 2 ? "Ex.: margem líquida 10%" : "")) } ],
    out: [
      { b: "visao", tipo: "campo", l: "Visão de futuro", ph: "Onde queremos chegar em 31/12/2027", obr: true },
      { b: "num", tipo: "linhas", t: "Os cinco números de 2027", n: 5, obr: 3, cols: [{ k: "v", l: "Meta", ph: "" }] },
      { b: "pri", tipo: "linhas", t: "Prioridades estratégicas", n: 5, obr: 3, cols: [{ k: "v", l: "Prioridade", ph: "" }] },
      { b: "kpi", tipo: "linhas", t: "Metas e indicadores", n: 4, obr: 1, cols: [{ k: "o", l: "Objetivo", ph: "" }, { k: "m", l: "Meta", ph: "" }, { k: "k", l: "KPI", ph: "" }] },
      { b: "pj", tipo: "linhas", t: "Projetos estratégicos", n: 4, obr: 1, cols: [{ k: "p", l: "Projeto", ph: "" }, { k: "r", l: "Responsável", ph: "" }, { k: "z", l: "Prazo", ph: "" }] },
      { b: "ex", tipo: "linhas", t: "Execução", rot: ["7 dias", "30 dias", "60 dias", "90 dias"], obr: 1, cols: [{ k: "v", l: "O que estará feito", ph: "" }] },
      { b: "risco", tipo: "campo", l: "Maior risco", ph: "", obr: true },
      { b: "comp", tipo: "campo", l: "Compromisso do dono", ph: "O que eu, dono, me comprometo a fazer", obr: true } ] },
};

export const DIAS_FER = {
  dia1: { nome: "1º dia", data: "Quinta, 19/11", local: "Aporta Hall", ordem: ["diag", "prod", "produto", "vendas", "oficina", "painel"] },
  dia2: { nome: "2º dia", data: "Sexta, 20/11", local: "Aporta Hall", ordem: ["pessoas", "financeiro", "swot", "prioridades", "orcamento", "kpis", "projetos", "noventa", "auditar", "onepage"] },
};
export const tipoDia = d => d === "dia2" ? "fer_dia2" : "fer_dia1";

// Valor numérico flexível (aceita "40.000", "39,90", "R$ 39")
export const numero = s => { const t = String(s || "").replace(/[^\d,.-]/g, ""); if (!t) return NaN; const n = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : (t.split(".").length > 2 ? t.replace(/\./g, "") : (/\.\d{3}$/.test(t) ? t.replace(".", "") : t)); return parseFloat(n); };

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
    if (itens.length) linhas.push(`${bl.t}:\n${itens.join("\n")}`);
  });
  return linhas.join("\n");
}

export function pronto(k, dados) {
  const F = FER[k], o = dados.out || {}, t = x => String(x || "").trim();
  return F.out.every(bl => {
    if (bl.tipo === "campo") return !bl.obr || t(o[bl.b]);
    const n = (bl.rot || []).length || bl.n, c0 = bl.cols[0].k;
    let ok = 0; for (let i = 0; i < n; i++) if (t(o[`${bl.b}${i}_${c0}`])) ok++;
    return ok >= (bl.obr || 0);
  });
}
export function faltaTexto(k) {
  const F = FER[k];
  const p = F.out.filter(bl => bl.obr).map(bl => bl.tipo === "campo" ? bl.l.toLowerCase() : `${bl.obr === ((bl.rot || []).length || bl.n) ? "todas as linhas de" : "pelo menos " + bl.obr + (bl.obr > 1 ? " linhas de" : " linha de")} "${bl.t}"`);
  return "Para concluir, preencha: " + p.join("; ") + ".";
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
      return `- ${c.l}: ${c.f ? (tag(v.f) || "[H]") + " " : ""}${tx}`; }).join("\n");
  }).join("\n");
}
