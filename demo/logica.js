// Lógica de la demo: cierre, cierre corregido y plan del siguiente evento.
// Módulo puro (sin DOM ni red): lo usan la página (demo.js) y la prueba de paridad (tools/paridad.mjs).
// Todo el cálculo va en céntimos enteros para que no haya errores de redondeo.
//
// Reglas (las mismas que la app):
// - Resultado = ingresos − costes (líneas de venta y de compra del evento).
// - Corregido = resultado + Σ avisos CONFIRMADOS. Justificado, no aplica y detectado no suman nunca.
// - Plan (réplica de generar_plan + resumen_plan): cada línea de compra pasa al plan;
//   si tiene un aviso de precio (M01) confirmado, va al precio de referencia: round(precio − eur / (cantidad × días), 2);
//   riesgo: aviso confirmado → «mitigar»; aviso detectado → «vigilar»; si no, «asumir».
//   Resultado previsto = ingresos − costes del plan × (1 + colchón %).

export const ESTADOS = ['detectado', 'confirmado', 'justificado', 'no_aplica'];

export const c = (eur) => Math.round(eur * 100);          // euros → céntimos
export const eur = (cts) => cts / 100;                      // céntimos → euros

// Redondeo a 2 decimales como numeric de PostgreSQL (mitad hacia fuera de cero), trabajando en céntimos.
function round2cts(valorEur) {
  const x = valorEur * 100;
  return Math.sign(x) * Math.round(Math.abs(x) + 1e-9);
}

export function estadosIniciales(data) {
  const m = {};
  for (const a of data.avisos) m[a.id] = a.estado_inicial;
  return m;
}

export function cierre(data, estados) {
  const ingresos = data.lineas_ingreso.reduce((s, l) => s + c(l.importe), 0);
  const costes = data.lineas_compra.reduce((s, l) => s + c(l.importe), 0);
  const resultado = ingresos - costes;
  const por = { detectado: 0, confirmado: 0, justificado: 0, no_aplica: 0 };
  const n = { detectado: 0, confirmado: 0, justificado: 0, no_aplica: 0 };
  for (const a of data.avisos) {
    const e = estados[a.id];
    por[e] += c(a.eur);
    n[e] += 1;
  }
  return {
    ingresos, costes, resultado,
    margen_pct: Math.round((resultado / ingresos) * 1000) / 10,
    confirmado: por.confirmado,
    detectado: por.detectado,
    justificado: por.justificado,
    no_aplica: por.no_aplica,
    n,
    corregido: resultado + por.confirmado,
  };
}

export function plan(data, estados, colchonPct) {
  const ingresos = data.lineas_ingreso.reduce((s, l) => s + c(l.importe), 0);
  const lineas = data.lineas_compra.map((l) => {
    const avisos = data.avisos.filter((a) => a.linea === l.id);
    const m01conf = avisos.find((a) => a.codigo === 'M01' && estados[a.id] === 'confirmado');
    const unidades = l.cantidad * l.dias;
    const precioCts = m01conf ? round2cts(l.precio_unit - m01conf.eur / unidades) : c(l.precio_unit);
    const importe = Math.round(unidades * precioCts);
    let riesgo = 'asumir';
    if (avisos.some((a) => estados[a.id] === 'confirmado')) riesgo = 'mitigar';
    else if (avisos.some((a) => estados[a.id] === 'detectado')) riesgo = 'vigilar';
    return { id: l.id, descripcion: l.descripcion, cantidad: l.cantidad, unidad: l.unidad, dias: l.dias,
             precio_antes: c(l.precio_unit), precio: precioCts, importe, riesgo };
  });
  const costes = lineas.reduce((s, l) => s + l.importe, 0);
  const colchon = Math.round(costes * colchonPct / 100);
  // resultado sin redondear a céntimos (igual que el servidor); se redondea solo al mostrarlo
  const resultadoExacto = ingresos - costes * (1 + colchonPct / 100);
  const porRiesgo = {};
  for (const r of ['asumir', 'vigilar', 'mitigar']) {
    const ls = lineas.filter((l) => l.riesgo === r);
    porRiesgo[r] = { n: ls.length, importe: ls.reduce((s, l) => s + l.importe, 0) };
  }
  // resultado: en céntimos, redondeado al euro (como se muestra); resultado_exacto_cts: sin redondear
  return { ingresos, costes, colchon_pct: colchonPct, colchon, resultado: Math.round(resultadoExacto / 100) * 100, resultado_exacto_cts: resultadoExacto, lineas, porRiesgo };
}

// Formato español: «21.579 €», «22.671,51 €», agrupando también los miles de 4 cifras (como el resto de la web).
export function fmt(cts, { decimales = 'auto', signo = false } = {}) {
  const neg = cts < 0;
  const abs = Math.abs(cts);
  const ent = Math.floor(abs / 100);
  const dec = abs % 100;
  const entTxt = String(ent).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const conDec = decimales === true || (decimales === 'auto' && dec !== 0);
  const txt = conDec ? `${entTxt},${String(dec).padStart(2, '0')}` : entTxt;
  const s = neg ? '−' : (signo ? '+' : '');
  return `${s}${txt} €`;
}
