// Criterios de aceptación de la spec 001 que se prueban con `node --test`.
// Todo corre sobre fixtures: ninguna prueba hace pedidos reales.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarFicha, r2, r3, MAX_PEDIDOS, MENSAJE_NO_VTEX, esqueleto } from '../lib/revisor.mjs';
import { CASOS, NO_VTEX } from './casos.mjs';
import { fetchSimulado, leerFixture } from './fetch-simulado.mjs';

const revisar = async (id) => {
  const caso = CASOS.find((c) => c.id === id);
  const f = fetchSimulado();
  const r = await revisarFicha(caso.enlace, { fetch: f });
  return { r, f };
};
const deRegla = (r, regla) => r.hallazgos.filter((h) => h.regla === regla);
const textoDe = (h) => JSON.stringify(h);

// 1 · Paso cero: las tres reglas dan lo esperado sobre los cuatro casos reales.
test('1 · paso cero: los cuatro casos reales dan lo esperado', async () => {
  const esperado = {
    'pardo-pochoclera': { R2: 0, R3: 0, minR4: 1 },
    'colorshop-aerosol': { R2: 0, R3: 0, minR4: 1 },
    'cetrogar-tag-green': { R2: 0, R3: 1, minR4: 0, maxR4: 0 },
    'pigmento-delineador': { R2: 0, R3: 0, minR4: 0, maxR4: 0 },
  };
  for (const [id, e] of Object.entries(esperado)) {
    const { r } = await revisar(id);
    assert.equal(r.estado, 'ok', id);
    assert.equal(deRegla(r, 'R2').length, e.R2, `${id} R2`);
    assert.equal(deRegla(r, 'R3').length, e.R3, `${id} R3`);
    assert.ok(deRegla(r, 'R4').length >= e.minR4, `${id} R4 mínimo`);
    if (e.maxR4 !== undefined) assert.ok(deRegla(r, 'R4').length <= e.maxR4, `${id} R4 máximo`);
  }
});

// 2 · Pardo: un hallazgo R4 que nombra los dos precios.
test('2 · R4 marca la pochoclera de Pardo con $37.800 y $71.699', async () => {
  const { r } = await revisar('pardo-pochoclera');
  const r4s = deRegla(r, 'R4');
  assert.equal(r4s.length, 1);
  const t = textoDe(r4s[0]);
  assert.match(t, /\$37\.800/);
  assert.match(t, /\$71\.699/);
  assert.match(t, /Rojo/);
});

// 3 · Colorshop: un hallazgo R4 con al menos tres variantes bajo "Blanco / 240 cm3".
test('3 · R4 marca el aerosol de Colorshop: tres variantes bajo «Blanco / 240 cm3»', async () => {
  const { r } = await revisar('colorshop-aerosol');
  const grupos = deRegla(r, 'R4').flatMap((h) => h.dato.grupos);
  const blanco = grupos.find((g) => g.variantes[0].visible === 'Blanco / 240 cm3');
  assert.ok(blanco, 'hay un grupo «Blanco / 240 cm3»');
  assert.ok(blanco.variantes.length >= 3);
  const nombres = blanco.variantes.map((v) => v.nombre).join(' | ');
  assert.match(nombres, /Blanco Mate/);
  assert.match(nombres, /Blanco Satinado/);
  assert.match(nombres, /240 Cm3 Blanco/);
});

// 4 · Cetrogar: un hallazgo R3 que enlaza la ficha Blueberry y no el pack.
test('4 · R3 encuentra el hermano Blueberry del localizador green, y no el pack', async () => {
  const { r } = await revisar('cetrogar-tag-green');
  const r3s = deRegla(r, 'R3');
  assert.equal(r3s.length, 1);
  const urls = r3s[0].dato.enlaces.map((e) => e.url);
  assert.ok(urls.includes('https://www.cetrogar.com.ar/localizador-tag-motorola-xt2445-blueberry-cm4690/p'));
  assert.ok(!urls.some((u) => /pack/.test(u)), 'el pack no es un hermano');
});

// 5 · Control: el delineador de Pigmento no da ningún hallazgo.
test('5 · control: el delineador de Pigmento no da hallazgos', async () => {
  const { r } = await revisar('pigmento-delineador');
  assert.equal(r.estado, 'ok');
  assert.deepEqual(r.hallazgos, []);
});

