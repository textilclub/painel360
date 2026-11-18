// Conversa com o Agente Estrategista Confecção 360° (via Edge Function "agente-360").
// A chave da IA fica no Supabase; o site só envia os dados do participante.
import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/+esm";
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3/+esm";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const md = t => DOMPurify.sanitize(marked.parse(String(t || ""), { breaks: true }));

if (!document.getElementById("agente-css")) {
  const st = document.createElement("style"); st.id = "agente-css";
  st.textContent = `
  .ag{display:grid;gap:12px}
  .ag-vazio{background:var(--paper);border:1.5px dashed var(--line-2);border-radius:12px;padding:16px;font-size:14.5px;color:var(--ink-2);line-height:1.5}
  .ag-msg{border-radius:14px;padding:14px 16px;font-size:15px;line-height:1.55;max-width:100%;overflow-x:auto}
  .ag-msg.ai{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--gold)}
  .ag-msg.eu{background:var(--ink);color:#f4efe4;justify-self:end;max-width:85%;white-space:pre-wrap}
  .ag-msg .quem{display:block;font:700 11px var(--f-body);letter-spacing:.14em;text-transform:uppercase;color:var(--gold-ink);margin-bottom:6px}
  .ag-msg.eu .quem{color:var(--gold-hi)}
  .ag-msg.ai h1,.ag-msg.ai h2,.ag-msg.ai h3{font:700 16.5px/1.3 var(--f-display);margin:14px 0 6px}
  .ag-msg.ai h1:first-child,.ag-msg.ai h2:first-child,.ag-msg.ai h3:first-child{margin-top:0}
  .ag-msg.ai p{margin:6px 0}.ag-msg.ai ul,.ag-msg.ai ol{margin:6px 0 6px 20px}
  .ag-msg.ai table{border-collapse:collapse;width:100%;font-size:13.5px;margin:10px 0}
  .ag-msg.ai th,.ag-msg.ai td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
  .ag-msg.ai th{background:var(--paper)}
  .ag-dados{font-size:13.5px}
  .ag-dados summary{cursor:pointer;font-weight:600;color:var(--ink-2);list-style:none}
  .ag-dados summary::-webkit-details-marker{display:none}
  .ag-dados pre{white-space:pre-wrap;font:500 12.5px/1.5 ui-monospace,Menlo,monospace;background:var(--paper);border-radius:10px;padding:10px;margin-top:8px;max-height:260px;overflow:auto}
  .ag-pensando{display:flex;gap:10px;align-items:center;color:var(--muted);font-size:14.5px;padding:6px 2px}
  .ag-pensando i{width:9px;height:9px;border-radius:50%;background:var(--gold);animation:agp 1s infinite alternate}
  .ag-pensando i:nth-child(2){animation-delay:.2s}.ag-pensando i:nth-child(3){animation-delay:.4s}
  @keyframes agp{to{opacity:.2;transform:translateY(-3px)}}
  .ag-aviso{background:var(--warn-bg);border:1px solid var(--warn-line);color:var(--warn);border-radius:12px;padding:12px 14px;font-size:14.5px;line-height:1.45}
  .ag-compor{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
  .ag-compor textarea{min-height:52px}
  .ag-compor .btn{width:auto}
  .ag-acoes{display:flex;flex-wrap:wrap;gap:10px}
  .ag-acoes .btn{width:auto}
  @media (max-width:560px){.ag-compor{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
}

/**
 * montarAgente({ el, sb, modulo, dados:()=>string, conversa:()=>array, salvar:(array)=>void, ro, rotulo })
 * conversa: [{ r:"eu"|"ai", t, dados?:true }]
 */
export function montarAgente(o) {
  const { el, sb, modulo, ro } = o;
  let ocupado = false, aviso = "";

  function render() {
    const c = o.conversa() || [];
    let h = "";
    if (!c.length) {
      h += ro ? `<div class="ag-vazio">O participante ainda não pediu a análise da IA.</div>`
              : `<div class="ag-vazio">Quando terminar de preencher, clique em <b>Analisar com a IA</b>. O Agente Estrategista lê os seus dados e responde aqui. Se faltar alguma informação, ele pergunta e você responde logo abaixo.</div>`;
    }
    c.forEach((m, i) => {
      if (m.dados) h += `<details class="ag-dados"><summary>📎 Dados enviados para a IA</summary><pre>${esc(m.t)}</pre></details>`;
      else if (m.r === "ai") h += `<div class="ag-msg ai"><span class="quem">Agente Estrategista</span>${md(m.t)}</div>`;
      else h += `<div class="ag-msg eu"><span class="quem">Você</span>${esc(m.t)}</div>`;
    });
    if (ocupado) h += `<div class="ag-pensando"><i></i><i></i><i></i> O Agente está analisando…</div>`;
    if (aviso) h += `<div class="ag-aviso">${aviso}</div>`;
    if (!ro) {
      if (c.length) h += `<div class="ag-compor"><textarea id="${modulo}-msg" placeholder="Responda às perguntas do Agente ou peça um ajuste…" ${ocupado ? "disabled" : ""}></textarea><button class="btn" type="button" data-ag="enviar" ${ocupado ? "disabled" : ""}>Enviar</button></div>`;
      h += `<div class="ag-acoes"><button class="btn ${c.length ? "ghost" : ""}" type="button" data-ag="analisar" ${ocupado ? "disabled" : ""}>${c.length ? "Refazer a análise com os dados atualizados" : "Analisar com a IA"}</button></div>`;
    }
    el.innerHTML = `<div class="ag">${h}</div>`;
    el.querySelector('[data-ag="analisar"]')?.addEventListener("click", () => {
      if (c.length && !confirm("Refazer a análise apaga a conversa atual. Continuar?")) return;
      pedir([{ r: "eu", t: o.dados(), dados: true }]);
    });
    el.querySelector('[data-ag="enviar"]')?.addEventListener("click", () => {
      const ta = el.querySelector("textarea"); const t = ta.value.trim(); if (!t) return ta.focus();
      pedir([...c, { r: "eu", t }]);
    });
  }

  async function pedir(conv) {
    ocupado = true; aviso = ""; o.salvar(conv); render();
    try {
      const { data, error } = await sb.functions.invoke("agente-360", {
        body: { modulo, dados: conv[0].t, historico: conv.slice(1) },
      });
      let res = data;
      if (error) { try { res = await error.context.json(); } catch { res = { erro: "rede" }; } }
      if (res?.texto) { conv = [...conv, { r: "ai", t: res.texto }]; o.salvar(conv); }
      else {
        const e = res?.erro;
        aviso = e === "sem_chave" ? "A IA ainda não foi ativada para a imersão. Seus dados ficam salvos; assim que ela for ligada, é só clicar em <b>Analisar com a IA</b>."
          : e === "nao_aprovado" ? "Seu acesso ainda não foi liberado pela organização."
          : e === "nao_autenticado" ? "Sua sessão expirou. Saia e entre de novo."
          : "Não foi possível falar com a IA agora. Tente de novo em instantes.";
        if (conv.length === 1) o.salvar([]); else { conv = conv.slice(0, -1); o.salvar(conv); }
      }
    } catch {
      aviso = "Não foi possível falar com a IA agora. Verifique a internet e tente de novo.";
    }
    ocupado = false; render();
  }

  render();
  return { render };
}
