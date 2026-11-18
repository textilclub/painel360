// Observações da Têxtil Club: o administrador escreve, o participante e os sócios leem.
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = ts => new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

if (!document.getElementById("obs-css")) {
  const st = document.createElement("style"); st.id = "obs-css";
  st.textContent = `
  .obs{background:linear-gradient(180deg,#fbf3dc,#f7ecd0);border:1.5px solid var(--gold);border-radius:var(--r-lg);padding:14px 16px;margin-bottom:18px}
  .obs-t{display:flex;align-items:center;gap:8px;font:700 12px var(--f-body);letter-spacing:.14em;text-transform:uppercase;color:var(--gold-ink);margin-bottom:8px}
  .obs-t i{width:22px;height:22px;border-radius:50%;background:#0b0b0a;color:var(--gold-hi);display:grid;place-items:center;font-style:normal;font-size:12px}
  .obs-it{background:var(--surface);border-radius:10px;padding:10px 12px;margin-top:8px;font-size:15px;line-height:1.5;white-space:pre-wrap}
  .obs-it small{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:12.5px;margin-top:6px;white-space:normal}
  .obs-it small button{border:0;background:none;color:var(--err);font:600 12.5px var(--f-body);cursor:pointer;padding:0}
  .obs-form{display:grid;gap:8px;margin-top:10px}
  .obs-form textarea{min-height:70px;background:var(--surface)}
  .obs-form .btn{width:auto;justify-self:start}`;
  document.head.appendChild(st);
}

/**
 * montarObs({ el, sb, empresaId, participanteId, alvos:["fer:diag"], rotuloAlvo, admin })
 * Mostra as observações daquele item (e as gerais do participante quando alvos inclui "geral").
 */
export async function montarObs(o) {
  const { el, sb, empresaId, participanteId, alvos, admin } = o;
  if (!el || !empresaId) return;
  let q = sb.from("observacoes").select("id,alvo,texto,autor,criado_em,participante_id").eq("empresa_id", empresaId).in("alvo", alvos).order("criado_em", { ascending: false });
  if (participanteId) q = q.or(`participante_id.is.null,participante_id.eq.${participanteId}`);
  const { data } = await q;
  const lista = data || [];
  if (!lista.length && !admin) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="obs">
    <div class="obs-t"><i>TC</i>${lista.length === 1 ? "Observação da Têxtil Club" : "Observações da Têxtil Club"}</div>
    ${lista.map(x => `<div class="obs-it">${esc(x.texto)}<small><span>${esc(x.autor || "Têxtil Club")} · ${fmt(x.criado_em)}</span>${admin ? `<button type="button" data-apagar="${x.id}">Apagar</button>` : ""}</small></div>`).join("")}
    ${admin ? `<div class="obs-form"><textarea placeholder="Escreva uma observação para o participante${o.rotuloAlvo ? " sobre " + esc(o.rotuloAlvo) : ""}. Ela aparece assinada como Têxtil Club."></textarea>
      <button class="btn sm" type="button" data-pub="1">Publicar observação</button></div>` : ""}
  </div>`;
  el.querySelectorAll("[data-apagar]").forEach(b => b.onclick = async () => {
    if (!confirm("Apagar esta observação?")) return;
    await sb.from("observacoes").delete().eq("id", b.dataset.apagar); montarObs(o);
  });
  const pub = el.querySelector("[data-pub]");
  if (pub) pub.onclick = async () => {
    const ta = el.querySelector(".obs-form textarea"), texto = ta.value.trim(); if (!texto) return ta.focus();
    pub.disabled = true;
    const { error } = await sb.from("observacoes").insert({ empresa_id: empresaId, participante_id: participanteId || null, alvo: alvos[0], texto, autor: "Têxtil Club" });
    if (error) { alert("Não foi possível publicar: " + error.message); pub.disabled = false; return; }
    montarObs(o);
  };
}

/** Lista simples de observações recentes (para o painel e a visão do cliente). */
export async function obsRecentes(sb, empresaId, participanteId, limite = 5) {
  if (!empresaId) return [];
  let q = sb.from("observacoes").select("id,alvo,texto,autor,criado_em,participante_id").eq("empresa_id", empresaId).order("criado_em", { ascending: false }).limit(limite);
  if (participanteId) q = q.or(`participante_id.is.null,participante_id.eq.${participanteId}`);
  const { data } = await q; return data || [];
}
