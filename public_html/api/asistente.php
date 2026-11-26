<?php
// Asistente de la web: el navegador solo habla con este archivo; la clave de Gemini vive en el servidor.
// Si la IA no está configurada o falla, responde {fallback:true} y la web usa sus respuestas de respaldo.
require __DIR__ . '/_bootstrap.php';

require_post();
require_same_origin();

$fallback = function () { json_out(['fallback' => true]); };
if (gemini_key() === '') $fallback();

$in = read_json();
$message = clean($in['message'] ?? '', 500);
if ($message === '') json_out(['error' => 'input'], 400);

try {
  if (!rate_allow('asistente', 8, 80, (int) config('ASSISTANT_DAILY_CAP', '1000'))) {
    json_out(['reply' => 'Has hecho muchas consultas seguidas. Para seguir, escríbenos por WhatsApp y te atendemos personalmente.', 'handoff' => true]);
  }
} catch (Throwable $e) {
  error_log('[olanoandco] asistente rate: ' . $e->getMessage());
  $fallback();
}

$contents = [];
$history = is_array($in['history'] ?? null) ? array_slice($in['history'], -8) : [];
foreach ($history as $h) {
  if (!is_array($h)) continue;
  $text = clean($h['text'] ?? '', 1000);
  if ($text === '') continue;
  $contents[] = ['role' => (($h['role'] ?? '') === 'model') ? 'model' : 'user', 'parts' => [['text' => $text]]];
}
$contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

$system = require __DIR__ . '/_conocimiento.php';
$reply = gemini_generate($system, $contents, ['temperature' => 0.4, 'maxOutputTokens' => 500]);
if ($reply === '') $fallback();

$reply = trim(str_replace(['**', '##'], '', $reply));
$low = mb_strtolower($reply . ' ' . $message);
json_out([
  'reply' => $reply,
  'handoff' => (bool) preg_match('/whatsapp|contact|equipo|wilson|precio|cotiz|propuesta/u', $low),
  'suggestDiagnostic' => (bool) preg_match('/diagn[oó]stico/u', $low),
]);
