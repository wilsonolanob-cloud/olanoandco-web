<?php
// Catálogo oficial de servicios (fuente única para el diagnóstico).
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }

return [
  'marca_personal'      => ['Marca personal para empresas', 'Convertir al propietario o CEO en la voz visible de la empresa para generar confianza y diferenciarse.'],
  'web_creacion'        => ['Creación de página web', 'Tener una web profesional, rápida y adaptada a móviles que presente la oferta y facilite el contacto.'],
  'web_remodelacion'    => ['Remodelación de página web', 'Mejorar la estructura, la navegación y las llamadas a la acción de la web actual.'],
  'agente_ia'           => ['Agente de IA para WhatsApp', 'Responder consultas frecuentes al instante, orientar a los clientes y recopilar información, con paso a una persona cuando haga falta.'],
  'google_ads'          => ['Google Ads', 'Aparecer ante personas que ya están buscando lo que ofreces.'],
  'meta_ads'            => ['Meta Ads', 'Llegar a tu cliente ideal en Instagram y Facebook con campañas medibles.'],
  'edicion_video'       => ['Edición profesional de vídeos', 'Contenido audiovisual con ritmo, claridad y narrativa adaptados a cada plataforma.'],
  'auditoria_negocio'   => ['Auditoría de negocio', 'Identificar obstáculos comerciales y priorizar las acciones con más impacto.'],
  'auditoria_marca'     => ['Auditoría de marca personal', 'Evaluar el posicionamiento y la comunicación del representante de la empresa.'],
  'auditoria_youtube'   => ['Auditoría de YouTube', 'Mejorar títulos, miniaturas, retención y estrategia del canal.'],
  'auditoria_ecommerce' => ['Auditoría de e-commerce', 'Revisar la experiencia de compra y los puntos donde se pierden ventas.'],
  'redes_sociales'      => ['Gestión de redes sociales', 'Planificar, diseñar y publicar el contenido de tus perfiles con constancia y un objetivo comercial.'],
  'identidad_marca'     => ['Identidad de marca', 'Crear un logo y un estilo visual profesional para que tu marca se reconozca y transmita confianza.'],
  'kit_edicion'         => ['Kit de edición de vídeos', 'Editar tus propios vídeos con calidad profesional usando nuestro kit y su guía.'],
  'crm_erp_ia'          => ['Agente IA CRM + ERP', 'Automatizar procesos administrativos de principio a fin, integrados con tu CRM y tu ERP (para empresas grandes).'],
];
