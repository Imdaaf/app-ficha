// Paso cero: guarda en fixtures/ las respuestas reales que el revisor pide para los cuatro casos.
// Lo que ya está guardado no se vuelve a pedir. Uso: node scripts/capturar-fixtures.mjs
// Hace pedidos reales a las tiendas: correrlo solo para renovar los fixtures, nunca en las pruebas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { revisarFicha } from '../lib/revisor.mjs';
import { CASOS } from '../test/casos.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const rutaIndice = path.join(dir, 'indice.json');
const indice = fs.existsSync(rutaIndice) ? JSON.parse(fs.readFileSync(rutaIndice, 'utf8')) : {};

for (const caso of CASOS) {
  const fetchQueGuarda = async (url, init) => {
    const archivo = indice[url] || (url.includes("?ft=") ? `${caso.id}-busqueda.json` : `${caso.id}.json`);
    const ruta = path.join(dir, archivo);
    if (indice[url] && fs.existsSync(ruta)) {
      console.log('ya guardado ', archivo);
      return new Response(fs.readFileSync(ruta, 'utf8'), { status: 200 });
    }
    const r = await fetch(url, init);
    const texto = await r.text();
    console.log('pedido      ', r.status, archivo, url);
    if (!r.ok) throw new Error(`La tienda respondió ${r.status} a ${url}`);
    fs.writeFileSync(ruta, texto);
    indice[url] = archivo;
    return new Response(texto, { status: r.status });
  };
  const res = await revisarFicha(caso.enlace, { fetch: fetchQueGuarda });
  console.log(caso.id, res.estado, res.hallazgos.map((h) => h.regla).join(',') || 'sin hallazgos');
}
fs.writeFileSync(rutaIndice, JSON.stringify(indice, null, 2) + '\n');
