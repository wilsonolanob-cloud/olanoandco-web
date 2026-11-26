<?php
// Diagnóstico digital: guarda las respuestas (con consentimiento) y devuelve una orientación inicial.
// La orientación se calcula con reglas propias; si Gemini está configurado, redacta el resumen
// a partir SOLO de las respuestas sobre el negocio (nunca nombre, correo, teléfono ni empresa).
require __DIR__ . '/_bootstrap.php';

require_post();
require_same_origin();
$in = read_json();
guard_form($in);

$CATALOGO = require __DIR__ . '/_servicios.php';
$SECTORES = ['Comercio y retail', 'Salud y bienestar', 'Gastronomía', 'Servicios profesionales', 'Inmobiliaria y construcción', 'Industria y distribución', 'Educación', 'Tecnología', 'Otro'];
$OBJETIVOS = [
  'captar_clientes' => 'captar más clientes',
  'aumentar_ventas' => 'aumentar las ventas',
  'mejorar_marca'   => 'fortalecer la marca',
  'desarrollar_web' => 'desarrollar la página web',
  'automatizar'     => 'automatizar procesos',
];
$CANALES = ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'WhatsApp Business', 'Página web', 'Tienda online', 'Publicidad pagada', 'Ninguno todavía'];
$PRESUPUESTOS = ['', 'menos_300', '300_800', '800_2000', 'mas_2000', 'evaluando'];
$PREFERENCIAS = ['whatsapp', 'llamada', 'correo'];

/* ---------------------------------------------------------------- Validación */
$r = [
  'empresa'       => clean($in['empresa'] ?? '', 120),
  'sector'        => clean($in['sector'] ?? '', 60),
  'objetivo'      => clean($in['objetivo'] ?? '', 40),
  'canales'       => clean_list($in['canales'] ?? [], $CANALES),
  'problema'      => clean($in['problema'] ?? '', 400),
  'servicios'     => clean_list($in['servicios'] ?? [], array_merge(array_keys($CATALOGO), ['no_se'])),
  'presupuesto'   => clean($in['presupuesto'] ?? '', 20),
  'nombre'        => clean($in['nombre'] ?? '', 80),
  'email'         => clean($in['email'] ?? '', 160),
  'contacto_pref' => clean($in['contacto_pref'] ?? 'whatsapp', 20),
  'telefono'      => mb_substr(preg_replace('/[^0-9+\s()-]/', '', (string) ($in['telefono'] ?? '')), 0, 24),
];
if ($r['empresa'] === '' || $r['nombre'] === '' || mb_strlen($r['problema']) < 5) json_out(['ok' => false, 'reason' => 'required']);
if (!in_array($r['sector'], $SECTORES, true) || !isset($OBJETIVOS[$r['objetivo']]) || !$r['canales']) json_out(['ok' => false, 'reason' => 'required']);
if (!valid_email($r['email'])) json_out(['ok' => false, 'reason' => 'email']);
if (empty($in['consentimiento'])) json_out(['ok' => false, 'reason' => 'consent']);
if (!in_array($r['presupuesto'], $PRESUPUESTOS, true)) $r['presupuesto'] = '';
if (!in_array($r['contacto_pref'], $PREFERENCIAS, true)) $r['contacto_pref'] = 'whatsapp';

try {
  if (!rate_allow('diagnostico', 2, 8)) json_out(['ok' => false, 'reason' => 'rate']);
} catch (Throwable $e) {
  error_log('[olanoandco] diagnostico rate: ' . $e->getMessage());
  json_out(['ok' => false, 'reason' => 'server'], 500);
}

/* ---------------------------------------------------------------- Orientación por reglas */
$score = array_fill_keys(array_keys($CATALOGO), 0.0);
$add = function (string $id, float $pts) use (&$score) { if (isset($score[$id])) $score[$id] += $pts; };
$has = function (string $canal) use ($r) { return in_array($canal, $r['canales'], true); };
$tieneWeb = $has('Página web') || $has('Tienda online');

foreach ($r['servicios'] as $s) $add($s, 3);
$add('marca_personal', 0.5); // especialidad de la agencia

switch ($r['objetivo']) {
  case 'captar_clientes': $add('marca_personal', 2); $add('meta_ads', 2); $add('google_ads', 2); $add($tieneWeb ? 'web_remodelacion' : 'web_creacion', 1); break;
  case 'aumentar_ventas': $add('auditoria_negocio', 2.5); $add('google_ads', 1); $add('meta_ads', 1); $add('agente_ia', 1); if ($has('Tienda online')) $add('auditoria_ecommerce', 2); break;
  case 'mejorar_marca':   $add('marca_personal', 3); $add('auditoria_marca', 2); $add('redes_sociales', 1.5); $add('identidad_marca', 1); $add('edicion_video', 1); break;
  case 'desarrollar_web': $add($tieneWeb ? 'web_remodelacion' : 'web_creacion', 3.5); break;
  case 'automatizar':     $add('agente_ia', 3.5); $add('auditoria_negocio', 1); break;
}
if (!$tieneWeb) $add('web_creacion', 1.5); else $add('web_remodelacion', 0.5);
if ($has('YouTube')) $add('auditoria_youtube', 1.5);
if ($has('Tienda online')) $add('auditoria_ecommerce', 1.5);
if ($has('WhatsApp Business')) $add('agente_ia', 1.5);
if ($has('Instagram') || $has('TikTok')) { $add('marca_personal', 1); $add('redes_sociales', 1); $add('edicion_video', 0.5); }
if ($has('Publicidad pagada')) { $add('google_ads', 0.5); $add('meta_ads', 0.5); }
if ($has('Ninguno todavía')) { $add('marca_personal', 1); $add('web_creacion', 1.5); }

