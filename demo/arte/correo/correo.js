// Cifras de la captura de correo: mismo cálculo que la demo (ref/ = copia de demo-publica 609f1c3), estado inicial del ejemplo.
// Ningún número escrito a mano: todo sale de data.js y logica.js.
import data from '../ref/data.js';
import * as L from '../ref/logica.js';
const e = L.estadosIniciales(data), c = L.cierre(data, e);
const av = id => data.avisos.find(a => a.id === id);
const vig = av('A01'), dup = av('A02');                         // los dos avisos confirmados que forman los 2.856 €
if (e.A01 !== 'confirmado' || e.A02 !== 'confirmado' || L.c(vig.eur) + L.c(dup.eur) !== c.confirmado) throw new Error('las pruebas no suman lo confirmado');
const linea = data.lineas_compra.find(l => l.id === dup.linea);
const v = {
  proyecto: data.proyecto.nombre,
  conf: L.fmt(c.confirmado),
  aforo: data.proyecto.aforo.toLocaleString('es-ES', { useGrouping: 'always' }),
  base: L.fmt(c.resultado),
  queda: L.fmt(c.corregido),
  prueba1: `Vigilante a ${vig.pagado} (referencia ${vig.referencia_aprox.replace(/\/[^ ]+$/, '')})`,
  prueba2: `${linea.descripcion.replace(/ \d.*$/, '')} cobrado dos veces: ${L.fmt(L.c(dup.eur))}`,
};
for (const [k, t] of Object.entries(v)) document.querySelectorAll(`[data-f="${k}"]`).forEach(n => { n.textContent = t; });
document.documentElement.dataset.listo = '1';
