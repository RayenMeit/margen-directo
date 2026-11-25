// Prueba de paridad de la demo. Falla (código 1) si algo difiere en un euro.
//   node demo/tools/paridad.mjs [<ruta-al-archivo-de-origen.json>]
// (a) Coherencia interna de data.json, calculada aquí de forma INDEPENDIENTE de logica.js:
//     cada documento: base = Σ líneas, IVA = base × tipo, total = base + IVA; cada línea: importe = cantidad × días × precio;
//     cierre: ingresos − costes = resultado; corregido = resultado + Σ confirmados.
//     Además, logica.js (lo que usa la página) tiene que dar lo mismo que este cálculo independiente.
// (b) Si se pasa el archivo de origen (interno, fuera del repositorio): el cierre y el plan del escenario inicial
//     tienen que coincidir con cierre_servidor_25_11 y plan_2027_servidor_25_11 al euro.
// (c) Tabla de escenarios (inicial; todo lo detectado confirmado; vigilante justificado; todos «no aplica»; colchón 0 %).
//     Los escenarios distintos del inicial los calcula la demo con la regla; Cowork los contrasta después con el servidor.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../logica.js';

const DEMO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(DEMO, 'data.json'), 'utf8'));
let fallos = 0;
const ok = (m) => console.log('OK    ' + m);
const mal = (m) => { console.log('FALLA ' + m); fallos++; };
const cts = (x) => Math.round(x * 100);
const e = (x) => L.fmt(x);

// ── (a) coherencia interna, cálculo independiente ──
for (const l of data.lineas_compra) {
  const esperado = Math.round(l.cantidad * l.dias * l.precio_unit * 100);
  if (esperado !== cts(l.importe)) mal(`línea ${l.id}: ${l.cantidad} × ${l.dias} × ${l.precio_unit} ≠ ${l.importe}`);
}
ok(`${data.lineas_compra.length} líneas de compra: importe = cantidad × días × precio`);
for (const d of data.documentos) {
  const suma = [...data.lineas_compra, ...data.lineas_ingreso].filter((l) => l.doc === d.ref).reduce((s, l) => s + cts(l.importe), 0);
  const iva = Math.round(suma * d.iva_pct / 100);
  if (suma !== cts(d.base)) mal(`documento ${d.numero}: base ${d.base} ≠ suma de líneas ${suma / 100}`);
  else if (iva !== cts(d.iva) || suma + iva !== cts(d.total)) mal(`documento ${d.numero}: IVA o total no cuadran`);
  else ok(`documento ${d.numero}: base ${e(suma)} = suma de sus líneas; IVA ${d.iva_pct} % ${e(iva)}; total ${e(suma + iva)}`);
}
const ingresos = data.lineas_ingreso.reduce((s, l) => s + cts(l.importe), 0);
const costes = data.lineas_compra.reduce((s, l) => s + cts(l.importe), 0);
const est0 = L.estadosIniciales(data);
const conf = data.avisos.filter((a) => est0[a.id] === 'confirmado').reduce((s, a) => s + cts(a.eur), 0);
const k = L.cierre(data, est0);
if (k.ingresos === ingresos && k.costes === costes && k.resultado === ingresos - costes && k.corregido === ingresos - costes + conf)
  ok(`cierre: ${e(ingresos)} − ${e(costes)} = ${e(ingresos - costes)}; corregido = resultado + ${e(conf)} confirmados = ${e(ingresos - costes + conf)}`);
else mal('logica.js no da el mismo cierre que el cálculo independiente');
for (const a of data.avisos) if (!data.lineas_compra.some((l) => l.id === a.linea)) mal(`aviso ${a.id}: línea ${a.linea} inexistente`);
for (const a of data.avisos) if (a.doc && !data.documentos.some((d) => d.ref === a.doc)) mal(`aviso ${a.id}: documento ${a.doc} inexistente`);

// plan independiente (réplica directa de generar_plan/resumen_plan del servidor)
function planIndep(estados, colchon) {
  let total = 0; const riesgo = { asumir: [0, 0], vigilar: [0, 0], mitigar: [0, 0] };
  const fuera = data.avisos.filter((a) => a.codigo === 'D03' && estados[a.id] === 'confirmado').map((a) => a.linea_duplicada);
  for (const l of data.lineas_compra) {
    if (fuera.includes(l.id)) continue;
    const av = data.avisos.filter((a) => a.linea === l.id);
    const m = av.find((a) => a.codigo === 'M01' && estados[a.id] === 'confirmado');
    const precio = m ? Math.round((l.precio_unit - m.eur / (l.cantidad * l.dias)) * 100 + 1e-9) : cts(l.precio_unit);
    const imp = Math.round(l.cantidad * l.dias * precio);
    const r = av.some((a) => estados[a.id] === 'confirmado' && a.severidad === 'alta') ? 'mitigar'
      : av.some((a) => ['confirmado', 'detectado'].includes(estados[a.id])) ? 'vigilar' : 'asumir';
    riesgo[r][0]++; riesgo[r][1] += imp; total += imp;
  }
  return { costes: total, resultado: Math.round((ingresos - total * (1 + colchon / 100)) / 100) * 100, riesgo };
}

