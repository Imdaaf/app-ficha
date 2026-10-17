// Servidor para probar la página sin publicar nada. Sin dependencias.
//
//   node scripts/servidor-local.mjs              página + función, leyendo las tiendas de verdad
//   node scripts/servidor-local.mjs --fixtures   página + función, respondiendo con los fixtures
//
// Y en http://localhost:8888/demo/ un resultado de cada tipo, armado con los fixtures.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { revisarFicha, r2 } from '../lib/revisor.mjs';
import { CASOS, NO_VTEX } from '../test/casos.mjs';
import { fetchSimulado, leerFixture, fueraDeLosFixtures, MENSAJE_MODO_PRUEBA } from '../test/fetch-simulado.mjs';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const conFixtures = process.argv.includes('--fixtures');
const puerto = Number(process.env.PORT) || 8888;
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

async function datosDemo() {
  const casos = [];
  for (const c of [...CASOS, ...NO_VTEX]) casos.push({ id: c.id, resultado: await revisarFicha(c.enlace, { fetch: fetchSimulado() }) });
  const [p] = leerFixture('sinteticos/r2-misma-foto.json');
  casos.push({
    id: 'sintetico-r2',
    resultado: { estado: 'ok', producto: { nombre: p.productName, tienda: 'ejemplo sintético', url: 'https://example.com/remera-lisa-algodon/p' }, hallazgos: r2(p), chequeos: {}, pedidos: 0 },
  });
  return casos;
}

function servirArchivo(res, ruta) {
  if (!ruta.startsWith(raiz) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('No está.');
  }
  res.writeHead(200, { 'content-type': tipos[path.extname(ruta)] || 'application/octet-stream' });
  fs.createReadStream(ruta).pipe(res);
}

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, `http://localhost:${puerto}`);
    try {
      if (u.pathname === '/api/revisar') {
        if (conFixtures && fueraDeLosFixtures(u.searchParams.get('url') || '')) {
          res.writeHead(200, { 'content-type': tipos['.json'] });
          return res.end(JSON.stringify({ estado: 'error', mensaje: MENSAJE_MODO_PRUEBA, hallazgos: [], pedidos: 0 }));
        }
        const r = await revisarFicha(u.searchParams.get('url') || '', conFixtures ? { fetch: fetchSimulado() } : {});
        res.writeHead(200, { 'content-type': tipos['.json'] });
        return res.end(JSON.stringify(r));
      }
      if (u.pathname === '/demo/datos.json') {
        res.writeHead(200, { 'content-type': tipos['.json'] });
        return res.end(JSON.stringify(await datosDemo()));
      }
      if (u.pathname === '/demo' || u.pathname === '/demo/') return servirArchivo(res, path.join(raiz, 'demo', 'index.html'));
      const rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.replace(/^\/+/, ''));
      return servirArchivo(res, path.normalize(path.join(raiz, 'public', rel)));
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(err));
    }
  })
  .listen(puerto, () => {
    console.log(`Revisor en http://localhost:${puerto}/  (${conFixtures ? 'con fixtures' : 'leyendo tiendas reales'})`);
    console.log(`Demo con un resultado de cada tipo: http://localhost:${puerto}/demo/`);
  });
