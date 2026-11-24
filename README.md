# Margen Directo (v0 boceto)

Interfaz de la aplicacion Margen Directo de Brain Streaming. Una sola pagina; los datos viven en Supabase (UE) con inicio de sesion y RLS. Sin datos de clientes en este repositorio.

## Seguridad del front (24/11/2026)

- Sin CDN: `supabase-js` 2.49.1 (UMD) y las fuentes van en `vendor/`, servidas desde este dominio. `vendor/supabase-js-2.49.1.umd.js` lleva integridad SRI (`sha384`) en `index.html`. Su nombre lleva la versión: si se actualiza, fichero nuevo y huella nueva, calculada sobre lo confirmado en git (`.gitattributes` impide que Windows cambie los finales de línea):
  `git show HEAD:vendor/supabase-js-X.Y.Z.umd.js | openssl dgst -sha384 -binary | openssl base64 -A`
- `app.js` es del propio dominio y no lleva SRI a propósito: con la caché de GitHub Pages (10 min), un `index.html` viejo con un `app.js` nuevo dejaría la página en blanco.
- CSP por `<meta>`: solo scripts propios y conexiones a la API de Supabase del proyecto. GitHub Pages no permite cabeceras, así que `frame-ancestors` no se puede aplicar.
- Todo dato que viene del servidor se pinta escapado con `esc()`.
