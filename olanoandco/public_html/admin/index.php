<?php
// Panel privado de prospectos (contacto + diagnóstico). Protegido con la contraseña ADMIN_PASSWORD del .env.
require __DIR__ . '/../api/_bootstrap.php';

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('oc_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/admin', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

$password = config('ADMIN_PASSWORD');
$h = function ($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); };
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$csrfOk = function () { return hash_equals($_SESSION['csrf'] ?? '', (string) ($_POST['csrf'] ?? '')); };

$error = '';
if (($_POST['action'] ?? '') === 'login' && $password !== '') {
  if (!$csrfOk()) $error = 'La sesión caducó. Vuelve a intentarlo.';
  elseif (!rate_allow('admin_login', 5, 30)) $error = 'Demasiados intentos. Espera unos minutos.';
  elseif (hash_equals($password, (string) ($_POST['password'] ?? ''))) {
    session_regenerate_id(true);
    $_SESSION['auth'] = true;
    header('Location: ./'); exit;
  } else $error = 'Contraseña incorrecta.';
}
if (($_POST['action'] ?? '') === 'logout' && $csrfOk()) { $_SESSION = []; session_destroy(); header('Location: ./'); exit; }

$auth = !empty($_SESSION['auth']) && $password !== '';

if ($auth && ($_GET['exportar'] ?? '') === 'csv') {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="prospectos-olanoandco-' . date('Ymd') . '.csv"');
  $out = fopen('php://output', 'w');
  fwrite($out, "\xEF\xBB\xBF");
  $csv = function ($row) use ($out) { fputcsv($out, $row, ',', '"', ''); };
  $csv(['Referencia', 'Fecha', 'Origen', 'Nombre', 'Correo', 'Teléfono', 'Empresa', 'Servicio', 'Mensaje', 'Datos', 'Consentimiento']);
  foreach (db()->query('SELECT * FROM prospectos ORDER BY id DESC') as $p) {
    $csv([$p['ref'], $p['creado'], $p['origen'], $p['nombre'], $p['email'], $p['telefono'], $p['empresa'], $p['servicio'], $p['mensaje'], $p['datos'], $p['consentimiento']]);
  }
  exit;
}

