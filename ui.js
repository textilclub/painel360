/* Ícones, cabeçalho e rodapé compartilhados · Painel 360 (só camada visual) */
(function () {
  const P = {
    dot: '<circle cx="12" cy="12" r="3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    chev2: '<path d="M5 6l6 6-6 6M12 6l6 6-6 6"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/>',
    pen: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14 7l3 3"/>',
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9"/>',
    building: '<path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M15 9h3a1 1 0 0 1 1 1v11M3 21h18M9 7h2M9 11h2M9 15h2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.8.8 3 2.6 3 5.6"/>',
    car: '<path d="M5 16v-5l2-5h10l2 5v5M3 16h18v3H3zM7.5 13h.01M16.5 13h.01"/>',
    utensils: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3v11"/>',
    bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.4"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.7 6.7C3.9 8.5 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    coffee: '<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 11h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>',
    spark: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    scissors: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5L20 18M8 16.5L20 6"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
    mega: '<path d="M4 10v4h3l8 4V6L7 10zM18 9a4 4 0 0 1 0 6"/>',
    factory: '<path d="M3 20V9l6 3V9l6 3V5h3v15zM3 20h18"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    bank: '<path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
    file: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    layers: '<path d="M12 4l9 5-9 5-9-5zM3 14l9 5 9-5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    refresh: '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5"/>'
  };
  const IC = (n, cls) => `<svg class="i ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[n] || P.dot}</svg>`;
  window.IC = IC;

  const sc = document.currentScript;
  const page = (sc && sc.dataset.page) || "";
  if (page === "login") return; // a tela de acesso tem layout próprio
  const C = window.TC_CONFIG || {};
  const wa = C.WHATSAPP_SUPORTE ? `https://wa.me/${C.WHATSAPP_SUPORTE}` : "#";

  const pre = page === "cliente" ? "admin.html" : "";
  const links = (page === "admin" || page === "cliente")
    ? [["participantes", pre + "#participantes", "Participantes"], ["exercicios", pre + "#exercicios", "Plano Anual das empresas"], ["acoes", pre + "#acoes", "Ações"], ["avaliacoes", pre + "#avaliacoes", "Avaliações"]]
    : [["painel", "painel.html", "Início"], ["exercicio", "exercicio.html", "Plano Anual"], ["visita", "visita.html", "Ações"], ["cronograma", "cronograma.html", "Cronograma"], ["palestrantes", "palestrantes.html", "Palestrantes"], ["local", "local.html", "Local"], ["avaliacao", "avaliacao.html", "Avaliação"]];
  const nav = cls => `<nav class="${cls}" aria-label="Navegação principal">${links.map(([k, h, t]) =>
    `<a class="nl"${k === page ? ' aria-current="page"' : ""} href="${h}">${t}</a>`).join("")}${page === "admin" || page === "cliente" ? "" : `<a class="nl nl-admin hide" href="admin.html">Administração</a>`}</nav>`;

  const html = `
<header class="topo"><div class="topo-in">
  <a class="marca" href="${page === "admin" || page === "cliente" ? "admin.html" : "painel.html"}" aria-label="Têxtil Club, página inicial"><img src="logo.jpg" alt="Têxtil Club" width="132" height="50"></a>
  ${nav("nav-inline")}
  <div class="topo-dir">
    <span class="quem" id="quem"></span>
    <a class="top-btn ico" href="meus-dados.html"${page === "meusdados" ? ' aria-current="page"' : ""} aria-label="Meus dados" title="Meus dados">${IC("user")}<span>Meus dados</span></a>
    <a class="top-btn" href="${wa}" target="_blank" rel="noopener" aria-label="Falar com o suporte pelo WhatsApp">${IC("chat")}<span>Suporte</span></a>
    <button class="top-btn sair" id="sair" type="button" aria-label="Sair">${IC("logout")}<span>Sair</span></button>
  </div>
</div></header>
${nav("subnav")}`;
  if (document.body) document.body.insertAdjacentHTML("afterbegin", html);

  document.addEventListener("click", async e => {
    if (!e.target.closest("#sair")) return;
    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      await createClient(C.SUPABASE_URL, C.SUPABASE_KEY).auth.signOut();
    } catch (_) {}
    location.replace("index.html");
  });

  // IA de consulta: ícone fixo nas páginas do participante
  if (page !== "admin" && page !== "cliente" && page !== "avaliacao" && page !== "meusdados") { const s = document.createElement("script"); s.type = "module"; s.src = "consulta.js"; document.head.appendChild(s); }

  window.TC_UI = { mostrarAdmin() { document.querySelectorAll(".nl-admin").forEach(a => a.classList.remove("hide")); } };

  if (sc && sc.dataset.footer !== "0") {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.insertAdjacentHTML("beforeend",
        `<footer class="rodape"><span>Precisa de ajuda? Fale com <b>Rafael Martins</b>, nosso suporte.</span><a href="${wa}" target="_blank" rel="noopener">WhatsApp (62) 8229-2141</a></footer>`);
    });
  }
})();