arsort($score);
$top = array_slice(array_keys(array_filter($score, function ($v) { return $v > 0; })), 0, 3);

$recs = array_map(function ($id) use ($CATALOGO) {
  return ['id' => $id, 'title' => $CATALOGO[$id][0], 'reason' => $CATALOGO[$id][1]];
}, $top);
$summary = 'Según tus respuestas, tu prioridad actual es ' . $OBJETIVOS[$r['objetivo']] . '. '
  . 'Estas son las áreas en las que podríamos ayudarte primero, ordenadas según lo que nos contaste.';
$next = 'El siguiente paso es una conversación breve con Wilson Olano para validar estas prioridades y definir un alcance a tu medida.';
$fuente = 'reglas';

/* ---------------------------------------------------------------- Redacción con IA (opcional) */
// Solo se envían datos del negocio; nada que identifique a la persona.
if (gemini_key() !== '' && rate_allow('diagnostico_ia', 3, 10, 300)) {
  $catalogText = '';
  foreach ($CATALOGO as $id => $c) $catalogText .= "- {$id}: {$c[0]} — {$c[1]}\n";
  $answers = [
    'sector' => $r['sector'],
    'objetivo' => $OBJETIVOS[$r['objetivo']],
    'canales_actuales' => $r['canales'],
    'problema_principal' => $r['problema'],
    'servicios_de_interes' => array_values(array_filter($r['servicios'], function ($s) { return $s !== 'no_se'; })),
    'candidatos_sugeridos' => $top,
  ];
  $system = "Eres el asistente de diagnóstico de OlanoandCo, agencia de marketing digital y automatización en Venezuela. "
    . "Redactas una orientación inicial breve en español neutro, en segunda persona (tú), cercana y profesional. "
    . "Solo puedes recomendar servicios de este catálogo, usando su id exacto:\n{$catalogText}"
    . "Reglas: no prometas resultados, ventas ni cifras; no inventes precios, plazos, clientes ni estadísticas; "
    . "no digas que es una auditoría completa; si la información es escasa, dilo con naturalidad. "
    . "Devuelve EXCLUSIVAMENTE JSON válido con esta forma: "
    . '{"resumen": "2 o 3 frases", "recomendaciones": [{"id": "id_del_catalogo", "motivo": "1 o 2 frases conectadas con sus respuestas"}], "siguiente_paso": "1 frase"} '
    . "con 2 o 3 recomendaciones, priorizando los candidatos sugeridos salvo que las respuestas indiquen claramente otra cosa.";
  $txt = gemini_generate($system, [['role' => 'user', 'parts' => [['text' => json_encode($answers, JSON_UNESCAPED_UNICODE)]]]], [
    'temperature' => 0.3, 'maxOutputTokens' => 600, 'responseMimeType' => 'application/json',
  ]);
  $txt = preg_replace('/^```(?:json)?|```$/m', '', $txt);
  $ai = json_decode(trim((string) $txt), true);
  if (is_array($ai) && !empty($ai['recomendaciones']) && is_array($ai['recomendaciones'])) {
    $aiRecs = [];
    foreach ($ai['recomendaciones'] as $rec) {
      $id = is_array($rec) ? clean($rec['id'] ?? '', 40) : '';
      $motivo = is_array($rec) ? clean($rec['motivo'] ?? '', 320) : '';
      if (isset($CATALOGO[$id]) && $motivo !== '' && !isset($aiRecs[$id])) $aiRecs[$id] = ['id' => $id, 'title' => $CATALOGO[$id][0], 'reason' => $motivo];
      if (count($aiRecs) >= 3) break;
    }
    if (count($aiRecs) >= 2) {
      $recs = array_values($aiRecs);
      $summary = clean($ai['resumen'] ?? '', 600) ?: $summary;
      $next = clean($ai['siguiente_paso'] ?? '', 300) ?: $next;
      $fuente = 'ia';
    }
  }
}

/* ---------------------------------------------------------------- Guardado */
$saved = false;
$ref = '';
try {
  $ref = save_prospect('diagnostico', [
    'nombre' => $r['nombre'], 'email' => $r['email'], 'telefono' => $r['telefono'], 'empresa' => $r['empresa'],
    'servicio' => implode(', ', array_map(function ($x) { return $x['title']; }, $recs)),
    'mensaje' => $r['problema'],
  ], [
    'sector' => $r['sector'], 'objetivo' => $r['objetivo'], 'canales' => $r['canales'],
    'servicios_interes' => $r['servicios'], 'presupuesto' => $r['presupuesto'],
    'contacto_preferido' => $r['contacto_pref'],
    'orientacion' => ['resumen' => $summary, 'recomendaciones' => $recs, 'fuente' => $fuente],
  ]);
  $saved = true;
} catch (Throwable $e) {
  error_log('[olanoandco] diagnostico save: ' . $e->getMessage());
}

if ($saved) {
  notify_owner(
    "Nuevo diagnóstico {$ref}: {$r['empresa']}",
    "Nombre: {$r['nombre']}\nCorreo: {$r['email']}\nTeléfono: {$r['telefono']} (prefiere: {$r['contacto_pref']})\nEmpresa: {$r['empresa']} · {$r['sector']}\n"
    . "Objetivo: {$OBJETIVOS[$r['objetivo']]}\nProblema: {$r['problema']}\n\nRecomendado: " . implode(', ', array_map(function ($x) { return $x['title']; }, $recs)) . "\n"
  );
}

json_out([
  'ok' => true,
  'saved' => $saved,
  'ref' => $ref,
  'summary' => $summary,
  'recommendations' => array_map(function ($x) { return ['title' => $x['title'], 'reason' => $x['reason']]; }, $recs),
  'next' => $next,
]);
