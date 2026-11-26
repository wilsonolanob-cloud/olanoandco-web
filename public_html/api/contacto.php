<?php
// Formulario de contacto: valida, guarda el prospecto en la base de datos privada y avisa (opcional).
require __DIR__ . '/_bootstrap.php';

require_post();
require_same_origin();
$in = read_json();
guard_form($in);

$f = [
  'nombre'   => clean($in['nombre'] ?? '', 80),
  'email'    => clean($in['email'] ?? '', 160),
  'empresa'  => clean($in['empresa'] ?? '', 120),
  'servicio' => clean($in['servicio'] ?? '', 80),
  'mensaje'  => clean($in['mensaje'] ?? '', 1500),
];

if ($f['nombre'] === '' || $f['mensaje'] === '') json_out(['ok' => false, 'reason' => 'required']);
if (!valid_email($f['email'])) json_out(['ok' => false, 'reason' => 'email']);
if (empty($in['consentimiento'])) json_out(['ok' => false, 'reason' => 'consent']);

try {
  if (!rate_allow('contacto', 3, 15)) json_out(['ok' => false, 'reason' => 'rate']);
  $ref = save_prospect('contacto', $f, []);
} catch (Throwable $e) {
  error_log('[olanoandco] contacto: ' . $e->getMessage());
  json_out(['ok' => false, 'reason' => 'server'], 500);
}

notify_owner(
  "Nueva consulta web {$ref}: {$f['nombre']}",
  "Nombre: {$f['nombre']}\nCorreo: {$f['email']}\nEmpresa: {$f['empresa']}\nServicio: {$f['servicio']}\n\n{$f['mensaje']}\n"
);

json_out(['ok' => true, 'saved' => true, 'ref' => $ref]);
