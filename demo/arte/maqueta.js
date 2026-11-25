/* Maqueta de dirección de arte de la demo pública de Margen Directo (rama demo-arte).
   NO es la demo: la construye la sesión de código en demo/ (rama demo-publica) con su data.json.
   Aquí solo están las cifras del ejemplo FICTICIO necesarias para maquetar (avisos A01–A07, tres documentos);
   sin identificadores de base de datos ni proveedores de la base de precios. */
'use strict';

const D = {
  base: 18723, ingresos: 123850, costes: 105127,
  docs: [
    { tipo: 'Presupuesto de proveedor', numero: 'P-2026-041', fecha: '20/05/2026', tercero: 'Energía Ejemplo S.L.', base: 588,
      lineas: [['Grupo electrógeno 100 kVA insonorizado', '2 ud × 3 días × 98,00 €', 588]] },
    { tipo: 'Factura recibida', numero: 'F-2026-0288', fecha: '25/07/2026', tercero: 'Energía Ejemplo S.L.', base: 4236,
      lineas: [['Grupo electrógeno 100 kVA insonorizado', '2 ud × 3 días × 98,00 €', 588], ['Cuadro de distribución 125 A', '4 ud × 3 días × 60,00 €', 720],
               ['Gasóleo y combustible', '1 ud × 1.500,00 €', 1500], ['Electricista de guardia', '14 h × 3 días × 34,00 €', 1428]] },
    { tipo: 'Liquidación de taquilla', numero: 'LIQ-01', fecha: '05/08/2026', tercero: 'Ticketera demo', base: 61250,
      lineas: [['Entradas vendidas', '2.450 × 25,00 € netos', 61250]] }
  ],
  sindoc: [
    ['Coste', 'Cachés artísticos (5 bandas)', 38000], ['Coste', 'Sonido, luz y pantalla (pack)', 21500], ['Coste', 'Dirección de producción (propia)', 4200],
    ['Ingreso', 'Patrocinio principal (firmado)', 25000], ['Ingreso', 'Barras: canon fijo + variable', 22600], ['Ingreso', 'Subvención municipal (concedida)', 15000]
  ],
  avisos: [
    { id: 'A07', tipo: 'precio', estado: 'no_aplica', eur: 2807, titulo: 'Dirección de producción (propia) a 4.200 €: la referencia es 1.393 €',
      pagado: '4.200 € (coste propio)', ref: '1.393 € (auxiliares de producción)', base: '6 precios', doc: null,
      motivo: 'Coste interno de la productora: no es comparable con auxiliares. Por eso no cuenta.' },
    { id: 'A01', tipo: 'precio', estado: 'confirmado', eur: 2268, titulo: 'Vigilante de seguridad a 27,50 €/h: la referencia es 17,00 €',
      pagado: '27,50 €/h', ref: '17,00 €/h', base: '3 precios · 16,60–17,50 €/h · Galicia', doc: 'Factura F-2026/0731' },
    { id: 'A04', tipo: 'precio', estado: 'detectado', eur: 960.03, titulo: 'Técnicos de sonido y luz a 260 €/día: la referencia es 206,67 €',
      pagado: '260,00 €/día', ref: '206,67 €/día', base: '8 precios · 142,50–245,50 €', doc: 'Factura F-2026/0731' },
    { id: 'A03', tipo: 'precio', estado: 'justificado', eur: 607.5, titulo: 'Carpa backstage y catering a 9,50 €/m²: la referencia es 7,48 €',
      pagado: '9,50 €/m²', ref: '7,48 €/m²', base: '16 precios · 3,25–9,25 €', doc: 'Factura F-114/26' },
    { id: 'A02', tipo: 'duplicado', estado: 'confirmado', eur: 588, titulo: '«Grupo electrógeno 100 kVA insonorizado» aparece en 2 documentos',
      pagado: 'En presupuesto y en factura', ref: 'Una sola vez (la de la factura)', base: 'Misma partida: 2 ud × 3 días × 98 €', doc: 'Presupuesto P-2026-041 y factura F-2026-0288' },
    { id: 'A06', tipo: 'precio', estado: 'detectado', eur: 66.24, titulo: 'Grupo electrógeno 100 kVA a 98,00 €/ud/día: la referencia es 86,96 €',
      pagado: '98,00 €/ud/día', ref: '86,96 €/ud/día', base: '5 precios · 84,20–146,64 €', doc: 'Factura F-2026-0288' },
    { id: 'A05', tipo: 'precio', estado: 'detectado', eur: 66.24, titulo: 'Grupo electrógeno 100 kVA a 98,00 €/ud/día: la referencia es 86,96 €',
      pagado: '98,00 €/ud/día', ref: '86,96 €/ud/día', base: '5 precios · 84,20–146,64 €', doc: 'Presupuesto P-2026-041' }
  ],
  riesgos: [['mitigar', 'Mitigar', 2, 4260, 'Se cambia antes de firmar'], ['vigilar', 'Vigilar', 8, 15393, 'Se revisa antes de firmar'], ['asumir', 'Asumir', 10, 83206, 'Precio razonable: se acepta']]
};
const ETIQ = { confirmado: 'Confirmado', detectado: 'Por revisar', justificado: 'Justificado', no_aplica: 'No aplica' };
const ACCION = [['confirmado', 'Confirmar'], ['justificado', 'Justificar'], ['no_aplica', 'No aplica']];
const ORIGINAL = Object.fromEntries(D.avisos.map(a => [a.id, a.estado]));
const est = { avisos: { ...ORIGINAL }, colchon: 8 };

