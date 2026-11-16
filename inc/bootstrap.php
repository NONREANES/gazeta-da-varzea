<?php
/**
 * Núcleo do sistema: configuração, leitura/gravação dos dados e utilidades.
 * Os dados ficam em data/dados.json (sem precisar de banco de dados).
 */
declare(strict_types=1);

define('RAIZ', dirname(__DIR__));

/* Configurações vêm das variáveis de ambiente (Railway → Variables).
   Para rodar no seu computador, opcionalmente crie um config.php com os define(). */
if (file_exists(RAIZ . '/config.php')) require RAIZ . '/config.php';
function env(string $k, string $padrao = ''): string { $v = getenv($k); return ($v === false || $v === '') ? $padrao : $v; }
if (!defined('ADMIN_USUARIO')) define('ADMIN_USUARIO', env('ADMIN_USUARIO', 'admin'));
if (!defined('ADMIN_SENHA'))   define('ADMIN_SENHA', env('ADMIN_SENHA'));
if (!defined('UPLOAD_MAX_MB')) define('UPLOAD_MAX_MB', (int) env('UPLOAD_MAX_MB', '4'));

/* Pasta persistente: na Railway é o Volume (montado em /data). Localmente usa ./storage */
define('ARMAZEM', rtrim(env('STORAGE_DIR', env('RAILWAY_VOLUME_MOUNT_PATH', RAIZ . '/storage')), '/'));
define('ARQ_DADOS', ARMAZEM . '/dados.json');
define('ARQ_EXEMPLO', RAIZ . '/inc/dados.exemplo.json');
define('PASTA_UPLOADS', ARMAZEM . '/uploads');
foreach ([ARMAZEM, PASTA_UPLOADS] as $p) if (!is_dir($p)) @mkdir($p, 0775, true);

ini_set('display_errors', '0');
date_default_timezone_set('America/Sao_Paulo');

/** Coleções editáveis no painel e seus campos permitidos. */
const COLECOES = [
    'times'        => ['nome','sigla','cor1','cor2','cor3','estilo','escudo','categoria','cidade','whatsapp','comissao','ativo'],
    'produtos'     => ['time','nome','tipo','preco','preco_antigo','tag','imagem','tamanhos','descricao','estoque','ativo'],
    'noticias'     => ['titulo','chapeu','resumo','texto','time','imagem','autor','data','destaque','ativo'],
    'jogos'        => ['campeonato','casa','fora','gols_casa','gols_fora','data','hora','local','status'],
    'tabela'       => ['time','pontos','jogos','vitorias','empates','derrotas','saldo','ordem'],
    'vendas'       => ['produto','time','quantidade','valor_unit','tamanho','cliente','data','status','obs'],
    'solicitacoes' => ['nome_time','responsavel','whatsapp','email','cidade','cor1','cor2','mensagem','status','data'],
];

function ler_dados(): array {
    if (!file_exists(ARQ_DADOS)) copy(ARQ_EXEMPLO, ARQ_DADOS);
    $fp = fopen(ARQ_DADOS, 'r');
    flock($fp, LOCK_SH);
    $json = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $d = json_decode($json ?: '{}', true) ?: [];
    foreach (array_keys(COLECOES) as $c) $d[$c] = $d[$c] ?? [];
    $d['config'] = $d['config'] ?? [];
    return $d;
}

/** Grava com trava + backup automático (mantém os 15 últimos em data/backups). */
function gravar_dados(array $d): void {
    $dir = ARMAZEM . '/backups';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if (file_exists(ARQ_DADOS)) {
        copy(ARQ_DADOS, $dir . '/dados-' . date('Ymd-His') . '.json');
        $bks = glob($dir . '/dados-*.json');
        sort($bks);
        while (count($bks) > 15) unlink(array_shift($bks));
    }
    $tmp = ARQ_DADOS . '.tmp';
    file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    rename($tmp, ARQ_DADOS);
}

function resposta(array $dados, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function novo_id(): string {
    return bin2hex(random_bytes(5));
}

/** Limpa um registro: só aceita os campos conhecidos da coleção. */
function limpar_registro(string $colecao, array $entrada): array {
    $r = [];
    foreach (COLECOES[$colecao] as $campo) {
        if (!array_key_exists($campo, $entrada)) continue;
        $v = $entrada[$campo];
        if (is_string($v)) $v = trim(mb_substr($v, 0, $campo === 'texto' ? 20000 : 600));
        elseif (!is_bool($v) && !is_int($v) && !is_float($v) && $v !== null) $v = '';
        $r[$campo] = $v;
    }
    return $r;
}

function iniciar_sessao(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Strict',
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_name('gv_admin');
    session_start();
}

function logado(): bool {
    iniciar_sessao();
    return !empty($_SESSION['admin']) && ($_SESSION['expira'] ?? 0) > time();
}

function token_csrf(): string {
    iniciar_sessao();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}

function senha_valida(string $usuario, string $senha): bool {
    if (strlen(ADMIN_SENHA) < 8) return false; // exige senha com 8+ caracteres definida
    return hash_equals(ADMIN_USUARIO, $usuario) && hash_equals(ADMIN_SENHA, $senha);
}

function ip_cliente(): string {
    return $_SERVER['REMOTE_ADDR'] ?? '0';
}

/** Limite simples de tentativas por IP (login e formulários públicos). */
function limitar(string $acao, int $max, int $janela): bool {
    $arq = sys_get_temp_dir() . '/gv_lim_' . md5($acao . ip_cliente() . RAIZ);
    $hist = file_exists($arq) ? (json_decode((string)file_get_contents($arq), true) ?: []) : [];
    $agora = time();
    $hist = array_values(array_filter($hist, fn($t) => $t > $agora - $janela));
    if (count($hist) >= $max) return false;
    $hist[] = $agora;
    file_put_contents($arq, json_encode($hist));
    return true;
}
