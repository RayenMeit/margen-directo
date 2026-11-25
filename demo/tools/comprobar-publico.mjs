// Comprobación previa a publicar (hace de «build»: el repositorio no tiene sistema de build). Falla con código 1 si:
//  1. Hay en demo/ un archivo interno (origen de datos, brief) o una copia exacta del archivo de origen.
//  2. Aparece en algún archivo público un valor del archivo de origen que no esté en data.json ni salga de calcularlo
//     (necesita la ruta al archivo de origen, que vive FUERA del repositorio).
//  3. Aparece un nombre de empresa que no sea uno de los ficticios del caso, o un nombre vetado.
//  4. Hay llamadas de red, cookies, almacenamiento local o analítica; falta la CSP o el noindex.
//  5. data.js no es exactamente data.json.
//  6. La rama toca algún archivo fuera de demo/.
//  7. La demo pesa 300 KB o más sin contar las fuentes.
//   node demo/tools/comprobar-publico.mjs [<ruta-al-archivo-de-origen.json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as L from '../logica.js';

const DEMO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(DEMO, '..');
let fallos = 0;
const ok = (m) => console.log('OK    ' + m);
const mal = (m) => { console.log('FALLA ' + m); fallos++; };

const CSP = "default-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'";
const FICTICIOS = /^(Varios|.*\b(Ejemplo|Demo|demo)\b.*)$/;           // proveedores y terceros admitidos en data.json
const VETADOS = [/champions\s*burger/i];                              // nombres que no pueden aparecer nunca
const SUFIJO = /\b((?:[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&'-]*\s+){1,4})(S\.?\s?L\.?U?|S\.?\s?A\.?U?|S\.?\s?Coop\.?|Ltd\.?|GmbH|Inc\.?|LLC)(?=[\s.,;:)»"']|$)/g;

function archivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? archivos(p) : [p];
  });
}
const todos = archivos(DEMO);
const texto = todos.filter((p) => /\.(html|css|js|mjs|json|md|txt)$/.test(p));
const rel = (p) => path.relative(REPO, p);
const leer = (p) => fs.readFileSync(p, 'utf8');
const data = JSON.parse(leer(path.join(DEMO, 'data.json')));

// 1. archivos internos
const internos = todos.filter((p) => /origen|brief/i.test(path.basename(p)));
internos.length ? internos.forEach((p) => mal(`archivo interno en la carpeta pública: ${rel(p)}`)) : ok('ningún archivo interno (origen, brief) en demo/');
// (marcas montadas por partes para que este archivo no las contenga literalmente)
const MARCAS = new RegExp(['BRIEF-' + 'DEMO', 'Brief para ' + 'Code', 'revision' + '_cowork', 'aviso_para' + '_code'].join('|'));
for (const p of texto) if (MARCAS.test(leer(p))) mal(`${rel(p)} contiene texto del brief o del archivo de origen`);

