// Genera demo/data.json (publicable, revisable) y demo/data.js (lo que carga la página) desde el archivo de
// origen INTERNO exportado del servidor. El archivo de origen NO se commitea: se pasa por ruta.
//   node demo/tools/generar-data.mjs <ruta-al-archivo-de-origen.json>
//
// Correcciones que aplica (defectos de datos detectados el 25/11):
//  1. Base de cada documento = suma de sus líneas; IVA y total recalculados con el mismo tipo de IVA del documento.
//     Los costes del evento NO cambian: salen de las líneas, no de las bases.
//  2. Líneas sin documento: documentos de ejemplo decididos por Diego (DOCS_EJEMPLO), con base = suma de sus líneas.
//     La dirección de producción propia se queda sin documento, con su etiqueta (SIN_DOC).
//  3. Número de documento que no parece de factura: se usa el número propuesto del archivo (numero_propuesto).
//  4. Los dos avisos de precio del grupo electrógeno se publican cada uno con su documento (no se deduplican).
//  5. La incidencia «segundo grupo electrógeno» repetía la cifra del aviso de partida duplicada: se retira; el aviso
//     cuenta la historia completa (presupuesto con 2 grupos × 3 días; la factura vuelve a cobrar la misma partida).
//  6. Avisos con referencia débil o incorrecta: fuera (AVISOS_PUBLICOS; decisión de Diego).
//  7. Nombres de proveedores: solo los ficticios del archivo; lo comprueba tools/comprobar-publico.mjs.
//  8. Origen de cada aviso: documento, línea, pagado, desvío, N de precios. Referencia (decisión de Diego, opción b
//     limitada): solo en REFERENCIAS_B, redondeada (a 0,50 € por debajo de 20 €; al euro por encima), sin rango ni zona.
// Además: SEVERIDAD de cada aviso (el origen no la trae; valores del servidor), que decide «mitigar» o «vigilar» en el plan.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { precioUnidadTexto, normalizaUnidad } from '../presentacion.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DEMO = path.resolve(AQUI, '..');

// ── Decisiones de Diego (25/11) ──
const AVISOS_PUBLICOS = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07']; // defecto 6: A08–A12 fuera
const REFERENCIAS = 'b';                                                      // §8.1: b limitada a REFERENCIAS_B
const REFERENCIAS_B = ['A01', 'A03', 'A04'];
// Severidad en el servidor (leída en Supabase por Cowork el 25/11; el archivo de origen no la trae)
const SEVERIDAD = { A01: 'alta', A02: 'alta', A03: 'alta', A04: 'alta', A05: 'media', A06: 'media', A07: 'alta' };
// Documentos de ejemplo para las líneas que no tenían (defecto 2). IVA 21 %, salvo la subvención (sin IVA).
const DOCS_EJEMPLO = [
  { ref: 'D6', tipo: 'otro', etiqueta: 'Contratos de actuación', numero: 'CA-2026-01 a 05', tercero: 'Varios', iva_pct: 21, lineas: ['L01'] },
  { ref: 'D7', tipo: 'factura_recibida', numero: 'F-AV-2026/118', tercero: 'AV Demo', iva_pct: 21, lineas: ['L02'] },
  { ref: 'D8', tipo: 'otro', etiqueta: 'Contrato de patrocinio', numero: 'PAT-2026-03', tercero: 'Patrocinador Demo', iva_pct: 21, lineas: ['V2'] },
  { ref: 'D9', tipo: 'otro', etiqueta: 'Resolución de subvención', numero: 'SUB-2026-14', tercero: 'Concello Ejemplo', iva_pct: 0, lineas: ['V3'] },
  { ref: 'D10', tipo: 'otro', etiqueta: 'Contrato de barras', numero: 'BAR-2026-01', tercero: 'Hostelería Demo', iva_pct: 21, lineas: ['V4'] },
];
const SIN_DOC = { L04: 'Coste propio · sin documento' };
const COLCHONES = [0, 5, 8, 10];

