// `fetch` simulado: responde con los fixtures guardados en el paso cero y cuenta los pedidos.
// Un pedido que no está en fixtures/indice.json es un error: las pruebas nunca salen a la tienda.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerEnlace, urlProducto } from '../lib/revisor.mjs';

export const DIR_FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const indice = JSON.parse(fs.readFileSync(path.join(DIR_FIXTURES, 'indice.json'), 'utf8'));

export function leerFixture(nombre) {
  return JSON.parse(fs.readFileSync(path.join(DIR_FIXTURES, nombre), 'utf8'));
}

export function fetchSimulado() {
  const pedidos = [];
  const f = async (url) => {
    pedidos.push(String(url));
    const archivo = indice[String(url)];
    if (!archivo) throw new Error(`Pedido sin fixture: ${url}`);
    return new Response(fs.readFileSync(path.join(DIR_FIXTURES, archivo), 'utf8'), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  f.pedidos = pedidos;
  return f;
}

// El servidor local en modo de prueba solo tiene las fichas guardadas. Con cualquier otra ficha VTEX
// tiene que decirlo, en vez de un error que parece de la tienda.
export const MENSAJE_MODO_PRUEBA =
  'Estoy en modo de prueba: solo tengo guardadas las cuatro fichas de la muestra. Para revisar esta ficha, levantá el servidor sin --fixtures.';

export function tieneFixture(url) {
  return Boolean(indice[String(url)]);
}

export function fueraDeLosFixtures(enlace) {
  const e = leerEnlace(enlace);
  return !e.error && !tieneFixture(urlProducto(e.host, e.slug));
}
