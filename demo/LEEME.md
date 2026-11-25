# Demo pública de Margen Directo (caso ficticio)

Página estática de solo lectura: «Festival Ría Norte 2026», un evento inventado. Sin registro, sin base de datos, sin llamadas de red, sin cookies ni almacenamiento: todo el estado vive en memoria y «Volver al ejemplo original» lo reinicia.

Vistas: `#/entra` (lo que entró), `#/no-cuadra` (avisos: confirmar, justificar, no aplica, reabrir) y `#/queda` (cierre corregido y plan del siguiente evento con colchón 0, 5, 8 o 10 %). Solo lo confirmado cuenta.

## Probar en local

```bash
cd demo && python3 -m http.server 8000
```

Abrir `http://localhost:8000/`.

## Archivos

- `index.html`, `demo.css`, `tokens.css`, `demo.js`: la página. CSP estricta por `<meta>` y `noindex`.
- `logica.js`: el cálculo (cierre, corregido, plan), sin DOM; lo usan la página y la prueba de paridad.
- `data.json`: los datos publicables. `data.js` es el mismo contenido como módulo: la CSP (`connect-src 'none'`) no deja leer `data.json` con `fetch`.
- `fonts/`: Aleo 300/700, Poppins 400/600 y JetBrains Mono, autoalojadas, con su licencia OFL.
- `tools/`: comprobaciones con Node (sin dependencias).

## Comprobaciones (antes de publicar)

```bash
node demo/tools/generar-data.mjs <archivo-de-origen.json>
```

```bash
node demo/tools/paridad.mjs <archivo-de-origen.json>
```

```bash
node demo/tools/comprobar-publico.mjs <archivo-de-origen.json>
```

El archivo de origen es interno: vive fuera del repositorio y nunca se commitea. Sin él, `paridad.mjs` y `comprobar-publico.mjs` hacen solo las comprobaciones que no lo necesitan.
