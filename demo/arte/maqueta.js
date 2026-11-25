/* Maqueta de dirección de arte de la demo pública de Margen Directo (rama demo-arte).
   NO es la demo: la construye la sesión de código en demo/ (rama demo-publica).
   Todas las cifras salen de ref/data.js y ref/logica.js (copia de demo-publica, ronda 2, 609f1c3): ningún número escrito a mano. */
import data from './ref/data.js';
import * as L from './ref/logica.js';

const ETIQ = { confirmado: 'Confirmado', detectado: 'Por revisar', justificado: 'Justificado', no_aplica: 'No aplica' };
const ACCION = [['confirmado', 'Confirmar'], ['justificado', 'Justificar'], ['no_aplica', 'No aplica']];
const TIPO = { presupuesto_proveedor: 'Presupuesto de proveedor', factura_recibida: 'Factura recibida', liquidacion: 'Liquidación de taquilla' };
const RIESGO = { mitigar: ['Mitigar', 'Se cambia antes de firmar'], vigilar: ['Vigilar', 'Se revisa antes de firmar'], asumir: ['Asumir', 'Precio razonable: se acepta'] };
const ORIGINAL = L.estadosIniciales(data);
const est = { avisos: { ...ORIGINAL }, colchon: data.plan.colchon_pct };
const docs = Object.fromEntries(data.documentos.map(d => [d.ref, d]));
const tipoDoc = d => d.etiqueta || TIPO[d.tipo] || 'Documento';
const docTxt = ref => { const d = docs[ref]; return d ? `${tipoDoc(d)} ${d.numero}` : null; };
const E = (cts, o) => L.fmt(cts, o);
const fecha = f => f ? f.split('-').reverse().join('/') : null;
const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); return e; };

