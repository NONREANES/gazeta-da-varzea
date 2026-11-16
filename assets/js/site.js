/* Site público da Gazeta da Várzea — carrega os dados da API e monta as páginas. */
(function () {
  const { escudo, produto: desenhoProduto, ilustracao, camisa, esc } = window.Desenhos;
  const $ = s => document.querySelector(s);
  const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  let D = null, T = {}; // dados e índice de times por id

  /* ---------- Utilidades ---------- */
  function tempo(data) {
    if (!data) return "";
    const d = new Date(data.length <= 10 ? data + "T12:00:00" : data.replace(" ", "T"));
    const dias = Math.floor((Date.now() - d) / 864e5);
    if (dias <= 0) return "hoje";
    if (dias === 1) return "ontem";
    if (dias < 7) return `há ${dias} dias`;
    return d.toLocaleDateString("pt-BR");
  }
  function dataJogo(j) {
    if (!j.data) return "";
    const d = new Date(j.data + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "") + (j.hora ? " · " + j.hora : "");
  }
  const capa = (n) => n.imagem ? `<img src="${esc(n.imagem)}" alt="" loading="lazy">` : ilustracao(T[n.time]);
  const nomeTime = id => T[id] ? T[id].nome : "—";
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._x); t._x = setTimeout(() => t.classList.remove("on"), 2300); }
  function paragrafos(txt) { return String(txt || "").split(/\n\s*\n|\n/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join(""); }

  /* ---------- Blocos reutilizáveis ---------- */
  function itemFeed(n) {
    return `<a class="feed-item" href="#/noticia/${n.id}">
      <div class="thumb">${capa(n)}</div>
      <div><span class="chapeu">${esc(n.chapeu || nomeTime(n.time))}</span>
      <h3>${esc(n.titulo)}</h3><p>${esc(n.resumo)}</p>
      <span class="meta">${tempo(n.data)}${T[n.time] ? " · " + esc(T[n.time].nome) : ""}</span></div></a>`;
  }
  function cardDestaque(n, princ) {
    return `<a class="dest ${princ ? "dest-princ" : ""}" href="#/noticia/${n.id}">
      <div class="midia">${capa(n)}</div>
      <div class="txt"><span class="chapeu">${esc(n.chapeu || nomeTime(n.time))}</span>
      ${princ ? `<h2>${esc(n.titulo)}</h2>` : `<h3>${esc(n.titulo)}</h3>`}</div></a>`;
  }
  function cardProduto(p) {
    const t = T[p.time];
    const tams = String(p.tamanhos || "").split(",").map(s => s.trim()).filter(Boolean);
    const padrao = tams.includes("M") ? "M" : tams[0];
    return `<div class="produto">
      <a class="img" href="#/time/${esc(p.time)}">${p.tag ? `<span class="selo">${esc(p.tag)}</span>` : ""}${desenhoProduto(p, t, 200)}</a>
      <div class="corpo">
        <span class="time-nome">${escudo(t, 16)} ${esc(t ? t.nome : "")}</span>
        <h3>${esc(p.nome)}</h3>
        ${tams.length ? `<div class="tamanhos" role="radiogroup" aria-label="Tamanho">${tams.map(s => `<label><input type="radio" name="tam-${p.id}" value="${esc(s)}" ${s === padrao ? "checked" : ""}><span>${esc(s)}</span></label>`).join("")}</div>` : ""}
        <div class="precos">${p.preco_antigo ? `<span class="de">${brl(p.preco_antigo)}</span>` : ""}<span class="por">${brl(p.preco)}</span></div>
        <button class="btn btn-verde" onclick="App.adicionar('${p.id}')">Adicionar à sacola</button>
      </div></div>`;
  }
  function tabelaHTML(limite) {
    const linhas = D.tabela.slice(0, limite || 99);
    const total = D.tabela.length;
    return `<table class="classif"><thead><tr><th>#</th><th>Time</th><th>P</th><th>J</th><th>V</th><th>SG</th></tr></thead><tbody>
      ${linhas.map((r, i) => `<tr class="${i < 4 ? "g4" : ""} ${i >= total - 2 ? "z2" : ""}">
        <td class="pos">${i + 1}</td>
        <td class="time"><a href="#/time/${esc(r.time)}">${escudo(T[r.time], 20)}<span>${esc(nomeTime(r.time))}</span></a></td>
        <td class="pts">${+r.pontos || 0}</td><td>${+r.jogos || 0}</td><td>${+r.vitorias || 0}</td><td>${(+r.saldo > 0 ? "+" : "") + (+r.saldo || 0)}</td></tr>`).join("")}
      </tbody></table>
      <div class="classif-legenda"><span><i style="background:var(--verde)"></i>Mata-mata</span><span><i style="background:var(--vermelho)"></i>Rebaixamento</span></div>`;
  }
  function cardJogo(j) {
    const enc = j.status === "encerrado", vivo = j.status === "ao-vivo";
    const meio = (enc || vivo) ? `${j.gols_casa ?? 0} <small>×</small> ${j.gols_fora ?? 0}` : `<small>${esc(j.hora || "")}</small>`;
    return `<div class="jogo"><div class="cab"><span>${esc(j.campeonato || "")} · ${dataJogo(j)}</span><span>${vivo ? '<b style="color:var(--vermelho)">● AO VIVO</b>' : enc ? "Encerrado" : esc(j.local || "")}</span></div>
      <div class="placar-g">
        <a class="lado" href="#/time/${esc(j.casa)}">${escudo(T[j.casa], 28)}<span>${esc(nomeTime(j.casa))}</span></a>
        <div class="num">${meio}</div>
        <a class="lado dir" href="#/time/${esc(j.fora)}"><span>${esc(nomeTime(j.fora))}</span>${escudo(T[j.fora], 28)}</a>
      </div></div>`;
  }
  function lateral() {
    const vitrine = D.produtos.filter(p => p.tag).slice(0, 4);
    return `<aside class="lateral">
      <div class="caixa"><div class="caixa-cab">${esc(D.config.campeonato)}<a href="#/tabela">ver tudo</a></div>${tabelaHTML(8)}</div>
      <div class="caixa"><div class="caixa-cab">Loja dos times<a href="#/loja">ver loja</a></div>
        ${vitrine.map(p => `<a class="mini-prod" href="#/loja"><div class="img">${desenhoProduto(p, T[p.time], 60)}</div><div><b>${esc(p.nome)}</b><span class="meta">${esc(nomeTime(p.time))}</span><div class="preco">${brl(p.preco)}</div></div></a>`).join("")}
      </div>
      <a class="caixa" href="#/cadastre" style="display:block;padding:20px;background:var(--verde-claro)">
        <strong style="color:var(--verde);font-size:18px">Seu time quer vender camisas?</strong>
        <p style="margin:6px 0 12px;color:#333">Coloque os produtos do seu clube na nossa loja. Sem mensalidade.</p>
        <span class="btn btn-verde">Cadastrar meu time</span></a>
    </aside>`;
  }

  /* ---------- Páginas ---------- */
  const paginas = {
    inicio() {
      const ord = [...D.noticias].sort((a, b) => (b.destaque === true) - (a.destaque === true));
      const [p1, p2, p3, ...resto] = ord;
      return `${p1 ? `<section class="destaques">${cardDestaque(p1, true)}<div class="dest-lado">${p2 ? cardDestaque(p2) : ""}${p3 ? cardDestaque(p3) : ""}</div></section>` : ""}
        <div class="grade"><div>
          <div class="titulo-sec"><h2>Últimas</h2><a href="#/noticias">todas as notícias</a></div>
          <div>${resto.slice(0, 6).map(itemFeed).join("") || '<p class="meta">Sem mais notícias por enquanto.</p>'}</div>
          <div class="titulo-sec"><h2>Loja dos times</h2><a href="#/loja">ver todos</a></div>
          <div class="produtos" style="grid-template-columns:repeat(3,1fr)">${D.produtos.slice(0, 6).map(cardProduto).join("")}</div>
        </div>${lateral()}</div>`;
    },
    noticias() {
      return `<div class="grade"><div><div class="titulo-sec"><h2>Notícias</h2></div>
        ${D.noticias.map(itemFeed).join("") || '<p class="meta">Nenhuma notícia publicada.</p>'}</div>${lateral()}</div>`;
    },
    noticia(id) {
      const n = D.noticias.find(x => x.id === id);
      if (!n) return paginas.naoEncontrada();
      document.title = n.titulo + " — " + D.config.nome_site;
      const rel = D.noticias.filter(x => x.id !== id && x.time === n.time).concat(D.noticias.filter(x => x.id !== id && x.time !== n.time)).slice(0, 3);
      const prods = D.produtos.filter(p => p.time === n.time).slice(0, 3);
      const url = location.href;
      return `<article class="materia">
        <span class="chapeu">${esc(n.chapeu || nomeTime(n.time))}</span>
        <h1>${esc(n.titulo)}</h1><p class="linha-fina">${esc(n.resumo)}</p>
        <div class="autor">${escudo(T[n.time], 28)}<div><b>${esc(n.autor || "Redação")}</b><div class="meta">${n.data ? new Date(n.data + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : ""}</div></div></div>
        <div class="capa">${capa(n)}</div>
        <div class="corpo">${paragrafos(n.texto)}</div>
        <div class="compartilhar">
          <a class="btn btn-verde" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(n.titulo + " " + url)}">Compartilhar no WhatsApp</a>
          <a class="btn btn-borda" href="#/time/${esc(n.time)}">Tudo sobre ${esc(nomeTime(n.time))}</a>
        </div>
        ${prods.length ? `<div class="titulo-sec"><h2>Vista o manto</h2><a href="#/time/${esc(n.time)}">ver produtos</a></div><div class="produtos" style="grid-template-columns:repeat(3,1fr)">${prods.map(cardProduto).join("")}</div>` : ""}
        <div class="titulo-sec"><h2>Leia também</h2></div>${rel.map(itemFeed).join("")}
      </article>`;
    },
    time(id) {
      const t = T[id];
      if (!t) return paginas.naoEncontrada();
      document.title = t.nome + " — " + D.config.nome_site;
      const fundo = (t.cor1 || "").toLowerCase() === "#ffffff" ? t.cor2 : t.cor1;
      const nots = D.noticias.filter(n => n.time === id);
      const prods = D.produtos.filter(p => p.time === id);
      const jogos = D.jogos.filter(j => j.casa === id || j.fora === id);
      return `<div class="time-cab" style="background:linear-gradient(110deg,${esc(fundo)} 0%,#111 130%)">
          <div class="esc">${escudo(t, 84)}</div>
          <div><div class="cat">${esc(t.categoria || "")}${t.cidade ? " · " + esc(t.cidade) : ""}</div><h1>${esc(t.nome)}</h1></div>
        </div>
        ${prods.length ? `<div class="titulo-sec"><h2>Loja do ${esc(t.nome)}</h2></div><div class="produtos">${prods.map(cardProduto).join("")}</div>` : ""}
        ${jogos.length ? `<div class="titulo-sec"><h2>Jogos</h2></div><div class="jogos-lista">${jogos.map(cardJogo).join("")}</div>` : ""}
        <div class="titulo-sec"><h2>Notícias</h2></div>
        ${nots.map(itemFeed).join("") || '<p class="meta">Ainda não há notícias deste time.</p>'}`;
    },
    loja(filtro) {
      const ids = [...new Set(D.produtos.map(p => p.time))];
      const f = filtro || "todos";
      const lista = D.produtos.filter(p => f === "todos" || p.time === f || (f === "varzea" && T[p.time]?.categoria === "Várzea") || (f === "grandes" && T[p.time]?.categoria !== "Várzea"));
      const vitrine = ids.slice(0, 3).map(i => T[i]).filter(Boolean);
      return `<div class="loja-topo"><div><h1>Loja dos Times</h1>
          <p>Camisas, bonés, bandeiras e canecas dos clubes que você ama. Cada compra de time da várzea fortalece o caixa do clube.</p></div>
          <div class="camisas">${vitrine.map(t => camisa(t, 130)).join("")}</div></div>
        <div class="filtros">
          <a class="chip ${f === "todos" ? "ativo" : ""}" href="#/loja">Todos</a>
          <a class="chip ${f === "grandes" ? "ativo" : ""}" href="#/loja/grandes">Clubes grandes</a>
          <a class="chip ${f === "varzea" ? "ativo" : ""}" href="#/loja/varzea">Várzea</a>
          ${ids.map(i => T[i] ? `<a class="chip ${f === i ? "ativo" : ""}" href="#/loja/${esc(i)}">${escudo(T[i], 16)}${esc(T[i].nome)}</a>` : "").join("")}
        </div>
        <div class="produtos">${lista.map(cardProduto).join("") || '<p class="meta">Nenhum produto neste filtro.</p>'}</div>`;
    },
    tabela() {
      const enc = D.jogos.filter(j => j.status === "encerrado").reverse();
      const prox = D.jogos.filter(j => j.status !== "encerrado");
      return `<div class="grade"><div>
          ${prox.length ? `<div class="titulo-sec"><h2>Próximos jogos</h2></div><div class="jogos-lista">${prox.map(cardJogo).join("")}</div>` : ""}
          ${enc.length ? `<div class="titulo-sec"><h2>Resultados</h2></div><div class="jogos-lista">${enc.map(cardJogo).join("")}</div>` : ""}
        </div><aside class="lateral"><div class="caixa" style="margin-top:34px"><div class="caixa-cab">${esc(D.config.campeonato)}</div>${tabelaHTML()}</div></aside></div>`;
    },
    cadastre() {
      return `<div class="titulo-sec"><h2>Coloque seu time na loja</h2></div>
        <div class="cadastro">
          <div class="passos">
            <div class="passo"><div class="n">1</div><div><h3>Mande o pedido</h3><p>Preencha o formulário com os dados do time. A gente responde pelo WhatsApp.</p></div></div>
            <div class="passo"><div class="n">2</div><div><h3>Envie fotos e preços</h3><p>Camisas, bonés, bandeiras, canecas… o que o time tiver para vender.</p></div></div>
            <div class="passo"><div class="n">3</div><div><h3>A gente divulga</h3><p>Seus produtos entram na loja, nas notícias e na página do time, para milhares de torcedores.</p></div></div>
            <div class="passo"><div class="n">4</div><div><h3>Vendeu, recebeu</h3><p>O time recebe o valor da venda e a Gazeta fica com uma pequena comissão pela divulgação. Sem mensalidade.</p></div></div>
          </div>
          <form class="form" onsubmit="App.solicitar(event)">
            <label>Nome do time *<input name="nome_time" required maxlength="60"></label>
            <div class="duas"><label>Responsável<input name="responsavel" maxlength="60"></label>
            <label>WhatsApp *<input name="whatsapp" required inputmode="tel" maxlength="20" placeholder="(11) 99999-9999"></label></div>
            <div class="duas"><label>Cidade / bairro<input name="cidade" maxlength="60"></label><label>E-mail<input name="email" type="email" maxlength="80"></label></div>
            <div class="duas"><label>Cor principal<input type="color" name="cor1" value="#0a8f3c"></label><label>Cor secundária<input type="color" name="cor2" value="#ffffff"></label></div>
            <label>O que o time quer vender?<textarea name="mensagem" rows="3" maxlength="500"></textarea></label>
            <input class="armadilha" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button class="btn btn-verde" type="submit">Enviar pedido de cadastro</button>
          </form>
        </div>`;
    },
    busca(q) {
      q = decodeURIComponent(q || "");
      const n = q.toLowerCase();
      const nots = n ? D.noticias.filter(x => (x.titulo + x.resumo + x.chapeu + nomeTime(x.time)).toLowerCase().includes(n)) : [];
      const prods = n ? D.produtos.filter(x => (x.nome + nomeTime(x.time)).toLowerCase().includes(n)) : [];
      setTimeout(() => { const c = $("#campo-busca"); c.focus(); c.setSelectionRange(c.value.length, c.value.length); });
      return `<input id="campo-busca" class="busca-campo" placeholder="Buscar notícias, times e produtos…" value="${esc(q)}" oninput="App.tecla(this.value)">
        ${prods.length ? `<div class="titulo-sec"><h2>Produtos</h2></div><div class="produtos">${prods.map(cardProduto).join("")}</div>` : ""}
        ${nots.length ? `<div class="titulo-sec"><h2>Notícias</h2></div>${nots.map(itemFeed).join("")}` : ""}
        ${n && !nots.length && !prods.length ? '<p class="vazio">Nada encontrado.</p>' : ""}`;
    },
    naoEncontrada() { return `<div class="vazio"><h2>Página não encontrada</h2><p><a href="#/" style="color:var(--verde)">Voltar para o início</a></p></div>`; },
  };

  /* ---------- Roteador ---------- */
  function rota() {
    const [, nome, arg] = (location.hash || "#/").split("/");
    document.title = D.config.nome_site + " — notícias, jogos e loja dos times";
    const fn = { "": paginas.inicio, noticias: paginas.noticias, noticia: paginas.noticia, time: paginas.time, loja: paginas.loja, tabela: paginas.tabela, cadastre: paginas.cadastre, busca: paginas.busca }[nome || ""];
    $("#app").innerHTML = fn ? fn(arg) : paginas.naoEncontrada();
    document.querySelectorAll(".topo-nav a").forEach(a => a.classList.toggle("ativo", a.getAttribute("href") === "#/" + (nome || "")));
    if (nome !== "busca") window.scrollTo(0, 0);
    fechar();
  }

  /* ---------- Cabeçalho fixo ---------- */
  function montarFixos() {
    const c = D.config;
    $("#nome-site").textContent = (c.nome_site || "gazeta da várzea").toLowerCase();
    $("#slogan").textContent = c.slogan || "";
    $("#ano").textContent = new Date().getFullYear();
    if (c.aviso) { $("#aviso").textContent = c.aviso; $("#aviso").hidden = false; }
    $("#contatos").innerHTML = [
      c.whatsapp && `<a href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>`,
      c.instagram && `<a href="https://instagram.com/${esc(c.instagram)}" target="_blank" rel="noopener">@${esc(c.instagram)}</a>`,
      c.email && `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`].filter(Boolean).join("");
    const grandes = D.times.filter(t => t.categoria !== "Várzea"), varzea = D.times.filter(t => t.categoria === "Várzea");
    const link = t => `<a class="clube" href="#/time/${esc(t.id)}" title="${esc(t.nome)}">${escudo(t, 30)}</a>`;
    $("#clubes").innerHTML = grandes.map(link).join("") + (grandes.length && varzea.length ? '<span class="clubes-sep"></span>' : "") + varzea.map(link).join("");
    $("#menu-times").innerHTML = D.times.map(t => `<a href="#/time/${esc(t.id)}">${escudo(t, 22)}${esc(t.nome)}</a>`).join("");
    $("#placar").innerHTML = D.jogos.map(j => {
      const enc = j.status === "encerrado", vivo = j.status === "ao-vivo";
      return `<a class="jogo-mini" href="#/tabela"><div class="cab"><span>${dataJogo(j)}</span><span class="${vivo ? "vivo" : enc ? "enc" : "ag"}">${vivo ? "● ao vivo" : enc ? "encerrado" : "em breve"}</span></div>
        <div class="lin">${escudo(T[j.casa], 18)}${esc(T[j.casa]?.sigla || nomeTime(j.casa))}<b>${enc || vivo ? (j.gols_casa ?? 0) : ""}</b></div>
        <div class="lin">${escudo(T[j.fora], 18)}${esc(T[j.fora]?.sigla || nomeTime(j.fora))}<b>${enc || vivo ? (j.gols_fora ?? 0) : ""}</b></div></a>`;
    }).join("");
  }

  /* ---------- Sacola ---------- */
  let sacola = [];
  try { sacola = JSON.parse(localStorage.getItem("gv_sacola") || "[]"); } catch (e) { }
  function salvarSacola() { try { localStorage.setItem("gv_sacola", JSON.stringify(sacola)); } catch (e) { } renderSacola(); }
  function renderSacola() {
    sacola = sacola.filter(i => D.produtos.some(p => p.id === i.id)); // remove produtos que saíram da loja
    $("#sacola-qtd").textContent = sacola.reduce((s, i) => s + i.q, 0);
    let total = 0;
    $("#sacola-itens").innerHTML = sacola.length ? sacola.map((i, k) => {
      const p = D.produtos.find(x => x.id === i.id); total += p.preco * i.q;
      return `<div class="s-item"><div class="img">${desenhoProduto(p, T[p.time], 56)}</div>
        <div><b>${esc(p.nome)}</b><small>${esc(nomeTime(p.time))}${i.tam ? " · Tam. " + esc(i.tam) : ""}</small>
        <div class="qtd"><button onclick="App.qtd(${k},-1)" aria-label="Menos">−</button><span>${i.q}</span><button onclick="App.qtd(${k},1)" aria-label="Mais">+</button></div></div>
        <div style="text-align:right"><b>${brl(p.preco * i.q)}</b><br><button class="rm" onclick="App.qtd(${k},-999)">remover</button></div></div>`;
    }).join("") : '<div class="vazio">Sua sacola está vazia.<br>Bora vestir o manto? 👕</div>';
    $("#sacola-total").textContent = brl(total);
  }

  function fechar() { ["#veu", "#gaveta-sacola", "#menu-lateral"].forEach(s => $(s).classList.remove("on")); }

  /* ---------- Ações públicas ---------- */
  let buscaTimer;
  window.App = {
    menu(on) { $("#menu-lateral").classList.toggle("on", on); $("#veu").classList.toggle("on", on); },
    sacola(on) { renderSacola(); $("#gaveta-sacola").classList.toggle("on", on); $("#veu").classList.toggle("on", on); },
    fechar,
    buscar() { location.hash = "#/busca/"; },
    tecla(v) { clearTimeout(buscaTimer); buscaTimer = setTimeout(() => history.replaceState(null, "", "#/busca/" + encodeURIComponent(v)) || rota(), 250); },
    adicionar(id) {
      const marcado = document.querySelector(`input[name="tam-${id}"]:checked`);
      const tam = marcado ? marcado.value : "";
      const ex = sacola.find(i => i.id === id && i.tam === tam);
      ex ? ex.q++ : sacola.push({ id, tam, q: 1 });
      salvarSacola(); toast("Adicionado à sacola ✓");
    },
    qtd(k, d) { sacola[k].q += d; if (sacola[k].q <= 0) sacola.splice(k, 1); salvarSacola(); },
    finalizar() {
      if (!sacola.length) return toast("Sua sacola está vazia");
      if (!D.config.whatsapp) return toast("WhatsApp da loja não configurado");
      let total = 0;
      const linhas = sacola.map(i => { const p = D.produtos.find(x => x.id === i.id); total += p.preco * i.q;
        return `• ${i.q}x ${p.nome} — ${nomeTime(p.time)}${i.tam ? " (tam. " + i.tam + ")" : ""} — ${brl(p.preco * i.q)} [ref ${p.id}]`; });
      const msg = `Olá, ${D.config.nome_site}! Quero fazer este pedido:\n\n${linhas.join("\n")}\n\nTotal: ${brl(total)}`;
      window.open(`https://wa.me/${D.config.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    },
    async solicitar(e) {
      e.preventDefault();
      const f = e.target, btn = f.querySelector("button");
      const dados = Object.fromEntries(new FormData(f)); dados.acao = "solicitacao";
      btn.disabled = true; btn.textContent = "Enviando…";
      try {
        const r = await fetch("api/publico.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.erro || "Erro ao enviar");
        f.outerHTML = `<div class="form" style="text-align:center;padding:40px"><h3 style="color:var(--verde);font-size:24px">Pedido enviado! ✓</h3><p>Vamos falar com você pelo WhatsApp em breve.</p></div>`;
      } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = "Enviar pedido de cadastro"; }
    },
  };
  document.addEventListener("keydown", e => { if (e.key === "Escape") fechar(); });

  /* ---------- Início ---------- */
  fetch("api/publico.php", { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(d => {
      D = d; d.times.forEach(t => T[t.id] = t);
      montarFixos(); renderSacola(); rota();
      window.addEventListener("hashchange", rota);
    })
    .catch(() => { $("#app").innerHTML = '<div class="vazio">Não foi possível carregar o conteúdo. Tente recarregar a página.</div>'; });
})();
