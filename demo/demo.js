// Demo pública de Margen Directo (solo lectura, datos ficticios). Sin red, sin cookies, sin almacenamiento:
// todo el estado vive en memoria y «Volver al ejemplo original» lo reinicia.
import data from './data.js';
import * as L from './logica.js';

const VISTAS = {
  'entra': { titulo: 'Lo que entró', pintar: vistaEntra },
  'no-cuadra': { titulo: 'Lo que no cuadra', pintar: vistaNoCuadra },
  'queda': { titulo: 'Lo que queda', pintar: vistaQueda },
};
const ETIQUETA = { detectado: 'Por revisar', confirmado: 'Confirmado', justificado: 'Justificado', no_aplica: 'No aplica' };
const ACCION = { confirmado: 'Confirmar', justificado: 'Justificar', no_aplica: 'No aplica', detectado: 'Reabrir' };
const ORDEN_ACCIONES = ['confirmado', 'justificado', 'no_aplica', 'detectado'];
const TIPO_DOC = { presupuesto_proveedor: 'Presupuesto de proveedor', factura_recibida: 'Factura recibida', liquidacion: 'Liquidación', factura_emitida: 'Factura emitida', otro: 'Documento' };
const RIESGO = {
  mitigar: ['Mitigar', 'Hubo aviso confirmado: ya va al precio de referencia. Cambia de proveedor o negocia.'],
  vigilar: ['Vigilar', 'Hay un aviso por revisar o confirmado de gravedad media: pide una segunda oferta antes de firmar.'],
  asumir: ['Asumir', 'Sin avisos que cuenten: se mantiene el precio del último evento.'],
};

const estado = { avisos: L.estadosIniciales(data), colchon: data.plan.colchon_pct };
const lineaPorId = Object.fromEntries(data.lineas_compra.map((l) => [l.id, l]));
const docPorRef = Object.fromEntries(data.documentos.map((d) => [d.ref, d]));
const $ = (sel) => document.querySelector(sel);
const euros = (cts) => L.fmt(cts);
const precio = (x) => L.fmt(Math.round(x * 100), { decimales: !Number.isInteger(x) });
const fecha = (iso) => iso.split('-').reverse().join('/');
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Creación de nodos sin innerHTML: todo texto pasa por textContent.
function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

const tipoDoc = (d) => d.etiqueta || TIPO_DOC[d.tipo] || 'Documento';
function docTexto(ref, linea) {
  if (!ref) return h('span', { class: 'sindoc' }, (linea && linea.sin_doc) || 'Sin documento todavía');
  const d = docPorRef[ref];
  return `${d.numero} · ${tipoDoc(d)}`;
}

// ── franja fija ──
function pintarFranja() {
  const k = L.cierre(data, estado.avisos);
  $('#f-quedo').textContent = euros(k.resultado);
  $('#f-corregido').textContent = euros(k.corregido);
  $('#f-revisar').textContent = euros(k.detectado);
}

function anunciar(txt) {
  const a = $('#anuncio');
  a.textContent = '';
  // un tic después para que el lector de pantalla lo lea aunque el texto se repita
  setTimeout(() => { a.textContent = txt; }, 30);
}

