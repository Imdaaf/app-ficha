// El servidor local con --fixtures: una ficha VTEX que no está guardada recibe el aviso de modo de
// prueba; las guardadas y los enlaces que no son VTEX siguen su camino de siempre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fueraDeLosFixtures, MENSAJE_MODO_PRUEBA } from './fetch-simulado.mjs';
import { CASOS, NO_VTEX } from './casos.mjs';

test('modo de prueba · una ficha VTEX sin datos guardados recibe el aviso', () => {
  assert.equal(fueraDeLosFixtures('https://www.carrefour.com.ar/jabon-de-tocador-palmolive-naturals-frambuesa-y-mora-x3-90-grs-710183/p'), true);
  assert.match(MENSAJE_MODO_PRUEBA, /modo de prueba/);
  assert.doesNotMatch(MENSAJE_MODO_PRUEBA, /probá de nuevo/i);
});

test('modo de prueba · las cuatro fichas guardadas y los enlaces no VTEX no reciben el aviso', () => {
  for (const c of CASOS) assert.equal(fueraDeLosFixtures(c.enlace), false, c.id);
  for (const c of NO_VTEX) assert.equal(fueraDeLosFixtures(c.enlace), false, c.id);
});