// 6 · R2 con dos fixtures sintéticos, uno de cada lado.
test('6 · R2 marca variantes que comparten la primera foto', () => {
  const [p] = leerFixture('sinteticos/r2-misma-foto.json');
  const h = r2(p);
  assert.equal(h.length, 1);
  const vs = h[0].dato.grupos[0].variantes.map((v) => v.visible).sort();
  assert.deepEqual(vs, ['Blanco', 'Negro']);
});
test('6 · R2 no marca variantes con fotos distintas', () => {
  const [p] = leerFixture('sinteticos/r2-fotos-distintas.json');
  assert.deepEqual(r2(p), []);
});

// 7 · Un enlace que no es VTEX: el mensaje y cero pedidos.
test('7 · enlaces de Tiendanube y WooCommerce: «todavía solo reviso tiendas VTEX», sin pedidos', async () => {
  for (const c of NO_VTEX) {
    const f = fetchSimulado();
    const r = await revisarFicha(c.enlace, { fetch: f });
    assert.equal(r.estado, 'no-vtex', c.id);
    assert.match(r.mensaje.toLowerCase(), /todavía solo reviso tiendas vtex/);
    assert.equal(f.pedidos.length, 0, `${c.id} no hace pedidos`);
  }
  assert.equal(MENSAJE_NO_VTEX, 'Todavía solo reviso tiendas VTEX.');
});

// 8 · Como máximo 5 pedidos por revisión.
test('8 · cada revisión hace como máximo 5 pedidos a la tienda', async () => {
  for (const c of CASOS) {
    const f = fetchSimulado();
    const r = await revisarFicha(c.enlace, { fetch: f });
    assert.ok(f.pedidos.length <= 5, `${c.id}: ${f.pedidos.length} pedidos`);
    assert.equal(r.pedidos, f.pedidos.length, `${c.id}: el conteo propio coincide`);
    const host = new URL(c.enlace).host;
    assert.ok(f.pedidos.every((u) => new URL(u).host === host), 'solo pide a la misma tienda');
  }
  assert.equal(MAX_PEDIDOS, 5);
});

// 9 · Todo hallazgo tiene los cuatro campos llenos.
test('9 · todo hallazgo tiene qué pasa, por qué importa, cómo se arregla y dato', async () => {
  const todos = [];
  for (const c of CASOS) todos.push(...(await revisarFicha(c.enlace, { fetch: fetchSimulado() })).hallazgos);
  todos.push(...r2(leerFixture('sinteticos/r2-misma-foto.json')[0]));
  assert.ok(todos.length >= 4);
  for (const h of todos) {
    for (const campo of ['quePasa', 'porQueImporta', 'comoSeArregla']) {
      assert.ok(typeof h[campo] === 'string' && h[campo].trim().length > 20, `${h.regla} ${campo}`);
    }
    const d = h.dato || {};
    assert.ok((d.grupos && d.grupos.length) || (d.enlaces && d.enlaces.length), `${h.regla} dato`);
    // Rúbrica: acción concreta, sin derivar ni "revisá".
    assert.doesNotMatch(h.comoSeArregla, /consult[aá] con|revis[aá]/i, `${h.regla} cómo se arregla`);
    assert.match(h.comoSeArregla, /administrador de VTEX/);
  }
});

// Guardas de R3: ante la duda, no marcar.
test('R3 · no marca productos de otra marca, con palabras de más ni sin color o tamaño', () => {
  const base = { productId: '1', productName: 'Localizador tag Motorola XT2445 green', brand: 'Motorola', linkText: 'a' };
  const cand = (productId, productName, brand = 'Motorola') => ({ productId, productName, brand, linkText: `x-${productId}` });
  const res = r3(base, [
    cand('2', 'Localizador tag Motorola XT2445 Nano Pack 4 Green/Black'),
    cand('3', 'Localizador tag Motorola XT2445 Blueberry', 'Otra'),
    cand('4', 'Localizador tag Motorola XT2445 green'),
    cand('5', 'Localizador tag Motorola XT2445'),
    cand('1', 'Localizador tag Motorola XT2445 black'),
  ], 'tienda.com.ar');
  assert.deepEqual(res, []);
  assert.equal(esqueleto('Mate de calabaza').tieneHuecos, false);
  assert.equal(esqueleto('Aerosol Esmalte 3 En 1').tieneHuecos, false);
});
