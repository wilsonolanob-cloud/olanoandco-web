<?php
// Servidor local de pruebas: imita las reglas de Hostinger (.htaccess) que PHP no lee.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#/(\.|_)[^/]*$#', $path) || preg_match('#\.(env|sqlite|md|example)$#', $path)) { http_response_code(403); exit('Prohibido'); }
$file = $_SERVER['DOCUMENT_ROOT'] . $path;
if ($path !== '/' && !file_exists($file) && !is_dir($file)) { http_response_code(404); readfile($_SERVER['DOCUMENT_ROOT'] . '/404.html'); exit; }
return false;