function pintar() {
  const c = L.cierre(data, est.avisos), p = L.plan(data, est.avisos, est.colchon);
  const antes = p.ingresos - p.costes;
  const set = (k, v) => document.querySelectorAll(`[data-f="${k}"]`).forEach(n => { n.textContent = v; });
  set('queda', E(c.corregido)); set('corregido', E(c.confirmado, { signo: true })); set('revisar', E(c.detectado));
  set('revisar-n', c.n.detectado === 1 ? '1 aviso' : `${c.n.detectado} avisos`); set('base', E(c.resultado)); set('techo', E(c.corregido + c.detectado));
  set('p-ingresos', E(p.ingresos)); set('p-costes', E(-p.costes)); set('p-antes', E(Math.round(antes / 100) * 100));
  set('p-colchon', E(-Math.round(p.colchon / 100) * 100)); set('p-despues', E(p.resultado)); set('p-pct', est.colchon + ' %');
  const fuera = p.fuera.map(l => `${l.descripcion} del ${tipoDoc(docs[l.doc]).toLowerCase()} ${docs[l.doc].numero} (${E(L.c(l.importe))})`);
  $('#fuera').hidden = !fuera.length;
  $('#fuera').textContent = fuera.length ? `Fuera del plan: ${fuera.join('; ')}. Es la misma partida que la factura y el aviso de partida duplicada está confirmado: se presupuesta una sola vez.` : '';
  const max = c.corregido + c.detectado;
  $('[data-barra="base"]').style.setProperty('--w', (c.resultado / max * 100).toFixed(1) + '%');
  $('[data-barra="queda"]').style.setProperty('--w', (c.corregido / max * 100).toFixed(1) + '%');
  const maxR = Math.max(...Object.values(p.porRiesgo).map(r => r.importe));
  $('#riesgos').replaceChildren(...['mitigar', 'vigilar', 'asumir'].map(k => {
    const r = p.porRiesgo[k], b = el('span', { class: 'barra' });
    b.style.setProperty('--w', (r.importe / maxR * 100).toFixed(1) + '%');
    return el('li', { class: 'riesgo riesgo-' + k },
      el('p', { class: 'riesgo-cab' }, el('span', { class: 'riesgo-t' }, RIESGO[k][0]), el('span', { class: 'meta' }, `${r.n} ${r.n === 1 ? 'partida' : 'partidas'} · ${RIESGO[k][1]}`), el('b', { class: 'cifra' }, E(r.importe))), b);
  }));
  for (const a of data.avisos) {
    const li = document.getElementById('av-' + a.id), s = est.avisos[a.id];
    li.className = 'aviso est-' + s;
    const t = li.querySelector('.estado'); t.className = 'estado est-' + s; t.textContent = ETIQ[s];
    li.querySelectorAll('[data-accion]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.accion === s)));
  }
}

function construir() {
  // Vista 1: tres documentos con sus líneas, documentos de ejemplo y la única línea sin documento
  $('#docs').append(...['D1', 'D2', 'D5'].map(ref => {
    const d = docs[ref];
    const lineas = [...data.lineas_compra.filter(l => l.doc === ref).map(l => [l.descripcion, `${l.cantidad} ${l.unidad}${l.dias > 1 ? ` × ${l.dias} días` : ''} × ${E(L.c(l.precio_unit), { decimales: true })}`, L.c(l.importe)]),
                    ...data.lineas_ingreso.filter(l => l.doc === ref).map(l => [l.descripcion, '', L.c(l.importe)])];
    const suma = lineas.reduce((s, l) => s + l[2], 0);
    return el('article', { class: 'doc' },
      el('p', { class: 'doc-cab' }, el('span', { class: 'e e-verde' }, tipoDoc(d)), ' ', el('span', { class: 'meta' }, [d.numero, fecha(d.fecha), d.tercero].filter(Boolean).join(' · '))),
      el('table', { class: 'lineas' }, el('caption', { class: 'sr' }, `Líneas leídas de ${tipoDoc(d).toLowerCase()} ${d.numero}`),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Línea'), el('th', { scope: 'col' }, 'Cantidad × precio'), el('th', { scope: 'col', class: 'num' }, 'Importe'))),
        el('tbody', {}, lineas.map(l => el('tr', {}, el('td', {}, l[0]), el('td', { class: 'meta' }, l[1]), el('td', { class: 'num cifra' }, E(l[2])))))),
      el('p', { class: 'doc-pie' }, 'Base del documento ', el('b', { class: 'cifra' }, E(L.c(d.base))), suma === L.c(d.base) ? ' · coincide con la suma de sus líneas' : ` · sus líneas suman ${E(suma)}`));
  }));
  $('#ejemplos').append(el('ul', { class: 'lista-sindoc' }, data.documentos.filter(d => d.ejemplo).map(d => {
    const linea = [...data.lineas_compra, ...data.lineas_ingreso].find(l => l.doc === d.ref);
    return el('li', {}, el('span', { class: 'tipo' }, tipoDoc(d)), el('span', { class: 'desc' }, linea ? linea.descripcion : d.numero), el('b', { class: 'cifra' }, E(L.c(d.base))),
      el('span', { class: 'meta' }, `${d.numero} · ${d.tercero}`));
  })));
  $('#sindoc').append(el('ul', { class: 'lista-sindoc' }, data.lineas_compra.filter(l => !l.doc).map(l => el('li', {},
    el('span', { class: 'tipo' }, 'Coste propio'), el('span', { class: 'desc' }, l.descripcion), el('b', { class: 'cifra' }, E(L.c(l.importe))), el('span', { class: 'sindoc' }, 'Coste propio · sin documento')))));

  // Vista 2: avisos ordenados por euros
  const avisos = [...data.avisos].sort((a, b) => b.eur - a.eur);
  $('#avisos').append(...avisos.map(a => {
    const ref = a.referencia_aprox ? `${a.referencia_aprox} (${a.n_precios} precios)` : null;
    const dif = a.desviacion_pct != null ? `un ${a.desviacion_pct} % por encima · ${E(L.c(a.eur))}` : E(L.c(a.eur));
    return el('li', { id: 'av-' + a.id, class: 'aviso est-' + a.estado_inicial },
      el('p', { class: 'aviso-cab' }, el('span', { class: 'estado est-' + a.estado_inicial }, ETIQ[a.estado_inicial]), el('span', { class: 'aviso-eur cifra' }, E(L.c(a.eur)))),
      el('h3', { class: 'aviso-t' }, a.titulo),
      el('dl', { class: 'aviso-datos' },
        el('div', {}, el('dt', {}, 'Pagaste'), el('dd', {}, a.pagado || 'Dos veces la misma partida')),
        el('div', {}, el('dt', {}, ref ? 'Referencia' : 'Desvío'), el('dd', {}, ref || dif)),
        el('div', {}, el('dt', {}, 'Documento'), el('dd', {}, a.doc ? docTxt(a.doc) : el('span', { class: 'sindoc' }, 'Coste propio · sin documento')))),
      a.detalle ? el('p', { class: 'motivo' }, a.detalle) : null,
      a.justificacion ? el('p', { class: 'motivo' }, a.justificacion + ' Por eso no cuenta.') : null,
      el('p', { class: 'acciones', role: 'group', 'aria-label': 'Decisión sobre este aviso' },
        ACCION.map(([s, t]) => el('button', { type: 'button', 'data-accion': s, 'aria-pressed': 'false', onclick: () => cambiar(a, s) }, t))));
  }));

  document.querySelectorAll('input[name="colchon"]').forEach(i => i.addEventListener('change', () => { est.colchon = +i.value; pintar(); anunciar(`Colchón al ${i.value} %. Después del colchón: ${$('[data-f="p-despues"]').textContent}.`); }));
  $('#reiniciar').addEventListener('click', () => { est.avisos = { ...ORIGINAL }; est.colchon = data.plan.colchon_pct; $(`input[name="colchon"][value="${est.colchon}"]`).checked = true; pintar(); anunciar('Ejemplo original restaurado.'); });
}

function cambiar(a, s) {
  est.avisos[a.id] = est.avisos[a.id] === s ? 'detectado' : s;   // pulsar otra vez el mismo estado lo reabre («Por revisar»)
  pintar();
  anunciar(`${ETIQ[est.avisos[a.id]]}. Quedó ${$('[data-f="queda"]').textContent}; por revisar ${$('[data-f="revisar"]').textContent}.`);
}
function anunciar(t) { const v = $('#vivo'); v.textContent = ''; setTimeout(() => { v.textContent = t; }, 30); }

function ruta() {
  const v = (location.hash.replace('#/', '') || 'entra');
  const id = ['entra', 'no-cuadra', 'queda'].includes(v) ? v : 'entra';
  document.querySelectorAll('.vista').forEach(s => { s.hidden = s.id !== 'v-' + id; });
  document.querySelectorAll('.vistas a').forEach(a => a.toggleAttribute('aria-current', a.dataset.vista === id));
  if (id === 'queda') { const s = $('#v-queda'); s.classList.remove('crece'); void s.offsetWidth; s.classList.add('crece'); }
}

construir(); pintar(); ruta();
window.addEventListener('hashchange', () => { ruta(); window.scrollTo(0, 0); });
