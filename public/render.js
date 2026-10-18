// Arma el HTML de un resultado. Es una función pura: la usa la página y la prueban las pruebas.

export const LO_QUE_NO_REVISO = [
  {
    titulo: 'Si la foto muestra la cantidad que dice el título',
    porque: 'Un pack de diez con una foto de dos unidades, por ejemplo. Para verlo hay que mirar la imagen, y esta versión no mira imágenes.',
  },
  {
    titulo: 'Si la foto de cada variante muestra esa variante',
    porque: 'Comparo si dos variantes usan el mismo archivo de foto, no lo que se ve en la foto. Una foto roja cargada en la variante azul no la veo.',
  },
  {
    titulo: 'Si el selector muestra el nombre de cada opción',
    porque: 'Hay tiendas que en el selector muestran solo una foto chiquita por opción, sin el nombre. El nombre está cargado, pero se lee solo en el título, y quien elige mira el selector. Eso depende del diseño de la tienda, y esta versión no mira la página tal como se ve.',
  },
  {
    titulo: 'Cómo se comporta la tienda',
    porque: 'Qué variante viene elegida al entrar, la compra rápida desde el listado, el carrito. Eso es del diseño de la tienda, no de la carga del catálogo, y es igual en todas sus fichas.',
  },
  {
    titulo: 'Todas las fichas hermanas',
    porque: 'Busco otras fichas del mismo producto en los primeros 20 resultados de la tienda, y solo si el nombre tiene un color o un tamaño que reconozco. Ante la duda, no marco: alguna se me puede pasar.',
  },
];

export const SIN_HALLAZGOS = 'No encontré problemas en estos 3 chequeos.';

const CHEQUEOS = {
  R2: 'Variantes con la misma foto',
  R3: 'Variantes separadas en fichas distintas',
  R4: 'Variantes que no se distinguen',
};

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function urlSegura(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' ? x.href : '#';
  } catch {
    return '#';
  }
}

function renderDato(dato) {
  const partes = [];
  for (const g of dato.grupos || []) {
    partes.push(`<div class="grupo"><p class="grupo-titulo">${esc(g.titulo)}</p><ul class="variantes">${(g.variantes || [])
      .map((v) => `<li><span class="v-nombre">${esc(v.nombre)}</span><span class="v-precio">${esc(v.precio)}${v.disponible === false ? ' · sin stock' : ''}</span></li>`)
      .join('')}</ul></div>`);
  }
  if (dato.enlaces && dato.enlaces.length) {
    partes.push(`<ul class="enlaces">${dato.enlaces
      .map((e) => `<li><a href="${esc(urlSegura(e.url))}" target="_blank" rel="noopener noreferrer">${esc(e.texto)}</a></li>`)
      .join('')}</ul>`);
  }
  return partes.join('');
}

export function renderHallazgo(h) {
  return `<article class="hallazgo" data-regla="${esc(h.regla)}">
  <h3><span class="regla">${esc(h.regla)}</span> ${esc(h.titulo)}</h3>
  <dl>
    <dt>Qué pasa</dt><dd>${esc(h.quePasa)}</dd>
    <dt>Por qué lleva a una compra equivocada</dt><dd>${esc(h.porQueImporta)}</dd>
    <dt>Cómo se arregla</dt><dd>${esc(h.comoSeArregla)}</dd>
    <dt>El dato</dt><dd class="dato">${renderDato(h.dato || {})}</dd>
  </dl>
</article>`;
}

export function renderNoReviso() {
  return `<section class="no-reviso" id="lo-que-no-reviso">
  <h2>Lo que no reviso</h2>
  <ul>${LO_QUE_NO_REVISO.map((x) => `<li><strong>${esc(x.titulo)}.</strong> ${esc(x.porque)}</li>`).join('')}</ul>
</section>`;
}

export function renderResultado(r) {
  const partes = [];
  if (!r || r.estado !== 'ok') {
    partes.push(`<section class="aviso" role="status"><p>${esc(r?.mensaje || 'No pude revisar esa ficha.')}</p></section>`);
  } else {
    partes.push(`<section class="ficha">
  <p class="tienda">${esc(r.producto.tienda)}</p>
  <h2><a href="${esc(urlSegura(r.producto.url))}" target="_blank" rel="noopener noreferrer">${esc(r.producto.nombre)}</a></h2>
  <p class="chequeos">Revisé 3 chequeos: ${Object.values(CHEQUEOS).map(esc).join(' · ')}.</p>
</section>`);
    if (r.hallazgos.length === 0) {
      partes.push(`<section class="vacio" role="status"><p>${esc(SIN_HALLAZGOS)}</p></section>`);
    } else {
      partes.push(`<section class="hallazgos"><h2>${r.hallazgos.length === 1 ? 'Encontré 1 problema' : `Encontré ${r.hallazgos.length} problemas`}</h2>${r.hallazgos.map(renderHallazgo).join('')}</section>`);
    }
    if (r.chequeos && r.chequeos.R3 === 'no-se-pudo') {
      partes.push(`<p class="nota">No pude buscar fichas hermanas en la tienda: el chequeo de variantes separadas quedó sin hacer.</p>`);
    }
  }
  partes.push(renderNoReviso());
  return partes.join('\n');
}
