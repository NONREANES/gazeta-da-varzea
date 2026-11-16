<?php
/** API pública do site: entrega o conteúdo e recebe pedidos de cadastro de times. */
require dirname(__DIR__) . '/inc/bootstrap.php';

$d = ler_dados();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $ativo = fn($x) => ($x['ativo'] ?? true) !== false;
    $times = array_values(array_filter($d['times'], $ativo));
    $idsTimes = array_column($times, 'id');
    $produtos = array_values(array_filter($d['produtos'], fn($p) => $ativo($p) && in_array($p['time'] ?? '', $idsTimes, true)));
    $noticias = array_values(array_filter($d['noticias'], $ativo));
    usort($noticias, fn($a, $b) => strcmp($b['data'] ?? '', $a['data'] ?? ''));
    $jogos = $d['jogos'];
    usort($jogos, fn($a, $b) => strcmp(($a['data'] ?? '') . ($a['hora'] ?? ''), ($b['data'] ?? '') . ($b['hora'] ?? '')));
    $tabela = $d['tabela'];
    usort($tabela, fn($a, $b) => [(int)($b['pontos'] ?? 0), (int)($b['vitorias'] ?? 0), (int)($b['saldo'] ?? 0)]
                              <=> [(int)($a['pontos'] ?? 0), (int)($a['vitorias'] ?? 0), (int)($a['saldo'] ?? 0)]);
    // Remove campos internos (comissão, contato privado dos times)
    $times = array_map(fn($t) => array_diff_key($t, ['comissao' => 1, 'whatsapp' => 1]), $times);
    $cfg = $d['config'];
    resposta([
        'config'   => [
            'nome_site'  => $cfg['nome_site'] ?? 'Gazeta da Várzea',
            'slogan'     => $cfg['slogan'] ?? '',
            'whatsapp'   => $cfg['whatsapp'] ?? '',
            'instagram'  => $cfg['instagram'] ?? '',
            'email'      => $cfg['email'] ?? '',
            'campeonato' => $cfg['campeonato'] ?? 'Campeonato',
            'aviso'      => $cfg['aviso'] ?? '',
        ],
        'times'    => $times,
        'produtos' => $produtos,
        'noticias' => $noticias,
        'jogos'    => $jogos,
        'tabela'   => $tabela,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
    if (($in['acao'] ?? '') !== 'solicitacao') resposta(['erro' => 'Ação inválida'], 400);
    if (!empty($in['site'])) resposta(['ok' => true]); // armadilha anti-robô (campo invisível)
    if (!limitar('solicitacao', 3, 3600)) resposta(['erro' => 'Muitos envios. Tente novamente mais tarde.'], 429);

    $r = limpar_registro('solicitacoes', $in);
    if (mb_strlen($r['nome_time'] ?? '') < 2 || mb_strlen($r['whatsapp'] ?? '') < 8) {
        resposta(['erro' => 'Informe o nome do time e um WhatsApp válido.'], 422);
    }
    $r['id'] = novo_id();
    $r['status'] = 'pendente';
    $r['data'] = date('Y-m-d H:i');
    $d['solicitacoes'][] = $r;
    gravar_dados($d);
    resposta(['ok' => true]);
}

resposta(['erro' => 'Método não permitido'], 405);