// ── vista: lo que entró ──
function vistaEntra(main) {
  const k = L.cierre(data, estado.avisos);
  const p = data.proyecto;
  main.append(
    h('p', { class: 'meta' }, `${fecha(p.fecha)} · ${p.sede} · aforo ${miles(p.aforo)} personas`),
    h('dl', { class: 'tarjetas' },
      h('div', { class: 'tarjeta' }, h('dt', {}, 'Ingresos'), h('dd', { class: 'num' }, euros(k.ingresos))),
      h('div', { class: 'tarjeta' }, h('dt', {}, 'Costes'), h('dd', { class: 'num' }, euros(k.costes))),
      h('div', { class: 'tarjeta' }, h('dt', {}, 'Quedó'), h('dd', { class: 'num' }, euros(k.resultado)), h('dd', { class: 'sub' }, `margen ${String(k.margen_pct).replace('.', ',')} % sobre ingresos`))),
    h('p', { class: 'nota' }, 'Cada cifra sale de una línea. Donde todavía no hay documento detrás, se dice.'),
    h('h2', {}, 'Ingresos'),
    lista(data.lineas_ingreso.map((l) => fila(l.descripcion, euros(L.c(l.importe)), docTexto(l.doc, l)))),
    h('h2', {}, `Costes (${data.lineas_compra.length} líneas)`),
    lista(data.lineas_compra.map((l) => fila(l.descripcion, euros(L.c(l.importe)),
      [`${l.proveedor} · ${miles(l.cantidad)} ${l.unidad}${l.dias > 1 ? ` × ${l.dias} días` : ''} a ${precio(l.precio_unit)} · `, docTexto(l.doc, l)]))),
    h('h2', {}, 'Documentos'),
    lista(data.documentos.map((d) => {
      const n = [...data.lineas_compra, ...data.lineas_ingreso].filter((l) => l.doc === d.ref).length;
      return fila(`${d.numero} · ${tipoDoc(d)}`, euros(L.c(d.total)),
        `${d.tercero}${d.fecha ? ` · ${fecha(d.fecha)}` : ''} · base ${euros(L.c(d.base))} (suma de sus ${n} línea${n === 1 ? '' : 's'}) + ${d.iva_pct ? `IVA ${d.iva_pct} % ${euros(L.c(d.iva))}` : 'sin IVA'}`);
    })),
    h('h2', {}, 'Sorpresas del evento'),
    h('p', { class: 'nota' }, 'Estimaciones abiertas: no cambian el resultado hasta que se cierren.'),
    lista(data.incidencias.map((i) => fila(i.titulo, `≈ ${euros(L.c(i.importe_est))}`, `${i.detalle} Lo asume: ${i.asume === 'nosotros' ? 'la productora' : 'por decidir'}.`))),
  );
}

function lista(items) { return h('ul', { class: 'lista' }, items); }
function fila(titulo, importe, detalle) {
  return h('li', { class: 'fila' },
    h('div', { class: 'fila-cab' }, h('span', { class: 'fila-t' }, titulo), h('span', { class: 'num' }, importe)),
    detalle ? h('p', { class: 'fila-d' }, detalle) : null);
}

// ── vista: lo que no cuadra ──
function vistaNoCuadra(main) {
  const k = L.cierre(data, estado.avisos);
  main.append(
    h('p', { class: 'intro' }, 'Cada línea se compara con precios del sector y con los demás documentos. Un aviso es una pista, no una acusación: confirmar, justificar o descartar lo decides tú.'),
    h('p', { class: 'regla-larga' }, h('strong', {}, 'Solo lo confirmado cuenta.'), ' Justificado, no aplica y por revisar no suman nunca al resultado.'),
    h('dl', { class: 'leyenda', 'aria-label': 'Qué significa cada estado' }, [
      ['confirmado', 'Cuenta en el resultado.'], ['detectado', 'Aún no cuenta.'],
      ['justificado', 'Tenía motivo. No cuenta.'], ['no_aplica', 'No era comparable. No cuenta.'],
    ].map(([e, t]) => h('div', {}, h('dt', {}, h('span', { class: `muestra m-${e}`, 'aria-hidden': 'true' }), h('span', { class: `estado est-${e}` }, ETIQUETA[e])), h('dd', {}, t)))),
    h('dl', { class: 'resumen-estados' }, ['confirmado', 'detectado', 'justificado', 'no_aplica'].map((e) =>
      h('div', {}, h('dt', {}, ETIQUETA[e]), h('dd', {}, `${k.n[e]} · ${euros(k[e])}`)))),
    h('ol', { class: 'avisos' }, data.avisos.map(tarjetaAviso)),
  );
}