const ruta = process.argv[2];
if (!ruta) { console.error('Uso: node demo/tools/generar-data.mjs <archivo-de-origen.json>'); process.exit(2); }
if (path.resolve(ruta).startsWith(path.resolve(DEMO, '..'))) {
  console.error('PARA: el archivo de origen está dentro del repositorio. Muévelo fuera (es interno y no se commitea).');
  process.exit(2);
}
const o = JSON.parse(fs.readFileSync(ruta, 'utf8'));
const cts = (x) => Math.round(x * 100);
const eur = (x) => x / 100;
const fail = (m) => { console.error('PARA: ' + m); process.exit(1); };

// Líneas
const compra = o.lineas_compra.map((l) => {
  const imp = Math.round(l.cantidad * l.dias * cts(l.precio_unit));
  if (imp !== cts(l.importe)) fail(`la línea ${l.id} no cumple cantidad × días × precio`);
  return { id: l.id, familia: l.familia, descripcion: l.descripcion, proveedor: l.proveedor, cantidad: l.cantidad,
           unidad: l.unidad, dias: l.dias, precio_unit: l.precio_unit, importe: l.importe, fase: l.fase, doc: l.doc };
});
const ingreso = o.lineas_ingreso.map((l) => ({ id: l.id, familia: l.familia, descripcion: l.descripcion, importe: l.importe, doc: l.doc }));
for (const d of DOCS_EJEMPLO) for (const id of d.lineas) {
  const l = [...compra, ...ingreso].find((x) => x.id === id);
  if (!l) fail(`documento de ejemplo ${d.numero}: línea ${id} inexistente`);
  if (l.doc) fail(`la línea ${id} ya tenía documento`);
  l.doc = d.ref;
}
for (const [id, etiqueta] of Object.entries(SIN_DOC)) {
  const l = compra.find((x) => x.id === id);
  if (!l || l.doc) fail(`SIN_DOC: la línea ${id} no existe o tiene documento`);
  l.sin_doc = etiqueta;
}
const huerfanas = [...compra, ...ingreso].filter((l) => !l.doc && !l.sin_doc).map((l) => l.id);
if (huerfanas.length) fail(`líneas sin documento ni etiqueta: ${huerfanas.join(', ')}`);

// Documentos (defectos 1 y 3)
const documentos = o.documentos.map((d) => {
  const suma = [...compra, ...ingreso].filter((l) => l.doc === d.ref).reduce((s, l) => s + cts(l.importe), 0);
  const ivaPct = Math.round((d.iva / d.base) * 100);
  const iva = Math.round(suma * ivaPct / 100);
  return { ref: d.ref, tipo: d.tipo, numero: d.numero_propuesto || d.numero, fecha: d.fecha, tercero: d.tercero,
           base: eur(suma), iva_pct: ivaPct, iva: eur(iva), total: eur(suma + iva) };
}).concat(DOCS_EJEMPLO.map((d) => {
  const suma = [...compra, ...ingreso].filter((l) => l.doc === d.ref).reduce((s, l) => s + cts(l.importe), 0);
  const iva = Math.round(suma * d.iva_pct / 100);
  const out = { ref: d.ref, tipo: d.tipo, numero: d.numero, fecha: null, tercero: d.tercero, base: eur(suma), iva_pct: d.iva_pct, iva: eur(iva), total: eur(suma + iva), ejemplo: true };
  if (d.etiqueta) out.etiqueta = d.etiqueta;
  return out;
}));