// 2. valores del archivo de origen
const ruta = process.argv[2];
if (!ruta) console.log('AVISO 2 no se ha pasado el archivo de origen: no se buscan sus valores (hazlo antes de publicar).');
else {
  const origenTxt = fs.readFileSync(ruta);
  const sha = crypto.createHash('sha256').update(origenTxt).digest('hex');
  for (const p of todos) if (crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') === sha) mal(`${rel(p)} es una copia del archivo de origen`);
  const origen = JSON.parse(origenTxt);
  const valores = (x, out = { s: new Set(), n: new Set() }) => {
    if (typeof x === 'string') out.s.add(x);
    else if (typeof x === 'number') out.n.add(x);
    else if (x && typeof x === 'object') Object.values(x).forEach((v) => valores(v, out));
    return out;
  };
  const tokens = (s) => s.split(/[\s()«»"“”'‘’:;,·]+/).filter((t) => t.length >= 12);
  const vo = valores(origen); const vd = valores(data);
  const publicoS = new Set([...vd.s, ...[...vd.s].flatMap(tokens)]);
  // números que la página calcula (cierre y plan en todos los escenarios y colchones): no son fugas
  const derivados = new Set([...vd.n]);
  const est0 = L.estadosIniciales(data);
  const combos = [est0, Object.fromEntries(data.avisos.map((a) => [a.id, 'confirmado'])), Object.fromEntries(data.avisos.map((a) => [a.id, 'no_aplica']))];
  for (const e of combos) {
    const k = L.cierre(data, e);
    [k.ingresos, k.costes, k.resultado, k.corregido, k.confirmado, k.detectado].forEach((v) => derivados.add(v / 100));
    derivados.add(k.margen_pct);
    for (const col of data.plan.colchones) {
      const pl = L.plan(data, e, col);
      [pl.costes, pl.colchon, pl.resultado, pl.ingresos].forEach((v) => derivados.add(v / 100));
      Object.values(pl.porRiesgo).forEach((r) => derivados.add(r.importe / 100));
      pl.lineas.forEach((l) => { derivados.add(l.precio / 100); derivados.add(l.importe / 100); });
    }
  }
  // textos largos (≥ 12) o con cifras (importes con unidad); no palabras sueltas de estado («borrador», «detectado»)
  const candidatos = [...vo.s].filter((s) => (s.length >= 12 || (/\d/.test(s) && s.length >= 6)) && !publicoS.has(s)).concat([...vo.s].flatMap(tokens).filter((t) => !publicoS.has(t)));
  const numeros = [...vo.n].filter((n) => !derivados.has(n) && (Math.abs(n) >= 1000 || !Number.isInteger(n)));
  const variantes = (n) => {
    const [ent, dec] = Math.abs(n).toFixed(2).split('.');
    const pt = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return [...new Set([String(n), `${ent}.${dec}`, `${ent},${dec}`, `${pt},${dec}`, ...(dec === '00' ? [`${pt} €`, `${pt}€`] : [])])];
  };
  let fugas = 0;
  for (const p of texto) {
    if (path.basename(p).startsWith('LICENCIA-')) continue;
    const t = leer(p);
    for (const s of candidatos) if (t.includes(s)) { mal(`${rel(p)} contiene un texto del archivo de origen que no se publica: «${s.slice(0, 40)}…»`); fugas++; }
    for (const n of numeros) for (const v of variantes(n)) if (new RegExp(`(^|[^\\d.,])${v.replace(/[.$]/g, '\\$&')}(?![\\d])`).test(t)) { mal(`${rel(p)} contiene un importe del archivo de origen que ya no se publica (${v})`); fugas++; }
  }
  if (!fugas) ok(`ningún valor del archivo de origen fuera de data.json (${candidatos.length} textos y ${numeros.length} importes vigilados)`);
}

// 3. nombres de empresa
const malos = [...data.documentos.map((d) => d.tercero), ...data.lineas_compra.map((l) => l.proveedor)].filter((n) => !FICTICIOS.test(n));
malos.length ? malos.forEach((n) => mal(`nombre de empresa no ficticio en data.json: «${n}»`)) : ok('todos los proveedores y terceros de data.json son ficticios (Ejemplo/Demo/Varios)');
const admitidos = new Set(data.documentos.map((d) => d.tercero).concat(data.lineas_compra.map((l) => l.proveedor)));
let nombres = 0;
for (const p of texto) {
  if (path.basename(p).startsWith('LICENCIA-')) continue;
  const t = leer(p);
  for (const v of VETADOS) if (v.test(t)) { mal(`${rel(p)} contiene un nombre vetado (${v})`); nombres++; }
  for (const m of t.matchAll(SUFIJO)) {
    const nombre = (m[1] + m[2]).trim();
    if (![...admitidos].some((a) => a.replace(/\s+/g, ' ').includes(nombre.replace(/\s+/g, ' ')) || nombre.includes(a))) { mal(`${rel(p)}: posible empresa real «${nombre}»`); nombres++; }
  }
}
if (!nombres) ok('ninguna empresa con forma jurídica fuera de las ficticias, ni nombres vetados');

// 4. red, cookies, almacenamiento, CSP y noindex
const html = leer(path.join(DEMO, 'index.html'));
html.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`) ? ok('CSP exacta del brief en index.html') : mal('falta la CSP del brief en index.html');
/<meta name="robots" content="noindex">/.test(html) ? ok('noindex') : mal('falta <meta name="robots" content="noindex">');
/<html lang="es">/.test(html) ? ok('lang="es"') : mal('falta lang="es"');
const prohibido = [/\bfetch\s*\(/, /XMLHttpRequest/, /localStorage/, /sessionStorage/, /document\.cookie/, /sendBeacon/, /\bWebSocket\b/, /\bEventSource\b/, /indexedDB/, /https?:\/\//, /\bstyle\s*=/, /<script(?![^>]*\bsrc=)[^>]*>/, /\bon[a-z]+\s*=\s*["']/];
// Única URL externa admitida: el enlace del bloque de cierre, exacta y en un href de index.html. Cualquier otra falla.
// (en el HTML, los & van escritos como &amp;; el navegador lo lee como la URL exacta con sus parámetros UTM)
const URL_CIERRE = 'href="https://brainstreaming.tech/cierre/?utm_source=demo-margen-directo&amp;utm_medium=demo&amp;utm_campaign=demo-2026-12"';
const nCierre = html.split(URL_CIERRE).length - 1;
nCierre === 1 ? ok('una sola URL externa: el href exacto del bloque de cierre') : mal(`el href del bloque de cierre aparece ${nCierre} veces (debe ser 1)`);
let red = 0;
for (const p of texto.filter((p) => !p.includes(`${path.sep}tools${path.sep}`) && !path.basename(p).startsWith('LICENCIA-') && !/\.(md|json)$/.test(p))) {
  const t = p.endsWith('index.html') ? leer(p).split(URL_CIERRE).join('') : leer(p);
  for (const r of prohibido) if (r.test(t)) { mal(`${rel(p)}: patrón no permitido ${r}`); red++; }
}
if (!red) ok('sin red, cookies, almacenamiento, estilos o scripts en línea ni manejadores en atributos');

// 5. data.js = data.json
const djs = leer(path.join(DEMO, 'data.js'));
const m = djs.match(/export default (\{.*\});\s*$/s);
m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(data) ? ok('data.js es exactamente data.json') : mal('data.js no coincide con data.json: vuelve a ejecutar tools/generar-data.mjs');

// 6. nada fuera de demo/
try {
  const base = execFileSync('git', ['-C', REPO, 'merge-base', 'HEAD', 'origin/main'], { encoding: 'utf8' }).trim();
  const cambiados = execFileSync('git', ['-C', REPO, 'diff', '--name-only', base], { encoding: 'utf8' }).split('\n')
    .concat(execFileSync('git', ['-C', REPO, 'ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\n')).filter(Boolean);
  const fuera = [...new Set(cambiados)].filter((f) => !f.startsWith('demo/'));
  fuera.length ? fuera.forEach((f) => mal(`archivo fuera de demo/: ${f}`)) : ok(`ningún archivo fuera de demo/ respecto a main (${base.slice(0, 7)})`);
} catch (e) { mal('no se pudo comparar con origin/main: ' + e.message); }

// 7. peso
const peso = todos.filter((p) => !p.includes(`${path.sep}fonts${path.sep}`) && !p.includes(`${path.sep}tools${path.sep}`)).reduce((s, p) => s + fs.statSync(p).size, 0);
peso < 300 * 1024 ? ok(`peso de la página sin fuentes: ${(peso / 1024).toFixed(1)} KB (< 300 KB)`) : mal(`la página pesa ${(peso / 1024).toFixed(1)} KB sin fuentes`);

console.log(fallos ? `\nCOMPROBACIÓN: ${fallos} FALLO(S)` : '\nCOMPROBACIÓN: OK');
process.exit(fallos ? 1 : 0);