$rows = [];
$filtro = in_array($_GET['origen'] ?? '', ['contacto', 'diagnostico'], true) ? $_GET['origen'] : '';
if ($auth) {
  $st = db()->prepare('SELECT * FROM prospectos ' . ($filtro ? 'WHERE origen = ? ' : '') . 'ORDER BY id DESC LIMIT 300');
  $st->execute($filtro ? [$filtro] : []);
  $rows = $st->fetchAll();
}
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Prospectos · OlanoandCo</title>
<link rel="icon" type="image/png" href="../assets/brand/favicon-32.png">
<style>
  :root { --navy:#0B1F3A; --blue:#536DFF; --white:#F7F7F5; --ink:#111318; }
  * { box-sizing: border-box; margin: 0; }
  body { font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--white); color: var(--navy); }
  header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--navy); color: var(--white); }
  header img { width: 120px; } header h1 { font-size: 1rem; font-weight: 600; margin-right: auto; }
  main { padding: 1.25rem; max-width: 1200px; margin: 0 auto; }
  .card { background: #fff; border-radius: 14px; padding: 1.5rem; box-shadow: 0 0 0 1px rgba(11,31,58,.08); max-width: 380px; margin: 3rem auto; }
  input[type=password] { width: 100%; min-height: 46px; padding: .6rem .9rem; border-radius: 10px; border: 1.5px solid rgba(11,31,58,.15); font: inherit; margin: .5rem 0 1rem; }
  button, .btn { display: inline-flex; align-items: center; min-height: 42px; padding: .5rem 1rem; border-radius: 99px; border: 0; background: var(--blue); color: #fff; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; }
  .ghost { background: rgba(247,247,245,.12); }
  .bar { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: 1rem; }
  .bar a.f { padding: .35rem .8rem; border-radius: 99px; color: var(--navy); text-decoration: none; border: 1.5px solid rgba(11,31,58,.15); }
  .bar a.f.on { background: var(--navy); color: #fff; border-color: var(--navy); }
  .bar .btn { margin-left: auto; }
  .err { color: #9A3412; background: #FFF1EC; padding: .6rem .8rem; border-radius: 10px; margin-bottom: 1rem; }
  .item { background: #fff; border-radius: 14px; padding: 1rem 1.2rem; margin-bottom: .7rem; box-shadow: 0 0 0 1px rgba(11,31,58,.08); }
  .item summary { cursor: pointer; display: flex; flex-wrap: wrap; gap: .3rem 1rem; align-items: baseline; }
  .tag { font-size: .75rem; padding: .1rem .55rem; border-radius: 99px; background: rgba(83,109,255,.14); }
  .meta { opacity: .65; font-size: .85rem; }
  dl { display: grid; grid-template-columns: 140px 1fr; gap: .3rem 1rem; margin-top: .8rem; font-size: .92rem; }
  dt { opacity: .6; } dd { white-space: pre-wrap; word-break: break-word; }
  .empty { opacity: .6; padding: 2rem 0; }
</style>
</head>
<body>
<header>
  <img src="../assets/brand/nombre-blanco.webp" alt="OlanoandCo">
  <h1>Prospectos</h1>
  <?php if ($auth): ?>
  <form method="post"><input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><button class="ghost" name="action" value="logout">Salir</button></form>
  <?php endif; ?>
</header>
<main>
<?php if ($password === ''): ?>
  <div class="card"><p>El panel está desactivado. Define <b>ADMIN_PASSWORD</b> en el archivo privado <code>.env</code> para activarlo.</p></div>
<?php elseif (!$auth): ?>
  <form class="card" method="post">
    <?php if ($error): ?><p class="err"><?= $h($error) ?></p><?php endif; ?>
    <label for="pw"><b>Contraseña del panel</b></label>
    <input id="pw" type="password" name="password" autocomplete="current-password" required autofocus>
    <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>">
    <button name="action" value="login">Entrar</button>
  </form>
<?php else: ?>
  <div class="bar">
    <a class="f <?= $filtro === '' ? 'on' : '' ?>" href="./">Todos</a>
    <a class="f <?= $filtro === 'contacto' ? 'on' : '' ?>" href="?origen=contacto">Contacto</a>
    <a class="f <?= $filtro === 'diagnostico' ? 'on' : '' ?>" href="?origen=diagnostico">Diagnóstico</a>
    <a class="btn" href="?exportar=csv">Descargar Excel (CSV)</a>
  </div>
  <?php if (!$rows): ?><p class="empty">Todavía no hay prospectos.</p><?php endif; ?>
  <?php foreach ($rows as $p): $d = json_decode((string) $p['datos'], true) ?: []; ?>
    <details class="item">
      <summary>
        <b><?= $h($p['nombre']) ?></b>
        <span><?= $h($p['empresa']) ?></span>
        <span class="tag"><?= $h($p['origen']) ?></span>
        <span class="meta"><?= $h(date('d/m/Y H:i', strtotime($p['creado']))) ?> · <?= $h($p['ref']) ?></span>
      </summary>
      <dl>
        <dt>Correo</dt><dd><a href="mailto:<?= $h($p['email']) ?>"><?= $h($p['email']) ?></a></dd>
        <?php if ($p['telefono']): ?><dt>Teléfono</dt><dd><?= $h($p['telefono']) ?></dd><?php endif; ?>
        <dt>Servicio</dt><dd><?= $h($p['servicio'] ?: '—') ?></dd>
        <dt>Mensaje</dt><dd><?= $h($p['mensaje'] ?: '—') ?></dd>
        <?php if ($d): ?>
          <?php if (!empty($d['sector'])): ?><dt>Sector</dt><dd><?= $h($d['sector']) ?></dd><?php endif; ?>
          <?php if (!empty($d['objetivo'])): ?><dt>Objetivo</dt><dd><?= $h($d['objetivo']) ?></dd><?php endif; ?>
          <?php if (!empty($d['canales'])): ?><dt>Canales</dt><dd><?= $h(implode(', ', $d['canales'])) ?></dd><?php endif; ?>
          <?php if (!empty($d['presupuesto'])): ?><dt>Inversión</dt><dd><?= $h($d['presupuesto']) ?></dd><?php endif; ?>
          <?php if (!empty($d['contacto_preferido'])): ?><dt>Prefiere</dt><dd><?= $h($d['contacto_preferido']) ?></dd><?php endif; ?>
          <?php if (!empty($d['orientacion']['resumen'])): ?><dt>Orientación</dt><dd><?= $h($d['orientacion']['resumen']) ?></dd><?php endif; ?>
        <?php endif; ?>
        <dt>Consentimiento</dt><dd><?= $h($p['consentimiento']) ?></dd>
      </dl>
    </details>
  <?php endforeach; ?>
<?php endif; ?>
</main>
</body>
</html>