function tarjetaAviso(a) {
  const e = estado.avisos[a.id];
  const l = lineaPorId[a.linea];
  const origen = [];
  if (a.codigo === 'D03') {
    const dup = lineaPorId[a.linea_duplicada];
    origen.push(['Documentos', `${docPorRef[dup.doc].numero} (${tipoDoc(docPorRef[dup.doc]).toLowerCase()}) y ${docPorRef[a.doc].numero} (${tipoDoc(docPorRef[a.doc]).toLowerCase()})`]);
    origen.push(['Línea', `${l.descripcion} · ${l.cantidad} × ${l.dias} días a ${precio(l.precio_unit)} = ${euros(L.c(l.importe))}, en los dos`]);
    origen.push(['Contado de más', euros(L.c(a.eur))]);
  } else {
    origen.push(['Documento', docTexto(a.doc, l)]);
    origen.push(['Línea', `${l.descripcion} · ${miles(l.cantidad)} ${l.unidad}${l.dias > 1 ? ` × ${l.dias} días` : ''} = ${euros(L.c(l.importe))}`]);
    origen.push(['Pagado', a.pagado]);
    origen.push(['Por encima de la referencia', `+${a.desviacion_pct} % · ${euros(L.c(a.eur))}`]);
    if (a.referencia_aprox) origen.push(['Referencia', `${a.referencia_aprox} (${a.n_precios} precios del sector)`]);
    else origen.push(['Precios comparados', `${a.n_precios} del sector`]);
  }
  const titId = `t-${a.id}`;
  return h('li', { class: `aviso est-${e}`, id: `aviso-${a.id}`, 'aria-labelledby': titId },
    h('div', { class: 'aviso-cab' },
      h('span', { class: `estado est-${e}` }, ETIQUETA[e]),
      h('span', { class: 'codigo' }, a.codigo === 'D03' ? 'Partida duplicada' : 'Precio'),
      h('span', { class: 'codigo' }, `Gravedad ${a.severidad}`)),
    h('h2', { class: 'aviso-t', id: titId, tabindex: '-1' }, a.titulo),
    a.detalle ? h('p', { class: 'aviso-d' }, a.detalle) : null,
    h('dl', { class: 'origen' }, origen.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))),
    a.justificacion && (e === 'justificado' || e === 'no_aplica') ? h('p', { class: 'aviso-j' }, `Motivo: ${a.justificacion}`) : null,
    h('p', { class: 'cuenta' }, e === 'confirmado' ? `Cuenta: suma ${euros(L.c(a.eur))} al resultado corregido.` : ['No cuenta en el resultado: ', h(e === 'detectado' ? 'span' : 's', { class: 'num' }, euros(L.c(a.eur)))]),
    h('div', { class: 'acciones', role: 'group', 'aria-label': `Acciones para: ${a.titulo}` },
      ORDEN_ACCIONES.filter((x) => x !== e).map((x) => h('button', { type: 'button', class: `btn ${x === 'confirmado' ? 'btn-pri' : 'btn-sec'}`, 'data-aviso': a.id, 'data-estado': x, onclick: cambiarAviso }, ACCION[x]))),
  );
}

function cambiarAviso(ev) {
  const id = ev.currentTarget.dataset.aviso;
  const nuevo = ev.currentTarget.dataset.estado;
  estado.avisos[id] = nuevo;
  const a = data.avisos.find((x) => x.id === id);
  pintarFranja();
  const viejo = document.getElementById(`aviso-${id}`);
  viejo.replaceWith(tarjetaAviso(a));
  const lista = document.querySelector('.resumen-estados');
  if (lista) { const k = L.cierre(data, estado.avisos); lista.replaceWith(h('dl', { class: 'resumen-estados' }, ['confirmado', 'detectado', 'justificado', 'no_aplica'].map((e) => h('div', {}, h('dt', {}, ETIQUETA[e]), h('dd', {}, `${k.n[e]} · ${euros(k[e])}`))))); }
  document.getElementById(`t-${id}`).focus();
  const k = L.cierre(data, estado.avisos);
  anunciar(`Aviso «${a.titulo}»: ${ETIQUETA[nuevo].toLowerCase()}. Corregido ${euros(k.corregido)}. Por revisar ${euros(k.detectado)}.`);
}

