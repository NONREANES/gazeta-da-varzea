<?php
// Painel administrativo — o conteúdo é carregado pelo admin.js após o login.
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow');
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Painel · Gazeta da Várzea</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="admin.css">
</head>
<body>

<!-- Login -->
<div id="tela-login" class="login" hidden>
  <form class="login-caixa" onsubmit="Admin.entrar(event)">
    <div class="marca"><span class="marca-sel">gv</span> painel</div>
    <label>Usuário<input name="usuario" autocomplete="username" required value="admin"></label>
    <label>Senha<input name="senha" type="password" autocomplete="current-password" required autofocus></label>
    <button class="btn btn-verde" type="submit">Entrar</button>
    <p class="erro" id="erro-login"></p>
  </form>
</div>

<!-- Painel -->
<div id="tela-painel" class="painel" hidden>
  <aside class="menu">
    <div class="marca"><span class="marca-sel">gv</span> painel</div>
    <nav id="menu"></nav>
    <div class="menu-rodape">
      <a href="../" target="_blank">↗ Ver o site</a>
      <a href="api.php?acao=backup">⬇ Baixar backup</a>
      <a href="#" onclick="Admin.sair();return false">Sair</a>
    </div>
  </aside>
  <main class="conteudo">
    <header class="cabecalho"><button class="hamb" onclick="document.body.classList.toggle('menu-on')" aria-label="Menu">☰</button><h1 id="titulo">—</h1><div id="acoes-topo"></div></header>
    <div id="area"></div>
  </main>
</div>

<!-- Editor (formulário lateral) -->
<div class="veu" id="veu" onclick="Admin.fecharEditor()"></div>
<aside class="editor" id="editor" aria-label="Editor">
  <header><h2 id="editor-titulo">Editar</h2><button onclick="Admin.fecharEditor()" aria-label="Fechar">×</button></header>
  <form id="editor-form" onsubmit="Admin.salvar(event)">
    <div id="editor-previa" class="previa"></div>
    <div id="editor-campos"></div>
    <footer><button type="button" class="btn" onclick="Admin.fecharEditor()">Cancelar</button><button class="btn btn-verde" type="submit">Salvar</button></footer>
  </form>
</aside>

<div class="toast" id="toast"></div>

<script src="../assets/js/desenhos.js"></script>
<script src="admin.js"></script>
</body>
</html>
