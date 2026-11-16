/* Desenhos gerados por código (usados quando não há foto enviada).
   Compartilhado entre o site e o painel. */
(function (G) {
  let uid = 0;
  const CONTORNO = "M70 20 L40 30 L5 60 L25 90 L45 78 L45 185 L155 185 L155 78 L175 90 L195 60 L160 30 L130 20 Q100 40 70 20Z";

  function corTexto(hex) {
    const h = (hex || "#000").replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return l > 0.6 ? "#111" : "#fff";
  }

  function padrao(t) {
    const c2 = t.cor2 || "#fff", c3 = t.cor3 || c2;
    switch (t.estilo) {
      case "listras-v": {
        let s = ""; let i = 0;
        for (let x = 52; x < 150; x += 16, i++) s += `<rect x="${x}" y="0" width="8" height="200" fill="${i % 2 && t.cor3 ? c3 : c2}"/>`;
        return s;
      }
      case "listras-h": {
        let s = "";
        for (let y = 40; y < 190; y += 22) s += `<rect x="0" y="${y}" width="200" height="11" fill="${c2}"/>`;
        return s;
      }
      case "faixa": return `<polygon points="35,40 65,25 170,170 140,190" fill="${c2}"/>`;
      case "faixa-h": return `<rect x="0" y="82" width="200" height="12" fill="${c2}"/><rect x="0" y="94" width="200" height="8" fill="${t.cor3 ? c3 : "#fff"}"/><rect x="0" y="102" width="200" height="12" fill="${c2}"/>`;
      case "centro": return `<rect x="86" y="0" width="28" height="200" fill="${c2}"/>`;
      default: return "";
    }
  }

  function camisa(t, w) {
    const id = "cm" + (++uid);
    const gola = t.cor2 || "#fff";
    return `<svg viewBox="0 0 200 200" width="${w || 160}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Camisa ${esc(t.nome || "")}">
      <defs><clipPath id="${id}"><path d="${CONTORNO}"/></clipPath>
      <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient></defs>
      <g clip-path="url(#${id})"><rect width="200" height="200" fill="${t.cor1 || "#888"}"/>${padrao(t)}<rect width="200" height="200" fill="url(#${id}g)"/></g>
      <path d="${CONTORNO}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="3"/>
      <path d="M70 20 Q100 46 130 20" fill="none" stroke="${gola}" stroke-width="6"/>
      <g transform="translate(116,52)">${escudoInterno(t, 22)}</g>
    </svg>`;
  }

  function escudoInterno(t, s) {
    const c1 = t.cor1 || "#888", c2 = t.cor2 || "#fff";
    return `<path d="M0 0 H${s} V${s * .6} Q${s / 2} ${s * 1.15} 0 ${s * .6}Z" fill="${c1}" stroke="${c2}" stroke-width="2"/>`;
  }

  /** Escudo genérico (bandeira + sigla). Se o time tiver imagem de escudo, usa a imagem. */
  function escudo(t, tam) {
    tam = tam || 36;
    if (!t) return "";
    if (t.escudo) return `<img src="${esc(t.escudo)}" alt="${esc(t.nome)}" width="${tam}" height="${tam}" style="object-fit:contain">`;
    const id = "es" + (++uid);
    const c1 = t.cor1 || "#888", c2 = t.cor2 || "#fff";
    const sigla = esc((t.sigla || t.nome || "?").slice(0, 3).toUpperCase());
    const fundo = (c1.toLowerCase() === "#ffffff" || c1.toLowerCase() === "#fff") ? c2 : c1;
    return `<svg viewBox="0 0 40 46" width="${tam}" height="${tam * 1.15}" role="img" aria-label="${esc(t.nome)}">
      <defs><clipPath id="${id}"><path d="M3 3 H37 V24 Q37 38 20 44 Q3 38 3 24Z"/></clipPath></defs>
      <g clip-path="url(#${id})"><rect width="40" height="46" fill="${c1}"/>${padraoEscudo(t)}</g>
      <path d="M3 3 H37 V24 Q37 38 20 44 Q3 38 3 24Z" fill="none" stroke="${c2}" stroke-width="2.5"/>
      <rect x="6" y="15" width="28" height="12" rx="2" fill="${fundo}" opacity=".92"/>
      <text x="20" y="24.5" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="10.5" fill="${corTexto(fundo)}">${sigla}</text>
    </svg>`;
  }
  function padraoEscudo(t) {
    const c2 = t.cor2 || "#fff", c3 = t.cor3 || c2;
    if (t.estilo === "listras-v") { let s = ""; for (let x = 6, i = 0; x < 38; x += 8, i++) s += `<rect x="${x}" width="4" height="46" fill="${i % 2 && t.cor3 ? c3 : c2}"/>`; return s; }
    if (t.estilo === "listras-h") { let s = ""; for (let y = 4; y < 46; y += 8) s += `<rect y="${y}" width="40" height="4" fill="${c2}"/>`; return s; }
    if (t.estilo === "faixa") return `<polygon points="0,6 8,0 40,38 32,46" fill="${c2}"/>`;
    if (t.estilo === "faixa-h") return `<rect y="30" width="40" height="4" fill="${c2}"/><rect y="34" width="40" height="3" fill="${t.cor3 ? c3 : "#fff"}"/>`;
    if (t.estilo === "centro") return `<rect x="15" width="10" height="46" fill="${c2}"/>`;
    return "";
  }

  function produto(p, t, w) {
    w = w || 160;
    if (p.imagem) return `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy">`;
    t = t || { cor1: "#888", cor2: "#fff" };
    const c1 = t.cor1, c2 = t.cor2 || "#fff";
    if (p.tipo === "camisa") return camisa(t, w);
    if (p.tipo === "bone") return `<svg viewBox="0 0 200 200" width="${w}"><path d="M30 120 Q30 50 100 50 Q170 50 170 120Z" fill="${c1}" stroke="rgba(0,0,0,.5)" stroke-width="3"/><path d="M20 120 L190 120 Q200 142 160 142 L20 142Z" fill="${c2}" stroke="rgba(0,0,0,.5)" stroke-width="3"/><g transform="translate(86,74)">${escudoInterno(t, 28)}</g></svg>`;
    if (p.tipo === "bandeira") return `<svg viewBox="0 0 200 200" width="${w}"><rect x="20" y="20" width="7" height="170" fill="#333"/><path d="M27 30 Q100 10 180 35 L180 125 Q100 100 27 125Z" fill="${c1}" stroke="rgba(0,0,0,.4)" stroke-width="3"/><path d="M27 62 Q100 42 180 67 L180 90 Q100 70 27 95Z" fill="${c2}"/></svg>`;
    if (p.tipo === "caneca") return `<svg viewBox="0 0 200 200" width="${w}"><path d="M145 75 Q185 75 185 110 Q185 145 145 145" fill="none" stroke="#444" stroke-width="10"/><rect x="45" y="50" width="100" height="120" rx="10" fill="${c1}" stroke="rgba(0,0,0,.4)" stroke-width="3"/><rect x="45" y="92" width="100" height="24" fill="${c2}"/></svg>`;
    return `<svg viewBox="0 0 200 200" width="${w}"><rect x="40" y="40" width="120" height="120" rx="12" fill="${c1}"/><rect x="40" y="88" width="120" height="24" fill="${c2}"/></svg>`;
  }

  /** Ilustração de campo nas cores do time (capa de notícia sem foto). */
  function ilustracao(t) {
    t = t || { cor1: "#0a8f3c", cor2: "#fff", nome: "" };
    const id = "il" + (++uid);
    return `<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block" role="img" aria-label="Ilustração ${esc(t.nome || "")}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.cor1}"/><stop offset="1" stop-color="${(t.cor1 || "").toLowerCase() === "#ffffff" ? (t.cor2 || "#333") : "#0b0b0b"}"/></linearGradient></defs>
      <rect width="640" height="360" fill="url(#${id})"/>
      <g opacity=".14" fill="none" stroke="${corTexto(t.cor1)}" stroke-width="5">
        <circle cx="320" cy="180" r="80"/><line x1="320" y1="0" x2="320" y2="360"/>
        <rect x="-5" y="100" width="90" height="160"/><rect x="555" y="100" width="90" height="160"/>
      </g>
      <g transform="rotate(8 510 170)">${camisa(t, 280).replace("<svg ", '<svg x="370" y="40" height="280" ')}</g>
      ${t.escudo ? `<image href="${esc(t.escudo)}" x="44" y="250" width="80" height="80"/>` : escudo(t, 70).replace("<svg ", '<svg x="44" y="250" ')}
    </svg>`;
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  G.Desenhos = { camisa, escudo, produto, ilustracao, esc, corTexto };
})(window);
