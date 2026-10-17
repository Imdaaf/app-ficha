// `fetch` simulado: responde con los fixtures guardados en el paso cero y cuenta los pedidos.
// Un pedido que no está en fixtures/indice.json es un error: las pruebas nunca salen a la tienda.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