// ── vista: lo que queda (estructura de la maqueta de dirección visual: 2026 | 2027 con el colchón como paso propio) ──
function vistaQueda(main) {
  main.append(
    h('div', { class: 'mitades' },
      h('article', { class: 'mitad', 'aria-labelledby': 't-quedo' },
        h('h2', { id: 't-quedo' }, h('span', { class: 'e e-verde' }, '2026'), ' Lo que te quedó'),
        h('div', { id: 'quedo' }, bloqueQuedo())),
      h('article', { class: 'mitad', 'aria-labelledby': 't-quedara' },
        h('h2', { id: 't-quedara' }, h('span', { class: 'e e-verde' }, '2027'), ' Lo que te va a quedar'),
        h('p', { class: 'meta' }, `${data.plan.nombre} · borrador`),
        h('p', { class: 'nota' }, 'Mismo evento, al precio de referencia donde hubo aviso confirmado. Primero sin colchón; después, con él.'),
        h('div', { id: 'plan-antes' }, cuentaAntes(L.plan(data, estado.avisos, estado.colchon))),
        h('div', { class: 'colchon-bloque' },
          h('p', { class: 'colchon-cab' }, h('span', { class: 'e e-papel' }, 'Colchón de imprevistos'), ' ', h('b', { class: 'num', id: 'plan-colchon' }, '')),
          selectorColchon(),
          h('p', { class: 'nota-papel' }, 'No es una pérdida: es dinero apartado para lo que no está en ningún presupuesto. Si no se usa, sigue siendo tuyo.')),
        h('dl', { class: 'cuenta-corregida', id: 'plan-despues' }),
        h('h3', {}, 'Partidas del plan, por riesgo'),
        h('ul', { class: 'lista riesgos', id: 'plan-riesgos' }),
        h('div', { id: 'plan-fuera' }))),
  );
  pintarPlan();
}

function bloqueQuedo() {
  const k = L.cierre(data, estado.avisos);
  const noSuman = [['Justificado', k.justificado], ['No aplica', k.no_aplica], ['Por revisar', k.detectado]].filter(([, v]) => v > 0)
    .map(([t, v]) => `${t.toLowerCase()} (${euros(v)})`);
  return [
    h('p', { class: 'num cifra-xl' }, euros(k.corregido)),
    h('p', { class: 'nota' }, 'Resultado del evento, corregido solo con lo confirmado.'),
    h('dl', { class: 'cuenta-corregida' },
      h('div', {}, h('dt', {}, 'Resultado del evento (lo que pagaste)'), h('dd', { class: 'num' }, euros(k.resultado))),
      h('div', {}, h('dt', {}, `+ Avisos confirmados (${k.n.confirmado})`), h('dd', { class: 'num' }, L.fmt(k.confirmado, { signo: true }))),
      h('div', { class: 'total' }, h('dt', {}, '= Lo que te quedó'), h('dd', { class: 'num' }, euros(k.corregido)))),
    h('p', { class: 'nota' }, noSuman.length ? `No suman: ${noSuman.join(', ')}.` : 'Todo lo revisado ya está decidido.'),
    k.detectado > 0 ? h('p', { class: 'nota' }, 'Si confirmaras también lo que está por revisar: hasta ', h('b', { class: 'num' }, euros(k.corregido + k.detectado)), '.') : null,
  ];
}

function cuentaAntes(pl) {
  return [h('dl', { class: 'cuenta-corregida' },
    h('div', {}, h('dt', {}, 'Ingresos previstos'), h('dd', { class: 'num' }, euros(pl.ingresos))),
    h('div', {}, h('dt', {}, '− Costes con precios corregidos'), h('dd', { class: 'num' }, euros(pl.costes))),
    h('div', { class: 'total' }, h('dt', {}, '= Previsto, antes del colchón'), h('dd', { class: 'num' }, euros(pl.ingresos - pl.costes))))];
}

