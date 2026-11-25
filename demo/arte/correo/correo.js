// Cifras de la captura de correo: mismo cálculo que la demo (ref/ = copia de demo-publica 609f1c3), estado inicial del ejemplo.
import data from '../ref/data.js';
import * as L from '../ref/logica.js';
const e = L.estadosIniciales(data), c = L.cierre(data, e), p = L.plan(data, e, data.plan.colchon_pct);
const v = {
  queda: L.fmt(c.corregido), base: L.fmt(c.resultado), conf: L.fmt(c.confirmado),
  antes: L.fmt(Math.round((p.ingresos - p.costes) / 100) * 100), pct: data.plan.colchon_pct + ' %',
  colchon: L.fmt(-Math.round(p.colchon / 100) * 100), despues: '= ' + L.fmt(p.resultado),
};
for (const [k, t] of Object.entries(v)) document.querySelectorAll(`[data-f="${k}"]`).forEach(n => { n.textContent = t; });
document.documentElement.dataset.listo = '1';
