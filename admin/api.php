<?php
/** API do painel administrativo. Todas as ações exigem login (exceto o próprio login). */
require dirname(__DIR__) . '/inc/bootstrap.php';
iniciar_sessao();

$metodo = $_SERVER['REQUEST_METHOD'];
$in = $metodo === 'POST' && str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')
    ? (json_decode(file_get_contents('php://input') ?: '{}', true) ?: [])
    : $_POST;
$acao = $in['acao'] ?? $_GET['acao'] ?? '';

/* ---------- Login / sessão ---------- */
if ($acao === 'login' && $metodo === 'POST') {
    if (!limitar('login', 8, 900)) resposta(['erro' => 'Muitas tentativas. Aguarde 15 minutos.'], 429);
    if (strlen(ADMIN_SENHA) < 8) resposta(['erro' => 'Senha do painel não configurada. Defina a variável ADMIN_SENHA (mínimo 8 caracteres).'], 500);
    if (!senha_valida((string)($in['usuario'] ?? ''), (string)($in['senha'] ?? ''))) {
        usleep(400000);
        resposta(['erro' => 'Usuário ou senha incorretos.'], 401);
    }
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    $_SESSION['expira'] = time() + 8 * 3600;
    resposta(['ok' => true, 'csrf' => token_csrf()]);
}
if ($acao === 'sessao') resposta(['logado' => logado(), 'csrf' => logado() ? token_csrf() : null]);
if ($acao === 'logout') { iniciar_sessao(); session_destroy(); resposta(['ok' => true]); }

/* ---------- Daqui para baixo: só logado ---------- */
if (!logado()) resposta(['erro' => 'Sessão expirada. Entre novamente.'], 401);
if ($metodo === 'POST' && !hash_equals(token_csrf(), (string)($_SERVER['HTTP_X_CSRF'] ?? ''))) {
    resposta(['erro' => 'Token de segurança inválido. Recarregue a página.'], 403);
}

$d = ler_dados();

