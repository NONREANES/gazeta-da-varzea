<?php
/**
 * Roteador para testar no seu computador:  php -S localhost:8000 router.php
 * (Na Railway quem faz esse papel é o Apache, configurado no Dockerfile.)
 */
$caminho = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (preg_match('#^/(inc|storage|docker)/#', $caminho) || preg_match('#\.(md|json|yml|sh)$#', $caminho)) {
    http_response_code(404); exit('Não encontrado');
}
if (str_starts_with($caminho, '/uploads/')) {
    require __DIR__ . '/inc/bootstrap.php';
    $arq = PASTA_UPLOADS . '/' . basename($caminho);
    if (!is_file($arq)) { http_response_code(404); exit; }
    header('Content-Type: ' . (new finfo(FILEINFO_MIME_TYPE))->file($arq));
    header('Cache-Control: public, max-age=31536000');
    readfile($arq); exit;
}
if ($caminho === '/admin' ) { header('Location: /admin/'); exit; }
return false; // deixa o servidor embutido entregar o arquivo normalmente
