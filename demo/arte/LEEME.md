# demo/arte · dirección de arte de la demo pública (rama demo-arte)

Para la sesión de código (rama `demo-publica`). Aquí no se construye la demo: se entregan tokens y maqueta de referencia.

| Archivo | Qué es |
|---|---|
| `tokens.css` | **Definitivo.** Se copia tal cual a `demo/tokens.css`. Mantiene los nombres `--d-*` de `demo-publica` (cambian los valores a los de la guía 2026) y añade `--d-morado`, `--d-apagado`, `--d-regla`, `--d-corte`, `--d-ease`, `--d-est-*` (estados), `--d-riesgo-*` y la escala `--d-t-*` y `--d-esp-*`. Incluye `@font-face` con rutas `fonts/…` |
| `fonts/` | Aleo 300 y 700, Poppins 400 y 600, JetBrains Mono (OFL, con licencias), los mismos que `demo-publica`. Etiquetas en Poppins 600: Aleo solo en titulares |
| `logotipo/` | Logotipo horizontal 2026 (fondo oscuro y una tinta) |
| `index.html`, `maqueta.css`, `maqueta.js` | Maqueta navegable `#/entra`, `#/no-cuadra` y `#/queda`, con franja fija y estados interactivos. Clases alineadas con `demo-publica`: `.franja`, `.aviso`, `.est-confirmado`, `.est-detectado`, `.est-justificado`, `.est-no_aplica`, `.riesgo-mitigar`, `.riesgo-vigilar`, `.riesgo-asumir`, `.sindoc`, `.ficticio`, `.btn-pri`, `.btn-sec`, `.opcion`, `.pie`. CSP sin nada en línea |
| `ref/` | Copia de `data.js` y `logica.js` de `demo-publica` (ronda 2, 609f1c3). La maqueta y la captura de correo calculan con ellos: ninguna cifra escrita a mano |
| `capturas/` | Las tres vistas a 1280 y 390 px |
| `correo/` | `captura-correo-1200.png` (1200 × 680, 26,9 KB), `ALT.txt`, la fuente HTML de la imagen y la prueba sobre claro y oscuro |
| `CONTRASTE.md` | Todos los pares usados, con su ratio |
| `NOTA.md` | Las decisiones, en 10 líneas |

PR #3 es referencia de diseño: no se fusiona a `main`. La sesión de código copia `tokens.css` y lo que necesite de la maqueta a `demo/`. El archivo de datos de origen no está en el repo.
