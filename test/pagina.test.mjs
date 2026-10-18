// Criterios de la página: 10 (nunca dice que la ficha está bien) y 11 (siempre "Lo que no reviso").
// El 10 también se comprueba con el grep de la spec; acá se prueba el HTML que se arma.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderResultado, SIN_HALLAZGOS } from '../public/render.js';
import { revisarFicha } from '../lib/revisor.mjs';
import { CASOS, NO_VTEX } from './casos.mjs';
import { fetchSimulado } from './fetch-simulado.mjs';

const resultados = async () => {
  const out = {};
  for (const c of [...CASOS, ...NO_VTEX]) out[c.id] = await revisarFicha(c.enlace, { fetch: fetchSimulado() });
  return out;
};

test('11 · «Lo que no reviso» aparece con resultado vacío, con hallazgos y sin VTEX', async () => {
  const rs = await resultados();
  for (const id of ['pigmento-delineador', 'pardo-pochoclera', 'cetrogar-tag-green', 'mistral-tiendanube']) {
    const html = renderResultado(rs[id]);
    assert.match(html, /<h2>Lo que no reviso<\/h2>/, id);
    assert.match(html, /pack/i, `${id}: nombra los packs`);
    assert.match(html, /foto de cada variante/i, `${id}: nombra la foto de cada variante`);
    assert.match(html, /no mira imágenes/i, `${id}: dice por qué`);
    assert.match(html, /selector muestra el nombre/i, `${id}: nombra el selector sin nombres`);
  }
});

test('10 · sin hallazgos dice «no encontré problemas en estos 3 chequeos» y nunca que está bien', async () => {
  const rs = await resultados();
  const vacio = renderResultado(rs['pigmento-delineador']);
  assert.ok(vacio.includes(SIN_HALLAZGOS));
  assert.equal(SIN_HALLAZGOS.toLowerCase(), 'no encontré problemas en estos 3 chequeos.');
  for (const r of Object.values(rs)) {
    assert.doesNotMatch(renderResultado(r), /sin problemas|est[aá] bien|todo ok/i);
  }
});

test('la página escapa lo que viene de la tienda', () => {
  const html = renderResultado({
    estado: 'ok',
    producto: { nombre: '<img src=x onerror=alert(1)>', tienda: 't', url: 'javascript:alert(1)' },
    hallazgos: [],
  });
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /href="javascript:/);
});