switch ($acao) {
    case 'dados':
        resposta($d);

    case 'salvar': {
        $col = (string)($in['colecao'] ?? '');
        if (!isset(COLECOES[$col])) resposta(['erro' => 'Coleção inválida'], 400);
        $item = limpar_registro($col, (array)($in['item'] ?? []));
        $id = (string)($in['item']['id'] ?? '');
        if ($id !== '') {
            $achou = false;
            foreach ($d[$col] as &$reg) if (($reg['id'] ?? '') === $id) { $reg = array_merge($reg, $item); $achou = true; }
            unset($reg);
            if (!$achou) resposta(['erro' => 'Registro não encontrado'], 404);
        } else {
            $item['id'] = novo_id();
            $d[$col][] = $item;
            $id = $item['id'];
        }
        gravar_dados($d);
        resposta(['ok' => true, 'id' => $id]);
    }

    case 'excluir': {
        $col = (string)($in['colecao'] ?? '');
        if (!isset(COLECOES[$col])) resposta(['erro' => 'Coleção inválida'], 400);
        $id = (string)($in['id'] ?? '');
        if ($col === 'times') {
            $usados = array_filter($d['produtos'], fn($p) => ($p['time'] ?? '') === $id);
            if ($usados) resposta(['erro' => 'Este time tem ' . count($usados) . ' produto(s). Exclua ou mova os produtos antes, ou apenas desative o time.'], 409);
        }
        $d[$col] = array_values(array_filter($d[$col], fn($r) => ($r['id'] ?? '') !== $id));
        gravar_dados($d);
        resposta(['ok' => true]);
    }

    case 'aprovar_solicitacao': {
        $id = (string)($in['id'] ?? '');
        foreach ($d['solicitacoes'] as &$s) {
            if (($s['id'] ?? '') !== $id) continue;
            $time = [
                'id' => novo_id(), 'nome' => $s['nome_time'], 'sigla' => mb_strtoupper(mb_substr(preg_replace('/[^\p{L}]/u', '', $s['nome_time']), 0, 3)),
                'cor1' => $s['cor1'] ?: '#1a7f37', 'cor2' => $s['cor2'] ?: '#ffffff', 'cor3' => '', 'estilo' => 'liso',
                'escudo' => '', 'categoria' => 'Várzea', 'cidade' => $s['cidade'] ?? '', 'whatsapp' => $s['whatsapp'] ?? '',
                'comissao' => '', 'ativo' => true,
            ];
            $d['times'][] = $time;
            $s['status'] = 'aprovado';
            unset($s);
            gravar_dados($d);
            resposta(['ok' => true, 'time' => $time]);
        }
        resposta(['erro' => 'Solicitação não encontrada'], 404);
    }

    case 'config': {
        $permitidos = ['nome_site','slogan','whatsapp','instagram','email','campeonato','aviso','comissao_padrao'];
        foreach ($permitidos as $k) if (array_key_exists($k, (array)($in['config'] ?? []))) {
            $d['config'][$k] = trim(mb_substr((string)$in['config'][$k], 0, 300));
        }
        gravar_dados($d);
        resposta(['ok' => true]);
    }

    case 'upload': {
        $f = $_FILES['arquivo'] ?? null;
        if (!$f || $f['error'] !== UPLOAD_ERR_OK) resposta(['erro' => 'Falha no envio da imagem.'], 400);
        if ($f['size'] > UPLOAD_MAX_MB * 1024 * 1024) resposta(['erro' => 'Imagem maior que ' . UPLOAD_MAX_MB . ' MB.'], 413);
        $tipos = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
        if (!isset($tipos[$mime]) || !getimagesize($f['tmp_name'])) resposta(['erro' => 'Envie uma imagem JPG, PNG, WEBP ou GIF.'], 415);
        $nome = date('Ymd') . '-' . bin2hex(random_bytes(6));
        $destino = PASTA_UPLOADS . '/' . $nome;
        $ext = otimizar_imagem($f['tmp_name'], $mime, $destino) ?? $tipos[$mime];
        if (!file_exists("$destino.$ext")) move_uploaded_file($f['tmp_name'], "$destino.$ext");
        resposta(['ok' => true, 'url' => "/uploads/$nome.$ext"]);
    }

    case 'recalcular_tabela': {
        // Monta a classificação a partir dos jogos encerrados do campeonato configurado
        $camp = $d['config']['campeonato'] ?? '';
        $tab = [];
        foreach ($d['jogos'] as $j) {
            if (($j['status'] ?? '') !== 'encerrado' || ($camp && ($j['campeonato'] ?? '') !== $camp)) continue;
            [$c, $f, $gc, $gf] = [$j['casa'], $j['fora'], (int)$j['gols_casa'], (int)$j['gols_fora']];
            foreach ([$c, $f] as $t) $tab[$t] ??= ['time' => $t, 'pontos' => 0, 'jogos' => 0, 'vitorias' => 0, 'empates' => 0, 'derrotas' => 0, 'saldo' => 0];
            $tab[$c]['jogos']++; $tab[$f]['jogos']++;
            $tab[$c]['saldo'] += $gc - $gf; $tab[$f]['saldo'] += $gf - $gc;
            if ($gc > $gf)      { $tab[$c]['vitorias']++; $tab[$c]['pontos'] += 3; $tab[$f]['derrotas']++; }
            elseif ($gc < $gf)  { $tab[$f]['vitorias']++; $tab[$f]['pontos'] += 3; $tab[$c]['derrotas']++; }
            else                { $tab[$c]['empates']++; $tab[$f]['empates']++; $tab[$c]['pontos']++; $tab[$f]['pontos']++; }
        }
        if (!$tab) resposta(['erro' => "Nenhum jogo encerrado do campeonato \"$camp\"."], 422);
        $d['tabela'] = array_map(fn($r) => $r + ['id' => novo_id(), 'ordem' => ''], array_values($tab));
        gravar_dados($d);
        resposta(['ok' => true, 'linhas' => count($tab)]);
    }

    case 'backup':
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="gazeta-backup-' . date('Y-m-d') . '.json"');
        echo json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
}

resposta(['erro' => 'Ação desconhecida'], 400);

/** Redimensiona (máx. 1600px) e regrava a imagem — deixa o site leve e remove dados ocultos. */
function otimizar_imagem(string $orig, string $mime, string $destinoSemExt): ?string {
    if (!function_exists('imagecreatefromstring') || $mime === 'image/gif') return null;
    $img = @imagecreatefromstring((string)file_get_contents($orig));
    if (!$img) return null;
    [$w, $h] = [imagesx($img), imagesy($img)];
    $max = 1600;
    if ($w > $max || $h > $max) {
        $r = min($max / $w, $max / $h);
        $nova = imagecreatetruecolor((int)($w * $r), (int)($h * $r));
        imagealphablending($nova, false); imagesavealpha($nova, true);
        imagecopyresampled($nova, $img, 0, 0, 0, 0, (int)($w * $r), (int)($h * $r), $w, $h);
        imagedestroy($img); $img = $nova;
    }
    if ($mime === 'image/png') { imagesavealpha($img, true); imagepng($img, "$destinoSemExt.png", 7); $ext = 'png'; }
    elseif (function_exists('imagewebp')) { imagewebp($img, "$destinoSemExt.webp", 82); $ext = 'webp'; }
    else { imagejpeg($img, "$destinoSemExt.jpg", 85); $ext = 'jpg'; }
    imagedestroy($img);
    return $ext;
}
