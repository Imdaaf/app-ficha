import { renderResultado, renderNoReviso } from './render.js';

const form = document.getElementById('form');
const input = document.getElementById('enlace');
const salida = document.getElementById('resultado');
const boton = form.querySelector('button');

salida.innerHTML = renderNoReviso();

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const enlace = input.value.trim();
  if (!enlace) return;
  boton.disabled = true;
  boton.textContent = 'Revisando…';
  salida.innerHTML = '<p class="cargando">Leyendo la ficha en la tienda…</p>';
  try {
    const r = await fetch('/api/revisar?url=' + encodeURIComponent(enlace));
    const datos = await r.json();
    salida.innerHTML = renderResultado(datos);
  } catch {
    salida.innerHTML = renderResultado({ estado: 'error', mensaje: 'No pude conectarme. Probá de nuevo en un rato.' });
  } finally {
    boton.disabled = false;
    boton.textContent = 'Revisar';
  }
});
