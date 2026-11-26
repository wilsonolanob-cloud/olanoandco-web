<?php
// Entrega un token anti-spam de corta duración para los formularios.
require __DIR__ . '/_bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') json_out(['ok' => false], 405);
require_same_origin();
json_out(['token' => make_token()]);
