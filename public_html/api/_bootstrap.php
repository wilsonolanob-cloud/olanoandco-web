<?php
// Núcleo compartido del servidor de OlanoandCo.
// - Configuración desde variables de entorno o el archivo privado .env (fuera de public_html).
// - Base de datos SQLite privada para prospectos y límites de uso.
// - Utilidades: respuestas JSON, control de origen, token anti-spam, límites, llamada a Gemini.

declare(strict_types=1);

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }

mb_internal_encoding('UTF-8');
date_default_timezone_set('America/Caracas');

/* ------------------------------------------------------------------ Config */
function env_file_path(): ?string {
  $custom = getenv('OLANO_ENV_FILE');
  $candidates = array_filter([
    $custom ?: null,
    dirname(__DIR__, 2) . '/private/.env',   // .../dominio/private/.env (junto a public_html)
    dirname(__DIR__, 3) . '/private/.env',   // un nivel más arriba, por si public_html está anidado
  ]);
  foreach ($candidates as $p) { if (is_file($p) && is_readable($p)) return $p; }
  return null;
}

function config(string $key, string $default = ''): string {
  static $vars = null;
  $v = getenv($key);
  if ($v !== false && $v !== '') return (string) $v;
  if ($vars === null) {
    $vars = [];
    $path = env_file_path();
    if ($path) {
      foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$k, $val] = array_map('trim', explode('=', $line, 2));
        if (strlen($val) >= 2 && ($val[0] === '"' || $val[0] === "'") && substr($val, -1) === $val[0]) $val = substr($val, 1, -1);
        $vars[$k] = $val;
      }
    }
  }
  return isset($vars[$key]) && $vars[$key] !== '' ? $vars[$key] : $default;
}

function data_dir(): string {
  $dir = config('DATA_DIR', dirname(__DIR__, 2) . '/private/data');
  if (!is_dir($dir)) @mkdir($dir, 0750, true);
  return $dir;
}

/* ------------------------------------------------------------------ Respuestas */
function json_out(array $arr, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: no-store');
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

function require_post(): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['ok' => false, 'reason' => 'method'], 405);
}

// Solo aceptamos peticiones desde el propio dominio (evita que otros sitios usen nuestros formularios o la cuota de IA)
function require_same_origin(): void {
  $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
  $src = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
  if ($src === '') return;
  $srcHost = strtolower((string) parse_url($src, PHP_URL_HOST));
  if ($srcHost === '' || $srcHost !== $host) json_out(['ok' => false, 'reason' => 'origin'], 403);
}

function read_json(): array {
  $raw = file_get_contents('php://input', false, null, 0, 64000);
  $in = json_decode((string) $raw, true);
  return is_array($in) ? $in : [];
}

function clean($v, int $max = 200): string {
  if (!is_scalar($v)) return '';
  $s = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $v) ?? '');
  return mb_substr($s, 0, $max);
}

function clean_list($v, array $allowed, int $max = 12): array {
  if (!is_array($v)) return [];
  $out = [];
  foreach ($v as $item) {
    $item = clean($item, 60);
    if (in_array($item, $allowed, true) && !in_array($item, $out, true)) $out[] = $item;
    if (count($out) >= $max) break;
  }
  return $out;
}