// ── (c) escenarios ──
const todos = (estado) => Object.fromEntries(data.avisos.map((a) => [a.id, estado]));
const escenarios = [
  ['Inicial (estados del servidor)', est0, data.plan.colchon_pct],
  ['Todo lo detectado, confirmado', Object.fromEntries(data.avisos.map((a) => [a.id, est0[a.id] === 'detectado' ? 'confirmado' : est0[a.id]])), data.plan.colchon_pct],
  ['Vigilante (A01) justificado', { ...est0, A01: 'justificado' }, data.plan.colchon_pct],
  ['Todos «no aplica»', todos('no_aplica'), data.plan.colchon_pct],
  ['Inicial con colchón 0 %', est0, 0],
];
console.log('\nEscenario                          | Confirmado | Por revisar | Corregido   | Costes plan | Colchón | Resultado previsto');
for (const [nombre, est, col] of escenarios) {
  const ci = L.cierre(data, est); const pl = L.plan(data, est, col); const pi = planIndep(est, col);
  if (pl.costes !== pi.costes || pl.resultado !== pi.resultado) mal(`${nombre}: logica.js y el cálculo independiente del plan difieren`);
  for (const r of ['asumir', 'vigilar', 'mitigar']) if (pl.porRiesgo[r].n !== pi.riesgo[r][0] || pl.porRiesgo[r].importe !== pi.riesgo[r][1]) mal(`${nombre}: riesgo ${r} difiere`);
  console.log(`${nombre.padEnd(34)} | ${e(ci.confirmado).padStart(10)} | ${e(ci.detectado).padStart(11)} | ${e(ci.corregido).padStart(11)} | ${e(pl.costes).padStart(11)} | ${String(col).padStart(5)} % | ${e(pl.resultado).padStart(12)}`);
}
console.log('(«Resultado previsto» redondeado al euro, como se muestra en la página.)\n');

// ── (b) contraste con el servidor ──
const ruta = process.argv[2];
if (!ruta) {
  console.log('AVISO (b) no se ha pasado el archivo de origen: no se contrasta con el servidor.');
} else {
  const o = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  const s = o.cierre_servidor_25_11; const p = o.plan_2027_servidor_25_11;
  const cmp = (nombre, demo, serv) => (Math.round(demo) === Math.round(serv) ? ok(`(b) ${nombre}: igual que el servidor`) : mal(`(b) ${nombre}: demo ${demo} ≠ servidor ${serv}`));
  cmp('ingresos', k.ingresos / 100, s.ingresos);
  cmp('costes', k.costes / 100, s.costes);
  cmp('resultado', k.resultado / 100, s.resultado);
  if (k.margen_pct === s.margen_pct) ok('(b) margen %: igual que el servidor'); else mal(`(b) margen: ${k.margen_pct} ≠ ${s.margen_pct}`);
  cmp('avisos confirmados (€)', k.confirmado / 100, s.avisos_confirmados_eur);
  cmp('resultado corregido', k.corregido / 100, s.resultado_corregido);
  const pl = L.plan(data, est0, p.colchon_pct);
  cmp('ingresos previstos del plan', pl.ingresos / 100, p.ingresos_previstos);
  // Divergencia conocida: el servidor no excluye la línea duplicada (pendiente de corregir en el servidor, fuera de esta
  // tarea). La demo sí. Se comprueba que la diferencia es EXACTAMENTE esa línea, ni un euro más.
  const dup = pl.fuera.reduce((s2, l) => s2 + cts(l.importe), 0);
  console.log(`INFO  (b) divergencia conocida: el servidor no excluye la línea duplicada (${pl.fuera.map((l) => l.id).join(', ') || 'ninguna'}, ${e(dup)}); pendiente de corregir en el servidor, fuera de esta tarea`);
  cmp(`costes del plan + línea duplicada excluida (colchón ${p.colchon_pct} %)`, (pl.costes + dup) / 100, p.costes_plan);
  cmp('resultado previsto − efecto de la línea duplicada', Math.round((pl.resultado_exacto_cts - dup * (1 + p.colchon_pct / 100)) / 100), p.resultado_previsto);
  // Recuento por riesgo: informativo. El plan del servidor es una foto del momento en que se generó (con los 12 avisos y
  // estados de entonces); la demo lo recalcula con los estados actuales y solo con los avisos publicados.
  for (const r of ['asumir', 'vigilar', 'mitigar']) {
    const sv = p.lineas_por_riesgo[r]; const dv = pl.porRiesgo[r];
    console.log(`INFO  (b) líneas «${r}»: ${dv.n === sv.n && Math.round(dv.importe / 100) === Math.round(sv.importe) ? 'igual que el servidor' : 'distinto del plan guardado en el servidor (foto anterior; no cambia costes ni resultado)'}`);
  }
}
console.log(fallos ? `\nPARIDAD: ${fallos} FALLO(S)` : '\nPARIDAD: OK');
process.exit(fallos ? 1 : 0);
