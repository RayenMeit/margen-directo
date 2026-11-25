// Demo pública de Margen Directo (solo lectura, datos ficticios). Sin red, sin cookies, sin almacenamiento:
// todo el estado vive en memoria y «Volver al ejemplo original» lo reinicia.
import data from './data.js';
import * as L from './logica.js';
import * as P from './presentacion.js';

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
const al = (cts) => Math.round(cts / 100) * 100;                 // al euro (solo lo que se ve)
// Espacio de no separación entre cifra y unidad («216 h», «18 jornadas», «2 grupos», «3 días», «2.268 €»): no se parten.
const nb = (txt) => String(txt).replace(/(\d) (?=(?:h|jornadas?|grupos?|días?|€|ud|viajes?|m²)(?![A-Za-zÀ-ÿ]))/g, '$1\u00A0');
const euros = (cts) => nb(L.fmt(al(cts)));
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
function haCambiado() {
  const e0 = L.estadosIniciales(data);
  return estado.colchon !== data.plan.colchon_pct || data.avisos.some((a) => estado.avisos[a.id] !== e0[a.id]);
}
function pintarFranja() {
  $('#bloque-reinicio').hidden = !haCambiado();
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

// ── vista: lo que entró (ronda 4: corta; el detalle, plegado) ──
// Nombre de productor por familia de coste; los grupos que no caben en 6 van a «Otros servicios».
const GRUPO = { CACHES: 'Artistas', SONIDO_LUZ_VIDEO: 'Sonido, luz y pantalla', ESCENARIOS_ESTRUCTURAS: 'Escenario y estructuras',
  PERSONAL: 'Personal y producción', SEGURIDAD: 'Seguridad', ENERGIA: 'Energía', TECNICOS_AV: 'Técnicos', CARPAS: 'Carpas',
  WC: 'Aseos', LIMPIEZA: 'Limpieza', RESIDUOS: 'Residuos', VALLAS: 'Vallas', SEGUROS_PERMISOS: 'Seguros y permisos',
  TRANSPORTE: 'Transporte', ELEVACION_MAQUINARIA: 'Maquinaria' };
const MAX_GRUPOS = 7;                       // orientativo (Cowork, 25/11)
const SIEMPRE_APARTE = ['ENERGIA'];         // el grupo electrógeno cobrado dos veces es la historia principal: nunca en «Otros»
function gruposCoste() {
  const por = new Map();
  for (const l of data.lineas_compra) {
    const g = por.get(l.familia) || { nombre: GRUPO[l.familia] || l.familia, total: 0, aviso: false };
    g.total += L.c(l.importe);
    g.aviso = g.aviso || data.avisos.some((a) => a.linea === l.id || a.linea_duplicada === l.id);
    por.set(l.familia, g);
  }
  const lista = [...por.entries()].map(([fam, g]) => ({ ...g, fam })).sort((a, b) => b.total - a.total);
  if (lista.length <= MAX_GRUPOS) return lista;
  const fijos = lista.filter((g) => SIEMPRE_APARTE.includes(g.fam));
  const otros = lista.filter((g) => !SIEMPRE_APARTE.includes(g.fam));
  const sitio = MAX_GRUPOS - 1 - fijos.length;
  const resto = otros.slice(sitio);
  return [...[...otros.slice(0, sitio), ...fijos].sort((a, b) => b.total - a.total),
    { nombre: 'Otros servicios', total: resto.reduce((t, g) => t + g.total, 0), aviso: resto.some((g) => g.aviso) }];
}

function vistaEntra(main) {
  const k = L.cierre(data, estado.avisos);
  const p = data.proyecto;
  const grupos = gruposCoste();
  const max = Math.max(...grupos.map((g) => g.total));
  main.append(
    h('p', { class: 'meta' }, `${fecha(p.fecha)} · ${p.sede} · aforo ${miles(p.aforo)} personas`),
    gancho(),
    comoFunciona(),
    h('dl', { class: 'tarjetas tres' },
      h('div', { class: 'tarjeta' }, h('dt', {}, 'Ingresos'), h('dd', { class: 'num' }, euros(k.ingresos))),
      h('div', { class: 'tarjeta' }, h('dt', {}, 'Costes'), h('dd', { class: 'num' }, euros(k.costes))),
      h('div', { class: 'tarjeta' }, h('dt', {}, 'Quedó'), h('dd', { class: 'num' }, euros(k.resultado)))),
    h('h2', {}, 'Ingresos'),
    h('ul', { class: 'lista compacta' }, data.lineas_ingreso.map((l) => h('li', { class: 'fila-c' },
      h('span', { class: 'fila-t' }, l.descripcion, ' ', h('span', { class: 'doc-peq' }, docTexto(l.doc, l))),
      h('span', { class: 'num' }, euros(L.c(l.importe)))))),
    h('h2', {}, 'Costes'),
    h('ul', { class: 'lista grupos' }, grupos.map((g) => {
      const barra = h('span', { class: 'barra-g', 'aria-hidden': 'true' });
      barra.style.width = `${Math.max(2, Math.round((g.total / max) * 100))}%`;   // CSSOM: permitido por la CSP
      return h('li', { class: 'grupo' },
        h('span', { class: 'grupo-t' }, g.nombre, g.aviso ? [' ', h('span', { class: 'aviso-tag' }, 'aviso')] : null),
        h('span', { class: 'num' }, euros(g.total)),
        h('span', { class: 'barra-pista' }, barra));
    })),
    plegable(`Ver las ${data.lineas_compra.length} líneas`,
      lista(data.lineas_compra.map((l) => fila(l.descripcion, euros(L.c(l.importe)),
        [`${l.proveedor} · ${P.cantidadTexto(l)} · `, docTexto(l.doc, l)])))),
    plegable(`Ver los ${data.documentos.length} documentos`,
      lista(data.documentos.map((d) => {
        const n = [...data.lineas_compra, ...data.lineas_ingreso].filter((l) => l.doc === d.ref).length;
        return fila(`${d.numero} · ${tipoDoc(d)}`, euros(L.c(d.total)),
          `${d.tercero}${d.fecha ? ` · ${fecha(d.fecha)}` : ''} · base ${euros(L.c(d.base))} (suma de sus ${n} línea${n === 1 ? '' : 's'}) + ${d.iva_pct ? `IVA ${d.iva_pct} % ${euros(L.c(d.iva))}` : 'sin IVA'}`);
      }))),
    h('h2', {}, 'Sorpresas del evento'),
    h('ul', { class: 'lista compacta' }, data.incidencias.map((x) => h('li', { class: 'fila-c' },
      h('span', { class: 'fila-t' }, x.titulo), h('span', { class: 'num' }, `≈ ${euros(L.c(x.importe_est))}`)))),
  );
}

function plegable(resumen, ...contenido) {
  return h('details', { class: 'plegable' }, h('summary', {}, resumen), ...contenido);
}

// Gancho: dos líneas con las cifras del ESTADO INICIAL (calculadas, no escritas a mano).
const CORTO = { 'SEGURIDAD': 'un vigilante', 'ENERGIA': 'un grupo electrógeno', 'TECNICOS_AV': 'los técnicos de sonido y luz', 'CARPAS': 'una carpa' };
function gancho() {
  const e0 = L.estadosIniciales(data);
  const k = L.cierre(data, e0);
  const partes = data.avisos.filter((a) => e0[a.id] === 'confirmado').map((a) => {
    const l = lineaPorId[a.linea];
    const quien = CORTO[l.familia] || `«${l.descripcion.toLowerCase()}»`;
    return a.codigo === 'D03' ? `${quien} cobrado dos veces` : `${quien} a ${a.pagado}`;
  });
  const y = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes.join('');
  return h('div', { class: 'gancho' },
    h('p', {}, `Un festival ficticio de ${miles(data.proyecto.aforo)} personas. Sobre el papel le quedaron ${euros(k.resultado)}.`),
    h('p', {}, `Revisando sus documentos aparecieron ${euros(k.confirmado)} pagados de más: ${y}.`),
    h('p', { class: 'gancho-enlace' }, h('a', { href: '#/no-cuadra' }, 'Ver lo que no cuadra →')));
}

function comoFunciona() {
  return h('section', { class: 'como', 'aria-labelledby': 't-como' },
    h('h2', { id: 't-como' }, 'Cómo funciona'),
    h('ol', { class: 'pasos' },
      h('li', {}, 'Me mandas presupuestos, facturas y liquidaciones.'),
      h('li', {}, 'Los vuelco yo: tú no rellenas nada.'),
      h('li', {}, 'Lo revisamos juntos en 20 minutos.')),
    h('p', { class: 'nota' }, 'Con tus datos reales firmamos antes un NDA. Nada entra sin él.'));
}

function lista(items) { return h('ul', { class: 'lista' }, items); }
function fila(titulo, importe, detalle) {
  return h('li', { class: 'fila' },
    h('div', { class: 'fila-cab' }, h('span', { class: 'fila-t' }, titulo), h('span', { class: 'num' }, importe)),
    detalle ? h('p', { class: 'fila-d' }, detalle) : null);
}

// ── vista: lo que no cuadra (ronda 4: tres avisos a la vista; el resto y el detalle, plegados) ──
const A_LA_VISTA = ['A01', 'A02', 'A04'];
const NOMBRE_CORTO = { SEGURIDAD: 'Vigilante', TECNICOS_AV: 'Técnicos de sonido y luz', CARPAS: 'Carpa backstage', ENERGIA: 'Grupo electrógeno', PERSONAL: 'Dirección de producción propia' };
const TIPO_CORTO = { factura_recibida: 'Factura', presupuesto_proveedor: 'Presupuesto', liquidacion: 'Liquidación' };
const docCorto = (ref, minus = false) => { const d = docPorRef[ref]; const t = TIPO_CORTO[d.tipo] || d.etiqueta || 'Documento'; return `${minus ? t.toLowerCase() : t} ${d.numero}`; };
const cantidadCorta = (l) => P.cantidadTexto(l).split(' a ')[0];

function vistaNoCuadra(main) {
  const visibles = data.avisos.filter((a) => A_LA_VISTA.includes(a.id));
  const resto = data.avisos.filter((a) => !A_LA_VISTA.includes(a.id));
  main.append(
    h('p', { class: 'intro' }, 'Cada aviso es una pista, no una acusación: lo confirmas o lo descartas tú. Solo lo confirmado cuenta.'),
    h('ul', { class: 'leyenda-linea', 'aria-label': 'Estados de un aviso' }, ['confirmado', 'detectado', 'justificado', 'no_aplica'].map((e) =>
      h('li', {}, h('span', { class: `muestra m-${e}`, 'aria-hidden': 'true' }), ETIQUETA[e]))),
    h('ol', { class: 'avisos' }, visibles.map(tarjetaAviso)),
    plegable(`Ver ${resto.length} avisos más: justificados, descartados y menores`, h('ol', { class: 'avisos' }, resto.map(tarjetaAviso))),
  );
}

function tituloCorto(a) {
  const l = lineaPorId[a.linea];
  const nombre = NOMBRE_CORTO[l.familia] || l.descripcion;
  if (a.codigo === 'D03') return `${nombre} cobrado dos veces`;
  return `${nombre} a ${a.pagado}${a.referencia_aprox ? ` · referencia ${a.referencia_aprox}` : ` · +${a.desviacion_pct} %`}`;
}

function origenCorto(a) {
  const l = lineaPorId[a.linea];
  if (a.codigo === 'D03') return `${docCorto(lineaPorId[a.linea_duplicada].doc)} y ${docCorto(a.doc, true)} · ${cantidadCorta(l)}`;
  return `${a.doc ? docCorto(a.doc) : (l.sin_doc || 'Sin documento todavía')} · ${cantidadCorta(l)}`;
}

function tarjetaAviso(a) {
  const e = estado.avisos[a.id];
  const l = lineaPorId[a.linea];
  const origen = [];
  if (a.codigo === 'D03') {
    const dup = lineaPorId[a.linea_duplicada];
    origen.push(['Documentos', `${docPorRef[dup.doc].numero} (${tipoDoc(docPorRef[dup.doc]).toLowerCase()}) y ${docPorRef[a.doc].numero} (${tipoDoc(docPorRef[a.doc]).toLowerCase()})`]);
    origen.push(['Línea', `${l.descripcion} · ${P.cantidadTexto(l)} = ${euros(L.c(l.importe))}, en los dos`]);
  } else {
    origen.push(['Documento', docTexto(a.doc, l)]);
    origen.push(['Línea', `${l.descripcion} · ${P.cantidadTexto(l)} = ${euros(L.c(l.importe))}`]);
    origen.push(['Pagado', a.pagado]);
    origen.push(['Por encima de la referencia', `+${a.desviacion_pct} % · ${euros(L.c(a.eur))}`]);
    origen.push(a.referencia_aprox ? ['Referencia', `${a.referencia_aprox} (${a.n_precios} precios del sector)`] : ['Precios comparados', `${a.n_precios} del sector`]);
  }
  origen.push(['Gravedad', a.severidad]);
  const titId = `t-${a.id}`;
  const cuenta = e === 'confirmado';
  return h('li', { class: `aviso aviso-c est-${e}`, id: `aviso-${a.id}`, 'aria-labelledby': titId },
    h('div', { class: 'aviso-fila' },
      h('div', { class: 'aviso-txt' },
        h('h2', { class: 'aviso-t', id: titId, tabindex: '-1' }, h('span', { class: `estado est-${e}` }, ETIQUETA[e]), ' ', nb(tituloCorto(a))),
        h('p', { class: 'aviso-o' }, nb(origenCorto(a)))),
      h(cuenta || e === 'detectado' ? 'p' : 's', { class: 'num aviso-eur' }, `+${euros(L.c(a.eur))}`)),
    h('div', { class: 'acciones', role: 'group', 'aria-label': `Acciones: ${tituloCorto(a)}` },
      ORDEN_ACCIONES.filter((x) => x !== e).map((x) => h('button', { type: 'button', class: `btn ${x === 'confirmado' ? 'btn-pri' : 'btn-sec'}`, 'data-aviso': a.id, 'data-estado': x, onclick: cambiarAviso }, ACCION[x]))),
    plegable('Ver de dónde sale',
      a.detalle ? h('p', { class: 'aviso-d' }, a.detalle) : null,
      h('dl', { class: 'origen' }, origen.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))),
      a.justificacion ? h('p', { class: 'aviso-j' }, `Motivo: ${a.justificacion}`) : null),
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
  document.getElementById(`t-${id}`).focus();
  const k = L.cierre(data, estado.avisos);
  anunciar(`Aviso «${tituloCorto(a)}»: ${ETIQUETA[nuevo].toLowerCase()}. Corregido ${euros(k.corregido)}. Por revisar ${euros(k.detectado)}.`);
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
      h('div', {}, h('dt', {}, `+ Avisos confirmados (${k.n.confirmado})`), h('dd', { class: 'num' }, L.fmt(al(k.confirmado), { signo: true }))),
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
  // al euro y cuadrando a la vista: colchón mostrado = previsto antes (al euro) − después (al euro)
  $('#plan-colchon').textContent = `${pl.colchon_pct} % · ${L.fmt(-(al(pl.ingresos - pl.costes) - pl.resultado))}`;
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
  pintarFranja();
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
