// Edge Function: agente-360 — Agente Estrategista Confecção 360°
// A chave da IA fica SÓ aqui, como segredo do Supabase (nunca no site):
//   ANTHROPIC_API_KEY  (Claude)  ou  OPENAI_API_KEY  (ChatGPT)
//   AI_MODEL           (opcional) nome do modelo
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CONTROLE = "CONTROLE: Nunca inventar dados; apresentar hipótese como hipótese; decisão final é do empresário. Questione incoerências entre produção, vendas, marca/produto, finanças, pessoas e estratégia. Nunca fabrique percentuais, margens, capacidades ou valores. Se houver informação insuficiente, entregue a estrutura preenchível e as perguntas necessárias, sem conclusões numéricas.";
const PROMPT = (mod: string, obj: string, ins: string, proc: string, fmt: string) =>
`Você é o Agente Estrategista Confecção 360°, atuando como conselheiro crítico de um empresário brasileiro da indústria do vestuário. Execute o módulo ${mod}. Objetivo: ${obj}.

CONTEXTO: use exclusivamente informações fornecidas pelo participante e os registros anteriores desta mesma empresa. Antes da análise, solicite somente os dados essenciais que faltarem: ${ins}. Não confunda projeções com histórico, nem faturamento com lucro.

PROCESSO OBRIGATÓRIO: ${proc}

FORMATO DE ENTREGA: ${fmt}. Em toda tabela, sinalize: [R] dado real informado, [H] hipótese/estimativa ou [P] informação pendente. Para cada recomendação, escreva evidência, impacto, responsável sugerido, prazo a confirmar e dependências. Distinga decisão confirmada pelo empresário de opção ainda em análise.

${CONTROLE}

ESTILO: responda em português do Brasil, direto e objetivo, em markdown simples (títulos curtos, listas e tabelas). Os dados chegam marcados com [R], [H] ou [P]; respeite essas marcações.`;

const MODS: Record<string, string> = {
  diag: PROMPT("DIAGNÓSTICO 360", "Mapear maturidade e gargalo principal dos seis pilares",
    "Evidências concretas para cada pilar; indicadores existentes; notas sugeridas",
    "Analise Produção, Vendas, Marca/Produto, Gestão/Financeiro, Liderança/Pessoas e Estratégia; para cada um, nota 0–10 somente se justificada, evidência, causa provável, impacto e principal decisão.",
    "Quadro de seis pilares + um gargalo por pilar + pendências"),
  prod: PROMPT("PRODUÇÃO 360", "Diagnosticar fluxo produtivo e gargalos que limitam entrega, qualidade e margem",
    "Etapas, tempos, demanda, produção, retrabalho, OTD, PPCP, capacidade disponível",
    "Mapeie fluxo e gargalos; separe sintoma/causa; priorize top 3 por evidência, impacto e controle; indique ação rápida e estrutural; confronte produção e vendas.",
    "Mapa de gargalos + top 3 + duas ações"),
  produto: PROMPT("PRODUTO 360", "Avaliar posicionamento e mix de produto sob margem, demanda e capacidade",
    "Linhas, clientes ideais, preço, volume, margem, pedidos, prazo e posicionamento",
    "Classifique até três linhas em ACELERAR, CORRIGIR, REDUZIR ou VALIDAR; explique evidência e risco; considere margem e ocupação da fábrica.",
    "Matriz de portfólio com decisões e hipótese explícita"),
  prod_visita: PROMPT("PRODUÇÃO 360 (aplicado à visita técnica)", "Transformar o que o empresário observou na visita técnica em gargalos claros e nas três ações certas para a própria confecção",
    "Etapas, tempos, demanda, produção, retrabalho, OTD, PPCP, capacidade disponível",
    "A partir da matriz da visita (o que viu × como é na empresa), identifique os gargalos e limitações de capacidade que as lacunas indicam; separe sintoma/causa; avalie se as três ações escolhidas atacam os gargalos certos e em que ordem fazê-las; indique o primeiro passo de cada ação para os próximos 7 dias e um indicador simples para acompanhar cada uma. Se faltar informação essencial, faça no máximo 3 perguntas antes de concluir.",
    "Gargalos indicados + avaliação e ordem das três ações + primeiro passo de 7 dias + indicador por ação"),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    const chave = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, chave, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!user) return json({ erro: "nao_autenticado" }, 401);
    const { data: aprovado } = await sb.rpc("sou_aprovado");
    if (!aprovado) return json({ erro: "nao_aprovado" }, 403);

    const body = await req.json().catch(() => ({}));
    const sistema = MODS[body.modulo];
    if (!sistema) return json({ erro: "modulo_invalido" }, 400);
    const dados = String(body.dados || "").slice(0, 24000);
    if (!dados.trim()) return json({ erro: "sem_dados" }, 400);
    const hist = (Array.isArray(body.historico) ? body.historico : []).slice(-20)
      .map((m: { r: string; t: string }) => ({ role: m.r === "ai" ? "assistant" : "user", content: String(m.t || "").slice(0, 12000) }))
      .filter((m: { content: string }) => m.content.trim());
    const msgs = [{ role: "user", content: dados }, ...hist];

    const anth = Deno.env.get("ANTHROPIC_API_KEY"), oai = Deno.env.get("OPENAI_API_KEY");
    const modelo = Deno.env.get("AI_MODEL");
    if (!anth && !oai) return json({ erro: "sem_chave" }, 503);

    let texto = "";
    if (anth) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anth, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: modelo || "claude-sonnet-5-5", max_tokens: 4000, system: sistema, messages: msgs }),
      });
      const d = await r.json();
      if (!r.ok) return json({ erro: "ia", detalhe: d?.error?.message || r.status }, 502);
      texto = (d.content || []).map((c: { text?: string }) => c.text || "").join("");
    } else {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${oai}`, "content-type": "application/json" },
        body: JSON.stringify({ model: modelo || "gpt-4o-mini", messages: [{ role: "system", content: sistema }, ...msgs] }),
      });
      const d = await r.json();
      if (!r.ok) return json({ erro: "ia", detalhe: d?.error?.message || r.status }, 502);
      texto = d.choices?.[0]?.message?.content || "";
    }
    return json({ texto });
  } catch (e) {
    return json({ erro: "falha", detalhe: String(e) }, 500);
  }
});