// Avisos (defectos 4, 6 y 8)
const linea = Object.fromEntries(compra.map((l) => [l.id, l]));
const docNum = Object.fromEntries(documentos.map((d) => [d.ref, d.numero]));
const avisos = o.avisos.filter((a) => AVISOS_PUBLICOS.includes(a.id)).map((a) => {
  const l = linea[a.linea];
  if (!SEVERIDAD[a.id]) fail(`falta la severidad del aviso ${a.id}`);
  const base = { id: a.id, codigo: a.codigo, linea: a.linea, doc: a.doc, estado_inicial: a.estado_servidor, severidad: SEVERIDAD[a.id], eur: a.eur };
  if (a.codigo === 'D03') {
    const dup = compra.filter((x) => x.descripcion === l.descripcion);
    const [pres, fact] = [dup.find((x) => x.doc && docNum[x.doc] && o.documentos.find((d) => d.ref === x.doc).tipo === 'presupuesto_proveedor'),
                          dup.find((x) => x.doc && o.documentos.find((d) => d.ref === x.doc).tipo === 'factura_recibida')];
    if (!pres || !fact) fail('no encuentro el presupuesto y la factura del aviso de partida duplicada');
    return { ...base,
      titulo: `«${l.descripcion}» aparece en 2 documentos`,
      detalle: `El presupuesto ${docNum[pres.doc]} ya incluía ${pres.cantidad} grupos × ${pres.dias} días a ${String(pres.precio_unit).replace('.', ',')} € y la factura ${docNum[fact.doc]} vuelve a cobrar la misma partida. En los costes está contada dos veces: confirmar el aviso devuelve ${String(a.eur).replace('.', ',')} € al resultado.`,
      linea_duplicada: pres.id };
  }
  if (a.codigo !== 'M01') fail(`aviso ${a.id} con código desconocido ${a.codigo}`);
  const pagado = precioUnidadTexto(l);
  const out = { ...base, pagado, desviacion_pct: a.desviacion_pct, n_precios: a.n_precios,
    titulo: `${l.descripcion} a ${pagado}: un ${a.desviacion_pct} % por encima de la referencia` };
  if (a.justificacion) out.justificacion = a.justificacion;
  if (REFERENCIAS === 'b' && REFERENCIAS_B.includes(a.id)) {
    const m = String(a.referencia).match(/^([\d.]+(?:,\d+)?)\s*(.*)$/);
    if (!m) fail(`no entiendo la referencia del aviso ${a.id}`);
    const valor = Number(m[1].replace(/\./g, '').replace(',', '.'));
    const redondeo = valor < 20 ? Math.round(valor * 2) / 2 : Math.round(valor);
    const txt = Number.isInteger(redondeo) ? String(redondeo) : redondeo.toFixed(2).replace('.', ',');
    out.referencia_aprox = normalizaUnidad(`≈ ${txt} ${m[2]}`.trim());
  } else if (REFERENCIAS !== 'a' && REFERENCIAS !== 'b') fail('opción de referencias no implementada');
  return out;
});
for (const a of avisos) if (!linea[a.linea]) fail(`el aviso ${a.id} apunta a una línea inexistente`);

// Incidencias (defecto 5): se retira la que repetía la cifra del aviso de partida duplicada.
const incidencias = o.incidencias.filter((i) => !/segundo grupo/i.test(i.titulo))
  .map((i) => ({ titulo: i.titulo, importe_est: i.importe_est, asume: i.asume, estado: i.estado, detalle: i.detalle }));
if (incidencias.length !== o.incidencias.length - 1) fail('la incidencia del segundo grupo no está o está repetida');

const data = {
  aviso: 'Ejemplo con datos ficticios. Ninguna cifra corresponde a un cliente real.',
  proyecto: { nombre: o.proyecto.nombre, fecha: o.proyecto.fecha, sede: o.proyecto.sede, aforo: o.proyecto.aforo },
  documentos, lineas_compra: compra, lineas_ingreso: ingreso, avisos, incidencias,
  plan: { nombre: o.plan_2027_servidor_25_11.nombre, colchon_pct: o.plan_2027_servidor_25_11.colchon_pct, colchones: COLCHONES },
  config: { referencias: REFERENCIAS },
};
const json = JSON.stringify(data, null, 2) + '\n';
fs.writeFileSync(path.join(DEMO, 'data.json'), json);
fs.writeFileSync(path.join(DEMO, 'data.js'),
  '// GENERADO por tools/generar-data.mjs a partir de data.json. No editar a mano.\n' +
  '// (La CSP de la página, connect-src \'none\', no deja leer data.json con fetch: por eso se carga como módulo.)\n' +
  'export default ' + JSON.stringify(data) + ';\n');
console.log(`data.json y data.js generados: ${documentos.length} documentos, ${compra.length} líneas de compra, ${ingreso.length} de ingreso, ${avisos.length} avisos, ${incidencias.length} incidencias.`);
for (const d of o.documentos) {
  const n = documentos.find((x) => x.ref === d.ref);
  if (cts(n.base) !== cts(d.base)) console.log(`  base de ${n.numero}: ${d.base} → ${n.base} (= suma de líneas); IVA ${n.iva_pct} % y total recalculados`);
}
