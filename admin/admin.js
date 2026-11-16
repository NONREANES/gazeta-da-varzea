/* Painel administrativo — Gazeta da Várzea */
(function () {
  const { escudo, produto: desenhoProduto, camisa, esc } = window.Desenhos;
  const $ = s => document.querySelector(s);
  const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  let CSRF = null, D = null, T = {};
  let editando = null; // { colecao, item }

  /* ---------- Comunicação com o servidor ---------- */
  async function api(acao, corpo, arquivo) {
    const op = { method: corpo || arquivo ? "POST" : "GET", headers: {}, credentials: "same-origin" };
    if (CSRF) op.headers["X-CSRF"] = CSRF;
    if (arquivo) { const fd = new FormData(); fd.append("acao", acao); fd.append("arquivo", arquivo); op.body = fd; }
    else if (corpo) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify({ acao, ...corpo }); }
    const r = await fetch("api.php" + (op.method === "GET" ? "?acao=" + acao : ""), op);
    const j = await r.json().catch(() => ({ erro: "Resposta inválida do servidor" }));
    if (r.status === 401 && acao !== "login") { mostrarLogin(); throw new Error(j.erro); }
    if (!r.ok) throw new Error(j.erro || "Erro " + r.status);
    return j;
  }
  async function recarregar() { D = await api("dados"); T = {}; D.times.forEach(t => T[t.id] = t); }
  function toast(msg, erro) { const t = $("#toast"); t.textContent = msg; t.className = "toast on" + (erro ? " erro" : ""); clearTimeout(t._x); t._x = setTimeout(() => t.className = "toast", 2600); }
  const nomeTime = id => T[id] ? T[id].nome : "(time removido)";
  const opcoesTimes = () => [...D.times].sort((a, b) => a.nome.localeCompare(b.nome)).map(t => [t.id, t.nome]);

  /* ---------- Definição das telas e campos ---------- */
  const ESTILOS = [["liso", "Lisa"], ["listras-v", "Listras verticais"], ["listras-h", "Listras horizontais"], ["faixa", "Faixa diagonal"], ["faixa-h", "Faixa horizontal no peito"], ["centro", "Faixa vertical central"]];
  const TIPOS = [["camisa", "Camisa"], ["bone", "Boné"], ["bandeira", "Bandeira"], ["caneca", "Caneca"], ["outro", "Outro"]];

  const SECOES = {
    times: {
      titulo: "Times", novo: "Novo time", singular: "time",
      campos: () => [
        { k: "nome", l: "Nome do time", req: true },
        { linha: [{ k: "sigla", l: "Sigla (3 letras)", max: 4 }, { k: "categoria", l: "Categoria", tipo: "select", op: [["Várzea", "Várzea"], ["Série A", "Série A"], ["Série B", "Série B"], ["Base", "Base"], ["Outros", "Outros"]] }] },
        { k: "cidade", l: "Cidade / bairro" },
        { linha: [{ k: "cor1", l: "Cor principal", tipo: "cor" }, { k: "cor2", l: "Cor secundária", tipo: "cor" }] },
        { linha: [{ k: "cor3", l: "Terceira cor (opcional)", tipo: "cor", opcional: true }, { k: "estilo", l: "Modelo da camisa", tipo: "select", op: ESTILOS }] },
        { k: "escudo", l: "Escudo (imagem)", tipo: "imagem", ajuda: "PNG com fundo transparente fica melhor. Sem imagem, o site desenha um escudo com as cores e a sigla." },
        { linha: [{ k: "whatsapp", l: "WhatsApp do responsável", ajuda: "Uso interno, não aparece no site" }, { k: "comissao", l: "Comissão deste time (%)", tipo: "numero", ajuda: "Vazio = usa a comissão padrão" }] },
        { k: "ativo", l: "Time visível no site", tipo: "check", padrao: true },
      ],
      previa: it => `${escudo(it, 70)}${camisa(it, 120)}`,
      colunas: [
        ["", it => `<div class="mini">${escudo(it, 34)}</div>`],
        ["Time", it => `<div class="principal">${esc(it.nome)}</div><div class="sec">${esc(it.categoria || "")}${it.cidade ? " · " + esc(it.cidade) : ""}</div>`],
        ["Produtos", it => D.produtos.filter(p => p.time === it.id).length, "ocultar-cel"],
        ["Comissão", it => (it.comissao || D.config.comissao_padrao || 0) + "%", "ocultar-cel"],
        ["Status", it => it.ativo === false ? '<span class="etq off">oculto</span>' : '<span class="etq ok">no ar</span>'],
      ],
      busca: it => it.nome + it.cidade + it.categoria,
      ordem: (a, b) => a.nome.localeCompare(b.nome),
    },
    produtos: {
      titulo: "Produtos da loja", novo: "Novo produto", singular: "produto",
      campos: () => [
        { k: "time", l: "Time", tipo: "select", op: opcoesTimes(), req: true },
        { k: "nome", l: "Nome do produto", req: true },
        { linha: [{ k: "tipo", l: "Tipo", tipo: "select", op: TIPOS }, { k: "tag", l: "Selo (opcional)", ajuda: "Ex.: Lançamento, Promoção" }] },
        { linha: [{ k: "preco", l: "Preço (R$)", tipo: "dinheiro", req: true }, { k: "preco_antigo", l: "Preço antigo (riscado)", tipo: "dinheiro" }] },
        { k: "imagem", l: "Foto do produto", tipo: "imagem", ajuda: "Sem foto, o site desenha o produto nas cores do time." },
        { k: "tamanhos", l: "Tamanhos (separados por vírgula)", ajuda: "Ex.: P,M,G,GG,XG — deixe vazio se não tiver tamanho", padrao: "P,M,G,GG" },
        { k: "descricao", l: "Descrição (opcional)", tipo: "texto", linhas: 2 },
        { k: "estoque", l: "Estoque (opcional)", tipo: "numero" },
        { k: "ativo", l: "Produto à venda no site", tipo: "check", padrao: true },
      ],
      previa: it => desenhoProduto(it, T[it.time], 130),
      colunas: [
        ["", it => `<div class="mini">${desenhoProduto(it, T[it.time], 40)}</div>`],
        ["Produto", it => `<div class="principal">${esc(it.nome)}</div><div class="sec">${esc(nomeTime(it.time))}${it.tag ? " · " + esc(it.tag) : ""}</div>`],
        ["Preço", it => `<b>${brl(it.preco)}</b>${it.preco_antigo ? `<div class="sec"><s>${brl(it.preco_antigo)}</s></div>` : ""}`],
        ["Status", it => it.ativo === false ? '<span class="etq off">fora da loja</span>' : '<span class="etq ok">à venda</span>'],
      ],
      filtroTime: true,
      busca: it => it.nome + nomeTime(it.time) + it.tag,
      ordem: (a, b) => nomeTime(a.time).localeCompare(nomeTime(b.time)) || a.nome.localeCompare(b.nome),
    },
    noticias: {
      titulo: "Notícias", novo: "Nova notícia", singular: "notícia",
      campos: () => [
        { k: "titulo", l: "Título", req: true },
        { linha: [{ k: "chapeu", l: "Chapéu (assunto)", ajuda: "Ex.: Varzeano 2026, Bastidores" }, { k: "time", l: "Time relacionado", tipo: "select", op: [["", "— nenhum —"], ...opcoesTimes()] }] },
        { k: "resumo", l: "Linha fina (resumo)", tipo: "texto", linhas: 2 },
        { k: "texto", l: "Texto da matéria", tipo: "texto", linhas: 12, ajuda: "Deixe uma linha em branco entre os parágrafos." },
        { k: "imagem", l: "Foto de capa", tipo: "imagem", ajuda: "Sem foto, o site usa uma ilustração nas cores do time." },
        { linha: [{ k: "autor", l: "Autor", padrao: "Redação Gazeta" }, { k: "data", l: "Data", tipo: "data", padrao: () => new Date().toISOString().slice(0, 10) }] },
        { k: "destaque", l: "Destaque principal da capa", tipo: "check" },
        { k: "ativo", l: "Publicada", tipo: "check", padrao: true },
      ],
      colunas: [
        ["", it => `<div class="mini">${it.imagem ? `<img src="${esc(it.imagem)}">` : escudo(T[it.time] || { cor1: "#0a8f3c", sigla: "GV" }, 30)}</div>`],
        ["Título", it => `<div class="principal">${esc(it.titulo)}</div><div class="sec">${esc(it.chapeu || "")}${it.time ? " · " + esc(nomeTime(it.time)) : ""}</div>`],
        ["Data", it => it.data ? new Date(it.data + "T12:00").toLocaleDateString("pt-BR") : "", "ocultar-cel"],
        ["Status", it => (it.destaque ? '<span class="etq alerta">destaque</span> ' : "") + (it.ativo === false ? '<span class="etq off">rascunho</span>' : '<span class="etq ok">publicada</span>')],
      ],
      busca: it => it.titulo + it.chapeu + nomeTime(it.time),
      ordem: (a, b) => (b.data || "").localeCompare(a.data || ""),
    },
    jogos: {
      titulo: "Jogos e resultados", novo: "Novo jogo", singular: "jogo",
      campos: () => [
        { k: "campeonato", l: "Campeonato", padrao: () => D.config.campeonato || "" },
        { linha: [{ k: "casa", l: "Mandante", tipo: "select", op: opcoesTimes(), req: true }, { k: "fora", l: "Visitante", tipo: "select", op: opcoesTimes(), req: true }] },
        { linha: [{ k: "gols_casa", l: "Gols mandante", tipo: "numero" }, { k: "gols_fora", l: "Gols visitante", tipo: "numero" }] },
        { linha: [{ k: "data", l: "Data", tipo: "data", req: true }, { k: "hora", l: "Hora", tipo: "hora" }] },
        { k: "local", l: "Local / campo" },
        { k: "status", l: "Situação", tipo: "select", op: [["agendado", "Agendado"], ["ao-vivo", "Ao vivo"], ["encerrado", "Encerrado"], ["adiado", "Adiado"]] },
      ],
      colunas: [
        ["Jogo", it => `<div class="principal">${esc(nomeTime(it.casa))} ${it.status === "encerrado" || it.status === "ao-vivo" ? `<b>${it.gols_casa ?? 0} × ${it.gols_fora ?? 0}</b>` : "×"} ${esc(nomeTime(it.fora))}</div><div class="sec">${esc(it.campeonato || "")} · ${esc(it.local || "")}</div>`],
        ["Data", it => (it.data ? new Date(it.data + "T12:00").toLocaleDateString("pt-BR") : "") + " " + esc(it.hora || "")],
        ["Situação", it => `<span class="etq ${it.status === "encerrado" ? "" : it.status === "ao-vivo" ? "off" : "ok"}">${esc(it.status || "")}</span>`],
      ],
      busca: it => nomeTime(it.casa) + nomeTime(it.fora) + it.local + it.campeonato,
      ordem: (a, b) => ((b.data || "") + (b.hora || "")).localeCompare((a.data || "") + (a.hora || "")),
      extra: () => `<button class="btn" onclick="Admin.recalcular()">↻ Recalcular tabela pelos resultados</button>`,
    },
    tabela: {
      titulo: "Tabela de classificação", novo: "Adicionar time à tabela", singular: "linha",
      campos: () => [
        { k: "time", l: "Time", tipo: "select", op: opcoesTimes(), req: true },
        { linha: [{ k: "pontos", l: "Pontos", tipo: "numero" }, { k: "jogos", l: "Jogos", tipo: "numero" }] },
        { linha: [{ k: "vitorias", l: "Vitórias", tipo: "numero" }, { k: "empates", l: "Empates", tipo: "numero" }] },
        { linha: [{ k: "derrotas", l: "Derrotas", tipo: "numero" }, { k: "saldo", l: "Saldo de gols", tipo: "numero" }] },
      ],
      colunas: [
        ["#", (it, i) => `<b>${i + 1}</b>`],
        ["Time", it => `<div style="display:flex;gap:8px;align-items:center">${escudo(T[it.time], 22)}<b>${esc(nomeTime(it.time))}</b></div>`],
        ["P", it => `<b>${+it.pontos || 0}</b>`], ["J", it => +it.jogos || 0], ["V", it => +it.vitorias || 0, "ocultar-cel"], ["E", it => +it.empates || 0, "ocultar-cel"], ["D", it => +it.derrotas || 0, "ocultar-cel"], ["SG", it => +it.saldo || 0],
      ],
      ordem: (a, b) => (+b.pontos - +a.pontos) || (+b.vitorias - +a.vitorias) || (+b.saldo - +a.saldo),
      dica: "Você pode editar os números à mão ou, na tela de Jogos, usar “Recalcular tabela pelos resultados” para montar a tabela automaticamente.",
    },
    vendas: {
      titulo: "Vendas e comissões", novo: "Registrar venda", singular: "venda",
      campos: () => [
        { k: "produto", l: "Produto", tipo: "select", op: [["", "— escolha —"], ...D.produtos.map(p => [p.id, `${nomeTime(p.time)} — ${p.nome} (${brl(p.preco)})`])], req: true, aoMudar: "Admin.produtoVenda(this.value)" },
        { linha: [{ k: "quantidade", l: "Quantidade", tipo: "numero", padrao: 1, req: true }, { k: "valor_unit", l: "Valor unitário (R$)", tipo: "dinheiro", req: true }] },
        { linha: [{ k: "tamanho", l: "Tamanho" }, { k: "cliente", l: "Cliente" }] },
        { linha: [{ k: "data", l: "Data", tipo: "data", padrao: () => new Date().toISOString().slice(0, 10) }, { k: "status", l: "Situação", tipo: "select", op: [["pendente", "Aguardando pagamento"], ["pago", "Pago"], ["repassado", "Pago e repassado ao time"], ["cancelado", "Cancelado"]] }] },
        { k: "obs", l: "Observações", tipo: "texto", linhas: 2 },
        { k: "time", tipo: "oculto" },
      ],
      colunas: [
        ["Venda", it => { const p = D.produtos.find(x => x.id === it.produto); return `<div class="principal">${it.quantidade}× ${esc(p ? p.nome : "(produto removido)")}</div><div class="sec">${esc(nomeTime(it.time))}${it.cliente ? " · " + esc(it.cliente) : ""}${it.tamanho ? " · tam. " + esc(it.tamanho) : ""}</div>`; }],
        ["Data", it => it.data ? new Date(it.data + "T12:00").toLocaleDateString("pt-BR") : "", "ocultar-cel"],
        ["Total", it => `<b>${brl(it.quantidade * it.valor_unit)}</b>`],
        ["Sua comissão", it => brl(it.quantidade * it.valor_unit * taxa(it.time) / 100), "ocultar-cel"],
        ["Situação", it => `<span class="etq ${{ pago: "ok", repassado: "", pendente: "alerta", cancelado: "off" }[it.status] || ""}">${esc({ pendente: "aguardando", pago: "pago", repassado: "repassado", cancelado: "cancelado" }[it.status] || it.status)}</span>`],
      ],
      busca: it => nomeTime(it.time) + it.cliente,
      ordem: (a, b) => (b.data || "").localeCompare(a.data || ""),
      topo: () => resumoVendas(),
      filtroTime: true,
    },
  };
  const taxa = idTime => parseFloat((T[idTime] && T[idTime].comissao) || D.config.comissao_padrao || 0);

  /* ---------- Menu ---------- */
  const MENU = [["inicio", "Início"], ["solicitacoes", "Pedidos de cadastro"], ["times", "Times"], ["produtos", "Produtos"], ["noticias", "Notícias"], ["jogos", "Jogos"], ["tabela", "Tabela"], ["vendas", "Vendas e comissões"], ["config", "Configurações"]];
  function montarMenu(atual) {
    const pend = D.solicitacoes.filter(s => s.status === "pendente").length;
    $("#menu").innerHTML = MENU.map(([k, l]) => `<a href="#${k}" class="${k === atual ? "ativo" : ""}">${l}${k === "solicitacoes" && pend ? `<span class="badge">${pend}</span>` : ""}</a>`).join("");
  }

  /* ---------- Telas ---------- */
  let filtro = { busca: "", time: "" };
  function tela() {
    const nome = (location.hash || "#inicio").slice(1);
    document.body.classList.remove("menu-on");
    montarMenu(nome);
    $("#acoes-topo").innerHTML = "";
    if (nome === "inicio") return telaInicio();
    if (nome === "solicitacoes") return telaSolicitacoes();
    if (nome === "config") return telaConfig();
    if (SECOES[nome]) return telaLista(nome);
    location.hash = "#inicio";
  }

  function telaInicio() {
    $("#titulo").textContent = "Início";
    const pend = D.solicitacoes.filter(s => s.status === "pendente");
    const vendasMes = D.vendas.filter(v => (v.status === "pago" || v.status === "repassado") && (v.data || "").slice(0, 7) === new Date().toISOString().slice(0, 7));
    const totMes = vendasMes.reduce((s, v) => s + v.quantidade * v.valor_unit, 0);
    const comMes = vendasMes.reduce((s, v) => s + v.quantidade * v.valor_unit * taxa(v.time) / 100, 0);
    $("#area").innerHTML = `
      <div class="resumo">
        <a class="cartao" href="#times"><b>${D.times.length}</b><span>times cadastrados</span></a>
        <a class="cartao" href="#produtos"><b>${D.produtos.filter(p => p.ativo !== false).length}</b><span>produtos à venda</span></a>
        <a class="cartao" href="#vendas"><b>${brl(totMes)}</b><span>vendido no mês (pago)</span></a>
        <a class="cartao" href="#vendas"><b>${brl(comMes)}</b><span>sua comissão no mês</span></a>
      </div>
      <div class="grade2">
        <div class="cartao"><h3 style="margin-bottom:10px">Pedidos de cadastro pendentes</h3>
          ${pend.length ? pend.map(s => `<p style="padding:6px 0;border-bottom:1px solid var(--linha)"><b>${esc(s.nome_time)}</b> <span style="color:var(--suave)">· ${esc(s.cidade || "")} · ${esc(s.data)}</span></p>`).join("") + `<p style="margin-top:12px"><a class="btn btn-verde" href="#solicitacoes">Ver pedidos</a></p>` : '<p style="color:var(--suave)">Nenhum pedido novo.</p>'}
        </div>
        <div class="cartao"><h3 style="margin-bottom:10px">Atalhos</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <button class="btn btn-verde" onclick="Admin.novo('noticias')">+ Nova notícia</button>
            <button class="btn" onclick="Admin.novo('produtos')">+ Novo produto</button>
            <button class="btn" onclick="Admin.novo('times')">+ Novo time</button>
            <button class="btn" onclick="Admin.novo('jogos')">+ Novo jogo</button>
            <button class="btn" onclick="Admin.novo('vendas')">+ Registrar venda</button>
          </div></div>
      </div>`;
  }

  function telaLista(col) {
    const S = SECOES[col];
    $("#titulo").textContent = S.titulo;
    $("#acoes-topo").innerHTML = `<button class="btn btn-verde" onclick="Admin.novo('${col}')">+ ${S.novo}</button>`;
    let itens = [...D[col]];
    if (S.ordem) itens.sort(S.ordem);
    const termo = filtro.busca.toLowerCase();
    if (termo && S.busca) itens = itens.filter(it => S.busca(it).toLowerCase().includes(termo));
    if (filtro.time && S.filtroTime) itens = itens.filter(it => it.time === filtro.time);
    $("#area").innerHTML = `
      ${S.dica ? `<div class="dica">${S.dica}</div>` : ""}
      ${S.topo ? S.topo() : ""}
      <div class="barra-ferr">
        ${S.busca ? `<input type="search" placeholder="Buscar…" value="${esc(filtro.busca)}" oninput="Admin.filtrar('busca',this.value)">` : ""}
        ${S.filtroTime ? `<select onchange="Admin.filtrar('time',this.value)"><option value="">Todos os times</option>${opcoesTimes().map(([v, l]) => `<option value="${v}" ${v === filtro.time ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : ""}
        ${S.extra ? S.extra() : ""}
      </div>
      ${itens.length ? `<table class="lista"><thead><tr>${S.colunas.map(c => `<th class="${c[2] || ""}">${c[0]}</th>`).join("")}<th></th></tr></thead><tbody>
        ${itens.map((it, i) => `<tr>${S.colunas.map(c => `<td class="${c[2] || ""}">${c[1](it, i)}</td>`).join("")}
          <td class="acoes"><button class="btn btn-peq" onclick="Admin.editar('${col}','${it.id}')">Editar</button>
          <button class="btn btn-peq btn-perigo" onclick="Admin.excluir('${col}','${it.id}')">Excluir</button></td></tr>`).join("")}
      </tbody></table>` : `<div class="vazio">Nada por aqui ainda. <a href="#" style="color:var(--verde);font-weight:700" onclick="Admin.novo('${col}');return false">${S.novo}</a></div>`}`;
    const busca = $(".barra-ferr input[type=search]");
    if (busca && filtro.busca) { busca.focus(); busca.setSelectionRange(busca.value.length, busca.value.length); }
  }

  function resumoVendas() {
    const validas = D.vendas.filter(v => v.status !== "cancelado");
    const porTime = {};
    validas.forEach(v => {
      const t = porTime[v.time] ??= { total: 0, comissao: 0, aRepassar: 0 };
      const val = v.quantidade * v.valor_unit, com = val * taxa(v.time) / 100;
      t.total += val; t.comissao += com;
      if (v.status === "pago") t.aRepassar += val - com;
    });
    const tot = Object.values(porTime).reduce((a, t) => ({ total: a.total + t.total, comissao: a.comissao + t.comissao, aRepassar: a.aRepassar + t.aRepassar }), { total: 0, comissao: 0, aRepassar: 0 });
    return `<div class="resumo">
        <div class="cartao"><b>${brl(tot.total)}</b><span>total em vendas</span></div>
        <div class="cartao"><b>${brl(tot.comissao)}</b><span>sua comissão</span></div>
        <div class="cartao"><b>${brl(tot.aRepassar)}</b><span>a repassar aos times (pagas)</span></div>
        <div class="cartao"><b>${D.config.comissao_padrao || 0}%</b><span>comissão padrão</span></div>
      </div>
      ${Object.keys(porTime).length ? `<table class="lista" style="margin-bottom:20px"><thead><tr><th>Time</th><th>Vendido</th><th>Comissão</th><th>A repassar</th></tr></thead><tbody>
        ${Object.entries(porTime).map(([id, t]) => `<tr><td><b>${esc(nomeTime(id))}</b> <span class="sec">(${taxa(id)}%)</span></td><td>${brl(t.total)}</td><td>${brl(t.comissao)}</td><td><b>${brl(t.aRepassar)}</b></td></tr>`).join("")}
      </tbody></table>` : ""}
      <div class="dica">Quando um pedido chegar pelo WhatsApp, registre aqui. Marque <b>Pago</b> quando receber e <b>Repassado</b> depois de pagar o time.</div>`;
  }

  function telaSolicitacoes() {
    $("#titulo").textContent = "Pedidos de cadastro de times";
    const lista = [...D.solicitacoes].sort((a, b) => (a.status === "pendente" ? -1 : 1) - (b.status === "pendente" ? -1 : 1) || (b.data || "").localeCompare(a.data || ""));
    $("#area").innerHTML = `<div class="dica">Times que preencheram o formulário “Cadastre seu time” no site. Ao aprovar, o time é criado e você já pode completar o cadastro e adicionar os produtos.</div>` +
      (lista.length ? lista.map(s => `<div class="cartao sol">
        <div class="cores"><i style="background:${esc(s.cor1 || "#ccc")}"></i><i style="background:${esc(s.cor2 || "#fff")}"></i></div>
        <div><b style="font-size:17px">${esc(s.nome_time)}</b> <span class="etq ${s.status === "pendente" ? "alerta" : s.status === "aprovado" ? "ok" : "off"}">${esc(s.status)}</span>
          <div class="sec" style="color:var(--suave);margin-top:4px">${esc(s.responsavel || "")} · ${esc(s.whatsapp || "")} · ${esc(s.email || "")} · ${esc(s.cidade || "")} · enviado ${esc(s.data || "")}</div>
          ${s.mensagem ? `<p style="margin-top:6px">“${esc(s.mensagem)}”</p>` : ""}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${s.whatsapp ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(String(s.whatsapp).replace(/\D/g, "").replace(/^(?!55)/, "55"))}">WhatsApp</a>` : ""}
          ${s.status === "pendente" ? `<button class="btn btn-verde" onclick="Admin.aprovar('${s.id}')">Aprovar e criar time</button><button class="btn" onclick="Admin.statusSol('${s.id}','recusado')">Recusar</button>` : ""}
          <button class="btn btn-perigo" onclick="Admin.excluir('solicitacoes','${s.id}')">Excluir</button>
        </div></div>`).join("") : '<div class="vazio">Nenhum pedido recebido ainda.</div>');
  }

  function telaConfig() {
    $("#titulo").textContent = "Configurações";
    const c = D.config;
    const campo = (k, l, ajuda, tipo) => `<label class="campo"><span>${l}</span><input name="${k}" type="${tipo || "text"}" value="${esc(c[k] || "")}">${ajuda ? `<small>${ajuda}</small>` : ""}</label>`;
    $("#area").innerHTML = `<form class="cartao" style="max-width:680px;display:grid;gap:14px" onsubmit="Admin.salvarConfig(event)">
      ${campo("nome_site", "Nome do site")}
      ${campo("slogan", "Slogan")}
      ${campo("whatsapp", "WhatsApp da loja", "Só números, com 55 + DDD. Ex.: 5511999999999. Os pedidos da sacola chegam aqui.")}
      <div class="linha2">${campo("instagram", "Instagram (sem @)")}${campo("email", "E-mail de contato", "", "email")}</div>
      <div class="linha2">${campo("campeonato", "Campeonato principal", "Nome usado na tabela e no recálculo")}${campo("comissao_padrao", "Comissão padrão (%)", "Pode ser diferente por time", "number")}</div>
      ${campo("aviso", "Aviso no topo do site (opcional)", "Ex.: Rodada adiada por causa da chuva. Deixe vazio para esconder.")}
      <div><button class="btn btn-verde" type="submit">Salvar configurações</button></div>
    </form>`;
  }

  /* ---------- Editor ---------- */
  function htmlCampo(c, it) {
    if (c.linha) return `<div class="linha2">${c.linha.map(x => htmlCampo(x, it)).join("")}</div>`;
    let v = it[c.k];
    if (v === undefined) v = typeof c.padrao === "function" ? c.padrao() : (c.padrao ?? "");
    const req = c.req ? "required" : "";
    const ajuda = c.ajuda ? `<small>${c.ajuda}</small>` : "";
    const mud = c.aoMudar ? `onchange="${c.aoMudar}"` : "";
    switch (c.tipo) {
      case "oculto": return `<input type="hidden" name="${c.k}" value="${esc(v)}">`;
      case "texto": return `<label class="campo"><span>${c.l}</span><textarea name="${c.k}" rows="${c.linhas || 3}" ${req}>${esc(v)}</textarea>${ajuda}</label>`;
      case "select": return `<label class="campo"><span>${c.l}</span><select name="${c.k}" ${req} ${mud}>${c.op.map(([o, l]) => `<option value="${esc(o)}" ${String(o) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${ajuda}</label>`;
      case "check": return `<label class="check"><input type="checkbox" name="${c.k}" ${v === true || v === "1" ? "checked" : ""}>${c.l}</label>`;
      case "cor": {
        const val = v || (c.opcional ? "" : "#ffffff");
        return `<label class="campo"><span>${c.l}</span><div class="cor-linha"><input type="color" value="${esc(val || "#ffffff")}" oninput="this.nextElementSibling.value=this.value;Admin.previa()">
          <input type="text" name="${c.k}" value="${esc(val)}" placeholder="${c.opcional ? "nenhuma" : ""}" maxlength="7" oninput="if(/^#[0-9a-f]{6}$/i.test(this.value))this.previousElementSibling.value=this.value;Admin.previa()"></div>${ajuda}</label>`;
      }
      case "imagem": return `<div class="campo"><span>${c.l}</span><div class="img-campo">
          <div class="prev" id="prev-${c.k}">${v ? `<img src="${esc(v)}">` : "<small>sem imagem</small>"}</div>
          <div class="bts"><input type="hidden" name="${c.k}" value="${esc(v)}">
            <label class="btn btn-peq">📷 Enviar imagem<input type="file" accept="image/*" hidden onchange="Admin.enviarImagem(this,'${c.k}')"></label>
            ${v ? `<button type="button" class="btn btn-peq btn-perigo" onclick="Admin.removerImagem('${c.k}')">Remover imagem</button>` : ""}
          </div></div>${ajuda}</div>`;
      default: {
        const tipo = { numero: "number", dinheiro: "number", data: "date", hora: "time" }[c.tipo] || "text";
        const passo = c.tipo === "dinheiro" ? 'step="0.01" min="0"' : c.tipo === "numero" ? 'step="1"' : "";
        return `<label class="campo"><span>${c.l}</span><input type="${tipo}" name="${c.k}" value="${esc(v)}" ${passo} ${req} ${c.max ? `maxlength="${c.max}"` : ""} ${mud}>${ajuda}</label>`;
      }
    }
  }
  function todosCampos(col) { return SECOES[col].campos().flatMap(c => c.linha || [c]); }
  function lerForm(col) {
    const f = $("#editor-form"), it = {};
    todosCampos(col).forEach(c => {
      const el = f.elements[c.k]; if (!el) return;
      if (c.tipo === "check") it[c.k] = el.checked;
      else if (c.tipo === "numero" || c.tipo === "dinheiro") it[c.k] = el.value === "" ? "" : Number(el.value);
      else it[c.k] = el.value;
    });
    return it;
  }
  function abrirEditor(col, item) {
    editando = { colecao: col, item: item || {} };
    const S = SECOES[col];
    $("#editor-titulo").textContent = (item && item.id ? "Editar " : "Novo(a) ") + S.singular;
    $("#editor-campos").innerHTML = S.campos().map(c => htmlCampo(c, editando.item)).join("");
    $("#editor-form").oninput = () => Admin.previa();
    Admin.previa();
    $("#editor").classList.add("on"); $("#veu").classList.add("on");
    setTimeout(() => { const p = $("#editor-campos input:not([type=hidden]),#editor-campos select"); p && p.focus(); }, 260);
  }

  /* ---------- Ações ---------- */
  window.Admin = {
    async entrar(e) {
      e.preventDefault();
      const f = e.target; $("#erro-login").textContent = "";
      try {
        const r = await api("login", { usuario: f.usuario.value, senha: f.senha.value });
        CSRF = r.csrf; f.senha.value = ""; await iniciarPainel();
      } catch (err) { $("#erro-login").textContent = err.message; }
    },
    async sair() { await api("logout").catch(() => { }); CSRF = null; mostrarLogin(); },
    filtrar(k, v) { filtro[k] = v; tela(); },
    novo(col) { if (location.hash.slice(1) !== col && SECOES[col]) location.hash = "#" + col; abrirEditor(col, null); },
    editar(col, id) { abrirEditor(col, structuredClone(D[col].find(x => x.id === id))); },
    fecharEditor() { $("#editor").classList.remove("on"); $("#veu").classList.remove("on"); editando = null; },
    previa() {
      if (!editando) return;
      const S = SECOES[editando.colecao];
      $("#editor-previa").innerHTML = S.previa ? S.previa({ ...editando.item, ...lerForm(editando.colecao) }) : "";
    },
    produtoVenda(id) {
      const p = D.produtos.find(x => x.id === id), f = $("#editor-form");
      if (!p) return;
      f.elements.valor_unit.value = p.preco; f.elements.time.value = p.time;
    },
    async salvar(e) {
      e.preventDefault();
      const { colecao } = editando;
      const item = { ...lerForm(colecao) };
      if (editando.item.id) item.id = editando.item.id;
      if (colecao === "jogos" && item.casa === item.fora) return toast("Mandante e visitante precisam ser diferentes", true);
      if (colecao === "vendas" && !item.time) { const p = D.produtos.find(x => x.id === item.produto); if (p) item.time = p.time; }
      if (colecao === "times" && !item.sigla) item.sigla = item.nome.replace(/[^\p{L}]/gu, "").slice(0, 3).toUpperCase();
      const btn = e.submitter; if (btn) btn.disabled = true;
      try {
        await api("salvar", { colecao, item });
        await recarregar(); Admin.fecharEditor(); tela(); toast("Salvo ✓");
      } catch (err) { toast(err.message, true); }
      finally { if (btn) btn.disabled = false; }
    },
    async excluir(col, id) {
      if (!confirm("Excluir este item? Essa ação não pode ser desfeita (mas existe backup automático).")) return;
      try { await api("excluir", { colecao: col, id }); await recarregar(); tela(); toast("Excluído"); }
      catch (err) { toast(err.message, true); }
    },
    async enviarImagem(input, campo) {
      const arq = input.files[0]; if (!arq) return;
      const prev = $("#prev-" + campo); prev.innerHTML = "<small>enviando…</small>";
      try {
        const r = await api("upload", null, arq);
        $("#editor-form").elements[campo].value = r.url;
        prev.innerHTML = `<img src="${esc(r.url)}">`;
        Admin.previa(); toast("Imagem enviada ✓");
      } catch (err) { prev.innerHTML = "<small>erro</small>"; toast(err.message, true); }
      input.value = "";
    },
    removerImagem(campo) { $("#editor-form").elements[campo].value = ""; $("#prev-" + campo).innerHTML = "<small>sem imagem</small>"; Admin.previa(); },
    async aprovar(id) {
      try {
        const r = await api("aprovar_solicitacao", { id });
        await recarregar(); location.hash = "#times"; tela();
        toast("Time criado! Complete o cadastro."); abrirEditor("times", structuredClone(T[r.time.id]));
      } catch (err) { toast(err.message, true); }
    },
    async statusSol(id, status) {
      const s = D.solicitacoes.find(x => x.id === id);
      try { await api("salvar", { colecao: "solicitacoes", item: { ...s, status } }); await recarregar(); tela(); }
      catch (err) { toast(err.message, true); }
    },
    async salvarConfig(e) {
      e.preventDefault();
      try { await api("config", { config: Object.fromEntries(new FormData(e.target)) }); await recarregar(); toast("Configurações salvas ✓"); }
      catch (err) { toast(err.message, true); }
    },
    async recalcular() {
      if (!confirm(`Substituir a tabela atual pela calculada a partir dos jogos encerrados do campeonato "${D.config.campeonato}"?`)) return;
      try { const r = await api("recalcular_tabela", {}); await recarregar(); location.hash = "#tabela"; tela(); toast(`Tabela recalculada (${r.linhas} times)`); }
      catch (err) { toast(err.message, true); }
    },
  };

  /* ---------- Início ---------- */
  function mostrarLogin() { $("#tela-painel").hidden = true; $("#tela-login").hidden = false; }
  async function iniciarPainel() {
    await recarregar();
    $("#tela-login").hidden = true; $("#tela-painel").hidden = false;
    tela();
  }
  window.addEventListener("hashchange", () => { filtro = { busca: "", time: "" }; tela(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") Admin.fecharEditor(); });
  api("sessao").then(r => { if (r.logado) { CSRF = r.csrf; iniciarPainel(); } else mostrarLogin(); }).catch(mostrarLogin);
})();