const eur = (n, dec) => new Intl.NumberFormat('es-ES', { useGrouping: 'always', minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 }).format(n) + ' €';
const eurA = n => eur(n, !Number.isInteger(n));
const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); return e; };

function calc() {
  let conf = 0, rev = 0, nrev = 0, precioConf = 0;
  for (const a of D.avisos) {
    const s = est.avisos[a.id];
    if (s === 'confirmado') { conf += a.eur; if (a.tipo === 'precio') precioConf += a.eur; }
    if (s === 'detectado') { rev += a.eur; nrev++; }
  }
  const costesPlan = D.costes - precioConf;              // como el servidor: el duplicado no baja el coste del plan
  const antes = D.ingresos - costesPlan;
  const colchon = Math.round(costesPlan * est.colchon) / 100;
  return { conf, rev, nrev, queda: D.base + conf, techo: D.base + conf + rev, costesPlan, antes, colchon, despues: antes - colchon };
}

function pintar() {
  const c = calc();
  const set = (k, v) => document.querySelectorAll(`[data-f="${k}"]`).forEach(n => { n.textContent = v; });
  set('queda', eur(Math.round(c.queda))); set('corregido', '+' + eurA(Math.round(c.conf * 100) / 100)); set('revisar', eurA(Math.round(c.rev * 100) / 100));
  set('revisar-n', c.nrev === 1 ? '1 aviso' : `${c.nrev} avisos`); set('base', eur(D.base)); set('techo', eurA(Math.round(c.techo * 100) / 100));
  set('p-ingresos', eur(D.ingresos)); set('p-costes', '−' + eur(Math.round(c.costesPlan))); set('p-antes', eur(Math.round(c.antes)));
  set('p-colchon', '−' + eur(Math.round(c.colchon))); set('p-despues', eur(Math.round(c.despues)));
  const sd = D.sindoc.filter(x => x[0] === 'Coste').reduce((s, x) => s + x[2], 0);
  set('pct-sindoc', Math.round(sd / D.costes * 100) + ' %');
  const max = c.techo;
  document.querySelector('[data-barra="base"]').style.setProperty('--w', (D.base / max * 100).toFixed(1) + '%');
  document.querySelector('[data-barra="queda"]').style.setProperty('--w', (c.queda / max * 100).toFixed(1) + '%');
  for (const a of D.avisos) {
    const li = document.getElementById('av-' + a.id), s = est.avisos[a.id];
    li.className = 'aviso est-' + s;
    li.querySelector('.estado').className = 'estado est-' + s;
    li.querySelector('.estado').textContent = ETIQ[s];
    li.querySelectorAll('[data-accion]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.accion === s)));
  }
}

function construir() {
  $('#docs').append(...D.docs.map(d => el('article', { class: 'doc' },
    el('p', { class: 'doc-cab' }, el('span', { class: 'e e-verde' }, d.tipo), ' ', el('span', { class: 'meta' }, `${d.numero} · ${d.fecha} · ${d.tercero}`)),
    el('table', { class: 'lineas' }, el('caption', { class: 'sr' }, `Líneas leídas de ${d.tipo.toLowerCase()} ${d.numero}`),
      el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Línea'), el('th', { scope: 'col' }, 'Cantidad × precio'), el('th', { scope: 'col', class: 'num' }, 'Importe'))),
      el('tbody', {}, d.lineas.map(l => el('tr', {}, el('td', {}, l[0]), el('td', { class: 'meta' }, l[1]), el('td', { class: 'num cifra' }, eurA(l[2])))))),
    el('p', { class: 'doc-pie' }, 'Base del documento ', el('b', { class: 'cifra' }, eurA(d.base)), ' · coincide con la suma de sus líneas')
  )));
  $('#sindoc').append(el('ul', { class: 'lista-sindoc' }, D.sindoc.map(x => el('li', {},
    el('span', { class: 'tipo' }, x[0]), el('span', { class: 'desc' }, x[1]), el('b', { class: 'cifra' }, eur(x[2])), el('span', { class: 'sindoc' }, 'Sin documento todavía')))));

  $('#avisos').append(...D.avisos.map(a => el('li', { id: 'av-' + a.id, class: 'aviso est-' + a.estado },
    el('p', { class: 'aviso-cab' }, el('span', { class: 'estado est-' + a.estado }, ETIQ[a.estado]), el('span', { class: 'aviso-eur cifra' }, eurA(a.eur))),
    el('h3', { class: 'aviso-t' }, a.titulo),
    el('dl', { class: 'aviso-datos' },
      el('div', {}, el('dt', {}, 'Pagaste'), el('dd', {}, a.pagado)),
      el('div', {}, el('dt', {}, 'Referencia'), el('dd', {}, a.ref, el('small', {}, a.base))),
      el('div', {}, el('dt', {}, 'Documento'), el('dd', {}, a.doc ? a.doc : el('span', { class: 'sindoc' }, 'Sin documento todavía')))),
    a.motivo ? el('p', { class: 'motivo' }, a.motivo) : null,
    el('p', { class: 'acciones', role: 'group', 'aria-label': 'Decisión sobre este aviso' },
      ACCION.map(([s, t]) => el('button', { type: 'button', 'data-accion': s, 'aria-pressed': 'false', onclick: () => cambiar(a, s) }, t)))
  )));

  const max = Math.max(...D.riesgos.map(r => r[3]));
  $('#riesgos').append(...D.riesgos.map(([k, t, n, imp, expl]) => el('li', { class: 'riesgo riesgo-' + k },
    el('p', { class: 'riesgo-cab' }, el('span', { class: 'riesgo-t' }, t), el('span', { class: 'meta' }, `${n} partidas · ${expl}`), el('b', { class: 'cifra' }, eur(imp))),
    el('span', { class: 'barra', 'data-w': (imp / max * 100).toFixed(1) }))));
  document.querySelectorAll('.riesgo .barra').forEach(b => b.style.setProperty('--w', b.dataset.w + '%'));

  document.querySelectorAll('input[name="colchon"]').forEach(i => i.addEventListener('change', () => { est.colchon = +i.value; pintar(); anunciar(`Colchón al ${i.value} %. Después del colchón: ${$('[data-f="p-despues"]').textContent}.`); }));
  $('#reiniciar').addEventListener('click', () => { est.avisos = { ...ORIGINAL }; est.colchon = 8; $('input[name="colchon"][value="8"]').checked = true; pintar(); anunciar('Ejemplo original restaurado.'); });
}

function cambiar(a, s) {
  est.avisos[a.id] = est.avisos[a.id] === s ? 'detectado' : s;   // pulsar otra vez el mismo estado lo devuelve a «Por revisar»
  pintar();
  anunciar(`${ETIQ[est.avisos[a.id]]}. Quedó ${$('[data-f="queda"]').textContent}; por revisar ${$('[data-f="revisar"]').textContent}.`);
}
function anunciar(t) { const v = $('#vivo'); v.textContent = ''; setTimeout(() => { v.textContent = t; }, 30); }

function ruta() {
  const v = (location.hash.replace('#/', '') || 'entra');
  const id = ['entra', 'no-cuadra', 'queda'].includes(v) ? v : 'entra';
  document.querySelectorAll('.vista').forEach(s => { s.hidden = s.id !== 'v-' + id; });
  document.querySelectorAll('.vistas a').forEach(a => a.toggleAttribute('aria-current', a.dataset.vista === id));
  document.body.dataset.vista = id;
  if (id === 'queda') { const s = $('#v-queda'); s.classList.remove('crece'); void s.offsetWidth; s.classList.add('crece'); }
}

construir(); pintar(); ruta();
window.addEventListener('hashchange', () => { ruta(); window.scrollTo(0, 0); });