function pintarPlan() {
  const pl = L.plan(data, estado.avisos, estado.colchon);
  $('#plan-antes').replaceChildren(...cuentaAntes(pl));
  $('#plan-colchon').textContent = `${pl.colchon_pct} % · ${L.fmt(-pl.colchon)}`;
  $('#plan-despues').replaceChildren(h('div', { class: 'total' }, h('dt', {}, '= Después del colchón'), h('dd', { class: 'num' }, euros(pl.resultado))));
  $('#plan-riesgos').replaceChildren(...riesgos(pl));
  $('#plan-fuera').replaceChildren(...fueraPlan(pl));
  return pl;
}

function fueraPlan(pl) {
  if (!pl.fuera.length) return [];
  return [h('p', { class: 'nota' }, ...pl.fuera.map((l) =>
    `Fuera del plan: ${l.descripcion} del ${tipoDoc(docPorRef[l.doc]).toLowerCase()} ${docPorRef[l.doc].numero} (${euros(L.c(l.importe))}). Es la misma partida que la factura y el aviso de partida duplicada está confirmado: se presupuesta una sola vez.`))];
}

function riesgos(pl) {
  return ['mitigar', 'vigilar', 'asumir'].map((r) => {
    const ls = pl.lineas.filter((l) => l.riesgo === r);
    return h('li', { class: `fila riesgo-${r}` },
      h('div', { class: 'fila-cab' }, h('span', { class: 'fila-t' }, `${RIESGO[r][0]} · ${ls.length} partida${ls.length === 1 ? '' : 's'}`), h('span', { class: 'num' }, euros(pl.porRiesgo[r].importe))),
      h('p', { class: 'fila-d' }, RIESGO[r][1]),
      r !== 'asumir' && ls.length ? h('ul', { class: 'sub-lista' }, ls.map((l) =>
        h('li', {}, `${l.descripcion}: ${euros(l.importe)}${l.importe !== Math.round(l.cantidad * l.dias * l.precio_antes) ? ` (en el último evento, ${euros(Math.round(l.cantidad * l.dias * l.precio_antes))})` : ''}`))) : null);
  });
}

function selectorColchon() {
  return h('fieldset', { class: 'colchon' },
    h('legend', {}, 'Reserva para imprevistos'),
    h('div', { class: 'opciones' }, data.plan.colchones.map((v) => h('label', { class: 'opcion' },
      h('input', { type: 'radio', name: 'colchon', value: String(v), checked: v === estado.colchon, onchange: cambiarColchon }),
      h('span', {}, `${v} %`)))));
}

function cambiarColchon(ev) {
  estado.colchon = Number(ev.currentTarget.value);
  const pl = pintarPlan();
  anunciar(`Colchón del ${estado.colchon} %: después del colchón, ${euros(pl.resultado)}.`);
}

// ── navegación por hash ──
function vistaActual() {
  const m = location.hash.match(/^#\/([a-z-]+)$/);
  return m && VISTAS[m[1]] ? m[1] : 'entra';
}

function pintar(enfocar) {
  const v = vistaActual();
  const main = $('#contenido');
  main.replaceChildren(h('h1', { id: 'titulo-vista', tabindex: '-1' }, VISTAS[v].titulo));
  VISTAS[v].pintar(main);
  document.title = `${VISTAS[v].titulo} · ${data.proyecto.nombre} (ejemplo) · Margen Directo`;
  document.querySelectorAll('.vistas a').forEach((a) => {
    if (a.dataset.vista === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  $('#cierre').hidden = v !== 'queda';
  pintarFranja();
  if (enfocar) $('#titulo-vista').focus();
}

function reiniciar() {
  estado.avisos = L.estadosIniciales(data);
  estado.colchon = data.plan.colchon_pct;
  pintar(true);
  anunciar('Ejemplo original restaurado.');
}

window.addEventListener('hashchange', () => pintar(true));
$('#reiniciar').addEventListener('click', reiniciar);
pintar(false);
