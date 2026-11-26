# OlanoandCo — web oficial

Web propia de OlanoandCo: una sola página principal más privacidad, términos y página de error. Incluye un diagnóstico digital interactivo, un asistente con IA, un formulario de contacto con guardado real y un panel privado de prospectos.

## Estructura

```
olanoandco/
├── public_html/            ← lo que se sube a public_html en Hostinger
│   ├── index.html          ← la web
│   ├── privacidad.html · terminos.html · 404.html
│   ├── styles.css · main.js · lib/manifest.js
│   ├── api/                ← servidor: contacto, diagnóstico, asistente, token anti-spam
│   ├── admin/              ← panel privado de prospectos (con contraseña)
│   ├── assets/brand/       ← logo extraído del original, sin redibujar
│   ├── assets/img/         ← fotos optimizadas (WebP)
│   └── .htaccess · robots.txt · sitemap.xml · site.webmanifest
├── private/                ← va FUERA de public_html (nunca accesible por web)
│   ├── .env                ← claves y contraseñas reales (NO compartir, NO subir a Git)
│   └── data/               ← base de datos de prospectos (se crea sola)
├── .env.example            ← plantilla de configuración sin secretos
├── assets-originales/      ← logo y fotos originales (no se publican)
└── tools/                  ← utilidades de trabajo (no se publican)
```

## Estado de cada función

| Función | Estado |
|---|---|
| Web completa (escritorio y móvil) | ✅ Lista y revisada |
| Formulario de contacto | ✅ Guarda de verdad en la base de datos privada (probado) |
| Diagnóstico digital | ✅ Guarda respuestas con consentimiento y da una orientación por reglas (probado) |
| Panel de prospectos `/admin` | ✅ Login, listado, filtro y descarga en Excel (CSV) (probado) |
| Protección anti-spam | ✅ Token, campo trampa, límites por persona y bloqueo de otros sitios (probado) |
| Asistente con IA (Gemini) | ✅ Activo con la clave de Gemini (modelos 3.5). Si la IA falla, usa respuestas oficiales de respaldo |
| Simulador «Estudio OlanoandCo» | ✅ Foto + empresa + sector → perfil de Instagram, web y agente de IA en 3D (CSS). La foto no sale del navegador; a la IA solo van nombre y sector. Sin IA usa plantillas por sector |
| Redacción del diagnóstico con IA | ✅ Activa (probada). Sin IA, usa la orientación por reglas |
| Aviso por correo de cada prospecto | ⏳ Opcional. Requiere un correo del dominio en Hostinger (`NOTIFY_EMAIL`) |
| Dominio | ⏳ Pendiente. Ejecutar `tools/poner_dominio.py` al tenerlo |
| Textos legales | ⏳ Revisión legal pendiente (titular, RIF y plazo de conservación) |

## Variables de entorno (`private/.env`)

Ver `.env.example`. Las importantes:

- `GEMINI_API_KEY`: clave de Google AI Studio. Vacía = modo respaldo.
- `ADMIN_PASSWORD`: contraseña del panel `/admin`.
- `APP_SECRET`: secreto para firmar los tokens anti-spam (si falta, se genera solo).
- `NOTIFY_EMAIL` / `MAIL_FROM`: aviso por correo (opcional).

## Privacidad y seguridad

- La clave de IA nunca llega al navegador: solo la usa el servidor.
- En el diagnóstico, a la IA solo se envían respuestas sobre el negocio, nunca nombre, correo, teléfono ni empresa.
- Los datos se guardan en `private/data`, fuera de la parte pública.
- Con tráfico real o datos sensibles, conviene usar una clave de Gemini de pago: en el plan gratuito, Google puede usar el contenido enviado para mejorar sus modelos.

## Publicar en Hostinger

1. Subir el contenido de `public_html/` a `domains/TU-DOMINIO/public_html/`.
2. Crear `domains/TU-DOMINIO/private/` y subir ahí `private/.env` con valores de producción: contraseña nueva y clave de Gemini. **No subir `private/data/`**, que contiene las pruebas locales.
3. Ejecutar `python3 tools/poner_dominio.py TU-DOMINIO` antes de subir.
4. Cambiar `?v=20261017` en los HTML por la fecha del día, para evitar versiones antiguas en caché.
5. Probar en el dominio el formulario, el diagnóstico, el asistente y `/admin`.

## Probar en local

Con el PHP de pruebas instalado en `~/.local/share/olanoandco-tools/dl/php`:

```
php -S 127.0.0.1:8088 -t public_html tools/router.php
```
