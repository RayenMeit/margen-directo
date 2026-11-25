// Presentación de cantidades y precios unitarios como los diría un productor. No calcula nada: la lógica está en
// logica.js. Lo usan la página (demo.js) y el generador de datos (tools/generar-data.mjs, para los títulos de avisos).
//   h      → «216 h a 27,50 €/h»            (total de horas = cantidad × días)
//   día    → «18 jornadas a 260 €/jornada»   (total de jornadas)
//   ud/día → «2 grupos × 3 días a 98 €»      («N ud × M días» si no hay nombre propio)
//   viaje  → «2 viajes a 480 €/viaje»;  m²/evento → «300 m² a 9,50 €/m²»;  ud → «24 ud a 115 €»
// Precios unitarios con céntimos solo si los tienen (27,50 €; 98 €).

const miles = (txt) => txt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export function numTxt(x) {
  const cts = Math.round(Math.abs(x) * 100);
  const ent = miles(String(Math.floor(cts / 100)));
  const dec = cts % 100;
  return (x < 0 ? '−' : '') + (dec ? `${ent},${String(dec).padStart(2, '0')}` : ent);
}
const plural = (n, uno, varios) => (n === 1 ? uno : varios);
const nombreUd = (l) => (/grupo electr[óo]geno/i.test(l.descripcion) ? ['grupo', 'grupos'] : ['ud', 'ud']);

export function cantidadTexto(l) {
  const c = l.cantidad, d = l.dias, p = numTxt(l.precio_unit), dias = d > 1 ? ` × ${d} días` : '';
  switch (l.unidad) {
    case 'h': { const n = c * d; return `${numTxt(n)} h a ${p} €/h`; }
    case 'día': { const n = c * d; return `${numTxt(n)} ${plural(n, 'jornada', 'jornadas')} a ${p} €/jornada`; }
    case 'ud/día': { const [s, pl] = nombreUd(l); return `${numTxt(c)} ${plural(c, s, pl)} × ${d} ${plural(d, 'día', 'días')} a ${p} €`; }
    case 'viaje': return `${numTxt(c)} ${plural(c, 'viaje', 'viajes')}${dias} a ${p} €/viaje`;
    case 'm²/evento': return `${numTxt(c)} m²${dias} a ${p} €/m²`;
    case 'ud': return `${numTxt(c)} ud${dias} a ${p} €`;
    default: return `${numTxt(c)} ${l.unidad}${dias} a ${p} €`;
  }
}

export function precioUnidadTexto(l) {
  const p = numTxt(l.precio_unit);
  switch (l.unidad) {
    case 'h': return `${p} €/h`;
    case 'día': return `${p} €/jornada`;
    case 'ud/día': return `${p} € por ${nombreUd(l)[0]} y día`;
    case 'viaje': return `${p} €/viaje`;
    case 'm²/evento': return `${p} €/m²`;
    default: return `${p} €`;
  }
}

// Unidades de un texto de referencia ya redondeado («≈ 207 €/día» → «≈ 207 €/jornada»).
export function normalizaUnidad(txt) {
  return txt.replace('€/m²/evento', '€/m²').replace('€/ud/día', '€ por ud y día').replace('€/día', '€/jornada');
}
