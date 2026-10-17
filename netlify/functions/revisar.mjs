// Función de Netlify (v2): GET /api/revisar?url=<enlace de la ficha>
// Toda la lógica vive en lib/revisor.mjs para poder probarla con fixtures.

import { revisarFicha } from '../../lib/revisor.mjs';

export default async (req) => {
  const enlace = new URL(req.url).searchParams.get('url') || '';
  const resultado = await revisarFicha(enlace);
  return new Response(JSON.stringify(resultado), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};

export const config = { path: '/api/revisar' };
