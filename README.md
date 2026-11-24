# Margen Directo (v0 boceto)

Interfaz de la aplicacion Margen Directo de Brain Streaming. Una sola pagina; los datos viven en Supabase (UE) con inicio de sesion y RLS. Sin datos de clientes en este repositorio.

## Seguridad del front (24/11/2026)

- Sin CDN: `supabase-js` 2.49.1 (UMD) y las fuentes van en `vendor/`, servidas desde este dominio. `index.html` carga `vendor/supabase-js-2.49.1.umd.js` y `app.js` con integridad SRI (`sha384`).
- **Si cambias `app.js`, actualiza su huella en `index.html`** o el navegador no lo ejecutará:
  `openssl dgst -sha384 -binary app.js | openssl base64 -A`
- CSP por `<meta>`: solo scripts propios y conexiones a la API de Supabase del proyecto. GitHub Pages no permite cabeceras, así que `frame-ancestors` no se puede aplicar.
- Todo dato que viene del servidor se pinta escapado con `esc()`.
