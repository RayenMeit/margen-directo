# Contraste · demo pública de Margen Directo (rama demo-arte, 25/11/2026)

Calculado con la fórmula WCAG 2.x (luminancia relativa) sobre los valores de `tokens.css`. Mínimo para texto: 4,5 : 1; el par más bajo usado es 6,15 : 1 (morado sobre verde, solo en un titular grande).
«§3» = par de la tabla del brief. «nuevo» = par no listado en el brief, calculado aquí.

| Texto | Fondo | Ratio | Origen | Dónde |
|---|---|---|---|---|
| verde | fondo | 11.55 : 1 | §3 | Cifras y avisos «Por revisar», «Sin documento todavía», «Ejemplo con datos ficticios», enlaces |
| verde | superficie | 10.43 : 1 | §3 | «Sin documento todavía» dentro de un aviso por revisar |
| verde | pie | 12.11 : 1 | nuevo | Cifra «Quedó» en la franja |
| papel | fondo | 16.48 : 1 | nuevo | Titulares y texto |
| papel | superficie | 14.88 : 1 | §3 | Texto del aviso «Por revisar» |
| papel | pie | 17.27 : 1 | nuevo | Cifras de la franja, marca |
| papel | morado | 8.77 : 1 | §3 | Bloque «Justificado», colchón, botón principal, resaltado del cierre |
| texto2 | fondo | 12.62 : 1 | nuevo | Texto secundario, entradillas, cuentas |
| texto2 | pie | 13.23 : 1 | nuevo | Nombre del proyecto en la cabecera |
| apagado | fondo | 8.07 : 1 | nuevo | Notas, metadatos, «No aplica» tachado |
| apagado | superficie | 7.29 : 1 | §3 | Etiquetas de datos del aviso por revisar |
| apagado | pie | 8.46 : 1 | nuevo | «3 avisos» en la franja, números de pestaña |
| tinta | verde | 10.52 : 1 | §3 | Bloque «Confirmado», etiquetas verdes, cierre |
| morado | verde | 6.15 : 1 | §3 | Titular del bloque de cierre |
| verde | tinta | 10.52 : 1 | nuevo (inverso de tinta/verde) | Etiqueta «Confirmado» dentro del bloque verde |
| morado | papel | 8.77 : 1 | nuevo (inverso de papel/morado) | Etiquetas «Justificado», «Corregido»… en papel; opción de colchón marcada |
| fondo | apagado | 8.07 : 1 | nuevo (inverso de apagado/fondo) | Etiqueta «No aplica» |
| tinta 85 % | verde | 8.16 : 1 | nuevo | Rótulos de datos en el bloque «Confirmado» (opacidad .85) |
| papel 85 % | morado | 6.76 : 1 | nuevo | Rótulos de datos en el bloque «Justificado» (opacidad .85) |
| apagado (regla) | fondo | 8.07 : 1 | nuevo | Reglas de 1 px (no texto: separan filas y tarjetas; ≥ 3:1) |
| verde (regla 4px) | superficie | 10.43 : 1 | nuevo | Marca superior del aviso «Por revisar» (no texto) |

## Pares prohibidos que no se usan en ningún sitio
Morado sobre fondo (1,9 : 1), morado sobre superficie (1,7 : 1), papel sobre verde (1,4 : 1), verde sobre blanco (1,6 : 1). El borde `#4A2360` (1,4 : 1) no se usa: `--d-borde` pasa a «apagado».

## Separación sin tono ni borde de color
- Fondo contra superficie da 1,11 : 1: no se usa para separar nada.
- Los avisos se distinguen por el bloque sólido (verde = Confirmado, morado = Justificado), por una regla verde de 4 px arriba (Por revisar) o por una regla apagada de 1 px y el texto tachado (No aplica).
- Además, siempre hay una etiqueta de texto con el estado. Ningún estado va solo por color: en la leyenda, cada uno lleva una muestra de su forma.

## Captura de correo (`correo/captura-correo-1200.png`)
Usa los mismos pares: verde, papel, texto 2 y apagado sobre fondo; papel sobre morado; tinta sobre verde; morado sobre papel.