function valid_email(string $email): bool {
  return $email !== '' && mb_strlen($email) <= 160 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/* ------------------------------------------------------------------ Identidad de cliente (anónima) */
function client_hash(): string {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  return hash_hmac('sha256', $ip, app_secret());
}

function app_secret(): string {
  $s = config('APP_SECRET');
  if ($s !== '' && strlen($s) >= 32) return $s;
  // Sin secreto configurado: se genera uno y se guarda en la carpeta privada
  $file = data_dir() . '/.app_secret';
  if (is_file($file)) { $s = trim((string) file_get_contents($file)); if (strlen($s) >= 32) return $s; }
  $s = bin2hex(random_bytes(32));
  @file_put_contents($file, $s, LOCK_EX);
  @chmod($file, 0600);
  return $s;
}

/* ------------------------------------------------------------------ Base de datos */
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $file = data_dir() . '/olanoandco.sqlite';
  $isNew = !is_file($file);
  $pdo = new PDO('sqlite:' . $file, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  if ($isNew) @chmod($file, 0600);
  $pdo->exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 4000;');
  $pdo->exec('CREATE TABLE IF NOT EXISTS prospectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref TEXT NOT NULL UNIQUE,
    creado TEXT NOT NULL,
    origen TEXT NOT NULL,
    nombre TEXT, email TEXT, telefono TEXT, empresa TEXT, servicio TEXT, mensaje TEXT,
    datos TEXT,
    consentimiento TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT "nuevo",
    cliente TEXT
  )');
  $pdo->exec('CREATE INDEX IF NOT EXISTS idx_prospectos_creado ON prospectos(creado)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS limites (clave TEXT NOT NULL, momento INTEGER NOT NULL)');
  $pdo->exec('CREATE INDEX IF NOT EXISTS idx_limites ON limites(clave, momento)');
  return $pdo;
}

function new_ref(): string {
  return 'OC-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));
}

function save_prospect(string $origen, array $f, array $datos): string {
  $ref = new_ref();
  $st = db()->prepare('INSERT INTO prospectos (ref, creado, origen, nombre, email, telefono, empresa, servicio, mensaje, datos, consentimiento, cliente)
    VALUES (:ref, :creado, :origen, :nombre, :email, :telefono, :empresa, :servicio, :mensaje, :datos, :consentimiento, :cliente)');
  $st->execute([
    ':ref' => $ref,
    ':creado' => date('c'),
    ':origen' => $origen,
    ':nombre' => $f['nombre'] ?? '',
    ':email' => $f['email'] ?? '',
    ':telefono' => $f['telefono'] ?? '',
    ':empresa' => $f['empresa'] ?? '',
    ':servicio' => $f['servicio'] ?? '',
    ':mensaje' => $f['mensaje'] ?? '',
    ':datos' => json_encode($datos, JSON_UNESCAPED_UNICODE),
    ':consentimiento' => date('c') . ' · ' . CONSENT_VERSION,
    ':cliente' => substr(client_hash(), 0, 16),
  ]);
  return $ref;
}

const CONSENT_VERSION = 'privacidad-v1-pendiente-revision';

/* ------------------------------------------------------------------ Límites de uso */
// Devuelve true si se permite la acción y la registra.
function rate_allow(string $bucket, int $perMinute, int $perDay, int $globalPerDay = 0): bool {
  $pdo = db();
  $now = time();
  $key = $bucket . ':' . substr(client_hash(), 0, 24);
  $pdo->prepare('DELETE FROM limites WHERE momento < ?')->execute([$now - 86400]);

  $count = function (string $k, int $since) use ($pdo): int {
    $st = $pdo->prepare('SELECT COUNT(*) FROM limites WHERE clave = ? AND momento > ?');
    $st->execute([$k, $since]);
    return (int) $st->fetchColumn();
  };
  if ($count($key, $now - 60) >= $perMinute) return false;
  if ($count($key, $now - 86400) >= $perDay) return false;
  if ($globalPerDay > 0 && $count($bucket . ':global', $now - 86400) >= $globalPerDay) return false;

  $ins = $pdo->prepare('INSERT INTO limites (clave, momento) VALUES (?, ?)');
  $ins->execute([$key, $now]);
  if ($globalPerDay > 0) $ins->execute([$bucket . ':global', $now]);
  return true;
}

/* ------------------------------------------------------------------ Token anti-spam */
// Token firmado con la hora de emisión: debe tener al menos 3 s (humano) y menos de 2 h.
function make_token(): string {
  $ts = (string) time();
  $nonce = bin2hex(random_bytes(6));
  return $ts . '.' . $nonce . '.' . hash_hmac('sha256', $ts . '.' . $nonce, app_secret());
}

function check_token(string $token): string {
  $parts = explode('.', $token);
  if (count($parts) !== 3) return 'token';
  [$ts, $nonce, $sig] = $parts;
  if (!ctype_digit($ts) || !hash_equals(hash_hmac('sha256', $ts . '.' . $nonce, app_secret()), $sig)) return 'token';
  $age = time() - (int) $ts;
  if ($age < 3) return 'too_fast';
  if ($age > 7200) return 'token';
  return '';
}

// Comprobaciones comunes a los formularios. Responde y termina si algo falla.
function guard_form(array $in): void {
  // Campo trampa: si un robot lo rellena, respondemos "ok" sin guardar nada.
  if (clean($in['sitio_web'] ?? '') !== '') json_out(['ok' => true, 'saved' => false]);
  $t = check_token(clean($in['token'] ?? '', 200));
  if ($t !== '') json_out(['ok' => false, 'reason' => $t]);
}

/* ------------------------------------------------------------------ Aviso por correo (opcional) */
function notify_owner(string $subject, string $body): void {
  $to = config('NOTIFY_EMAIL');
  if ($to === '' || !function_exists('mail')) return;
  $from = config('MAIL_FROM', 'no-responder@' . preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'localhost'));
  $headers = "From: OlanoandCo Web <{$from}>\r\nContent-Type: text/plain; charset=UTF-8";
  @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
}

/* ------------------------------------------------------------------ Gemini */
function gemini_key(): string {
  $k = config('GEMINI_API_KEY');
  return ($k === '' || stripos($k, 'pega') !== false) ? '' : $k;
}

// Devuelve el texto generado o '' si no hay clave o falla (nunca expone el error al visitante).
function gemini_generate(string $system, array $contents, array $genConfig = []): string {
  $key = gemini_key();
  if ($key === '' || !function_exists('curl_init')) return '';
  $models = array_filter(array_map('trim', explode(',', config('GEMINI_MODELS', 'gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.5-flash'))));
  $payload = [
    'system_instruction' => ['parts' => [['text' => $system]]],
    'contents' => $contents,
    // Margen amplio: los modelos actuales usan parte del límite para "pensar" antes de responder
    'generationConfig' => array_merge(['temperature' => 0.4], $genConfig, ['maxOutputTokens' => 4096]),
  ];
  foreach ($models as $model) {
    $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent');
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
      CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
      CURLOPT_TIMEOUT => 25,
    ]);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false || $code >= 400) { error_log("[olanoandco] gemini $model http $code"); continue; }
    $data = json_decode((string) $resp, true);
    $text = '';
    foreach ($data['candidates'][0]['content']['parts'] ?? [] as $part) {
      if (!empty($part['thought'])) continue; // se ignora el razonamiento interno, solo se usa la respuesta
      $text .= $part['text'] ?? '';
    }
    if (trim($text) !== '') return trim($text);
  }
  return '';
}
