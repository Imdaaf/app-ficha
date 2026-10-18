// Revisor de ficha de producto VTEX: lee la ficha por la API pública de catálogo y corre
// tres chequeos (R2, R3, R4). Sin dependencias. El `fetch` se inyecta para poder probar con
// respuestas guardadas y contar los pedidos.

import { COLORES, MODIFICADORES_DE_COLOR, UNIDADES, TALLES_SUELTOS } from './vocabulario.mjs';

export const MAX_PEDIDOS = 5;
export const RESULTADOS_BUSQUEDA = 20;
const ESPERA_MS = 6000;
const AGENTE =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

export const MENSAJE_NO_VTEX = 'Todavía solo reviso tiendas VTEX.';

// ---------------------------------------------------------------------------------------------
// Enlace

/** Decide, sin hacer pedidos, si el enlace es una ficha VTEX. Devuelve { host, slug, url } o un error. */
export function leerEnlace(texto) {
  let url;
  try {
    url = new URL(String(texto || '').trim());
  } catch {
    return { error: 'enlace-invalido', mensaje: 'Eso no parece un enlace. Pegá la dirección completa de la ficha, con https://.' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { error: 'enlace-invalido', mensaje: 'Eso no parece un enlace. Pegá la dirección completa de la ficha, con https://.' };
  }
  const host = url.hostname.toLowerCase();
  // No se leen direcciones internas ni números de IP: solo dominios públicos.
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.local') || /^[\d.]+$/.test(host) || host.includes(':')) {
    return { error: 'enlace-invalido', mensaje: 'Eso no parece el enlace de una tienda.' };
  }
  // Las fichas VTEX terminan en /p: https://tienda.com/<slug>/p
  const partes = url.pathname.split('/').filter(Boolean);
  if (partes.length < 2 || partes[partes.length - 1] !== 'p') {
    return { error: 'no-vtex', mensaje: MENSAJE_NO_VTEX };
  }
  const slug = decodeURIComponent(partes[partes.length - 2]);
  if (!/^[\p{L}\p{N}._-]+$/u.test(slug)) {
    return { error: 'no-vtex', mensaje: MENSAJE_NO_VTEX };
  }
  return { host, slug, url: `https://${host}/${encodeURIComponent(slug)}/p` };
}

export function urlProducto(host, slug) {
  return `https://${host}/api/catalog_system/pub/products/search/${encodeURIComponent(slug)}/p`;
}

export function urlBusqueda(host, consulta) {
  return `https://${host}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(consulta)}&_from=0&_to=${RESULTADOS_BUSQUEDA - 1}`;
}

// ---------------------------------------------------------------------------------------------
// Utilidades

export function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const formatoPesos = (n) =>
  '$' + new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

export function pesos(n) {
  return typeof n === 'number' && Number.isFinite(n) ? formatoPesos(n) : 'sin precio';
}

/** Lo que el comprador ve de un valor de variación: "#ffffff_Blanco" se muestra "Blanco". */
export function valorVisible(v) {
  const s = String(Array.isArray(v) ? v[0] ?? '' : v ?? '').trim();
  return s.replace(/^#?[0-9a-f]{3,8}_/i, '').trim();
}

/** La oferta que ve el comprador: la de un vendedor que la tiene a la venta, prefiriendo el principal. */
function oferta(sku) {
  const vendedores = sku?.sellers || [];
  const aLaVenta = (v) => (v?.commertialOffer?.AvailableQuantity ?? 0) > 0 && (v?.commertialOffer?.Price ?? 0) > 0;
  const v = vendedores.find((x) => x.sellerDefault && aLaVenta(x)) || vendedores.find(aLaVenta) || vendedores.find((x) => x.sellerDefault) || vendedores[0];
  const o = v?.commertialOffer || {};
  return {
    precio: typeof o.Price === 'number' ? o.Price : null,
    stock: typeof o.AvailableQuantity === 'number' ? o.AvailableQuantity : null,
    comprable: aLaVenta(v),
  };
}

/** Si alguna variante del producto se puede comprar. */
function algunaComprable(producto) {
  return (producto?.items || []).some((sku) => oferta(sku).comprable);
}

/** Campos de variación del producto: la unión, en orden, de los que declaran sus SKU. */
function camposDeVariacion(producto) {
  const campos = [];
  for (const sku of producto.items || []) {
    for (const c of sku.variations || []) {
      const nombre = typeof c === 'string' ? c : c?.name;
      if (nombre && !campos.includes(nombre)) campos.push(nombre);
    }
  }
  return campos;
}

/** Variantes del producto con lo que el comprador ve en el selector. */
export function variantes(producto) {
  const campos = camposDeVariacion(producto);
  return (producto.items || []).map((sku) => {
    const { precio, stock, comprable } = oferta(sku);
    let valores;
    let visible;
    if (campos.length === 0) {
      // Sin variaciones cargadas, el selector muestra el nombre del SKU.
      valores = [];
      visible = String(sku.name || '').trim();
    } else {
      valores = campos.map((c) => {
        const crudo = sku[c];
        const v = valorVisible(crudo);
        return { campo: c, valor: v || null };
      });
      visible = valores.map((x) => x.valor ?? `sin ${x.campo}`).join(' / ');
    }
    return {
      id: sku.itemId,
      nombre: String(sku.name || '').trim(),
      visible,
      valores,
      faltan: valores.filter((x) => !x.valor).map((x) => x.campo),
      precio,
      stock,
      comprable,
      imagen: sku.images?.[0]?.imageId ?? null,
      imagenUrl: sku.images?.[0]?.imageUrl ?? null,
    };
  });
}

function listaVariantes(vs) {
  return vs.map((v) => ({ nombre: v.nombre, visible: v.visible, precio: pesos(v.precio), disponible: v.stock === null ? null : v.stock > 0 }));
}

function agrupar(lista, clave) {
  const m = new Map();
  for (const x of lista) {
    const k = clave(x);
    if (k === null || k === undefined || k === '') continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return [...m.values()];
}

// ---------------------------------------------------------------------------------------------
// R4 · Variantes que no se distinguen

export function r4(producto) {
  // Una variante que no se puede comprar no lleva a una compra equivocada.
  const vs = variantes(producto).filter((v) => v.comprable);
  if (vs.length < 2) return [];
  const campos = camposDeVariacion(producto);
  // Sin atributos de variante la ficha no muestra selector: el comprador ve una sola variante y no
  // puede confundirla con otra. Pardo, 18/10/2026: dos «Rojo» a distinto precio y en pantalla una sola.
  if (campos.length === 0) return [];
  const grupos = agrupar(vs, (v) => normalizar(v.visible)).filter((g) => {
    if (g.length < 2) return false;
    const precios = new Set(g.map((v) => v.precio));
    const nombres = new Set(g.map((v) => normalizar(v.nombre)));
    return precios.size > 1 || nombres.size > 1; // mismo valor visible y distinto producto o precio
  });
  if (grupos.length === 0) return [];

  const completos = grupos.filter((g) => g[0].faltan.length === 0);
  const incompletos = grupos.filter((g) => g[0].faltan.length > 0);
  const hallazgos = [];

  const describirGrupo = (g) => {
    const precios = new Set(g.map((v) => v.precio));
    const nombres = new Set(g.map((v) => normalizar(v.nombre)));
    const difiere = [nombres.size > 1 ? 'el producto' : null, precios.size > 1 ? 'el precio' : null].filter(Boolean).join(' y ');
    return {
      titulo: `«${g[0].visible}»: ${g.length} variantes, cambia ${difiere}`,
      variantes: listaVariantes(g),
      texto: nombres.size > 1
        ? `«${g[0].visible}»: ` + g.map((v) => `${v.nombre} a ${pesos(v.precio)}`).join(' · ')
        : `«${g[0].visible}»: ${g.length} variantes con el mismo nombre, a ` + g.map((v) => pesos(v.precio)).join(' y '),
    };
  };

  if (completos.length > 0) {
    const total = completos.reduce((n, g) => n + g.length, 0);
    const ejemplo = completos[0];
    hallazgos.push({
      regla: 'R4',
      titulo: 'Variantes que no se distinguen',
            quePasa: `En el selector, ${total} variantes se ven iguales en ${completos.length === 1 ? 'una opción' : `${completos.length} opciones`}, y no son iguales: cambia el precio o el producto.`,
      porQueImporta:
        'El comprador elige una opción y no sabe cuál de las variantes se lleva. Puede pagar otro precio, o recibir otro producto que el que quería.',
            comoSeArregla: `En el administrador de VTEX (Catálogo › Productos y SKUs), cargá en cada SKU un valor distinto de «${campos.join('» o «')}» que diga lo que cambia, por ejemplo «Blanco mate» y «Blanco satinado». Si es el mismo producto cargado dos veces, desactivá el SKU que sobra.`,
      dato: { grupos: completos.map(describirGrupo) },
    });
  }

  if (incompletos.length > 0) {
    const faltan = [...new Set(incompletos.flatMap((g) => g[0].faltan))];
    const total = incompletos.reduce((n, g) => n + g.length, 0);
    hallazgos.push({
      regla: 'R4',
      titulo: 'Variantes sin valor en el selector',
      quePasa: `${total} variantes no tienen cargado «${faltan.join('» ni «')}». En el selector quedan iguales entre sí, y no lo son.`,
      porQueImporta:
        'El comprador no puede elegir cuál quiere: se lleva la que la tienda tome primero, que puede ser otro color u otro precio que el que buscaba.',
      comoSeArregla: `En el administrador de VTEX (Catálogo › Productos y SKUs), abrí cada uno de esos SKU y cargá su valor de «${faltan.join('» y «')}».`,
      dato: { grupos: incompletos.map(describirGrupo) },
    });
  }
  return hallazgos;
}

// ---------------------------------------------------------------------------------------------
// R2 · Variantes con la misma foto

export function r2(producto) {
  const vs = variantes(producto).filter((v) => v.comprable);
  if (vs.length < 2) return [];
  const grupos = agrupar(vs, (v) => (v.imagen === null ? null : String(v.imagen))).filter(
    (g) => new Set(g.map((v) => normalizar(v.visible))).size > 1
  );
  if (grupos.length === 0) return [];
  const total = grupos.reduce((n, g) => n + g.length, 0);
  return [
    {
      regla: 'R2',
      titulo: 'Variantes con la misma foto',
      quePasa: `${total} variantes distintas usan la misma foto principal. Al cambiar de opción, la foto no cambia.`,
      porQueImporta:
        'El comprador elige mirando la foto. Si la foto muestra otra variante, compra un color o un tamaño pensando que es otro.',
      comoSeArregla:
        'En el administrador de VTEX (Catálogo › Productos y SKUs), entrá a las imágenes de cada SKU y subí como primera imagen la foto de esa variante.',
      dato: {
        grupos: grupos.map((g) => ({
          titulo: `La misma foto en ${g.length} variantes`,
          variantes: listaVariantes(g),
          imagen: g[0].imagenUrl,
          texto: g.map((v) => `«${v.visible}»`).join(', ') + ' comparten la primera foto',
        })),
      },
    },
  ];
}

// ---------------------------------------------------------------------------------------------
// R3 · Variantes separadas en fichas distintas

const esNumero = (p) => /^\d+([.,]\d+)?$/.test(p);
const numeroConUnidad = (p) => {
  const m = /^(\d+(?:[.,]\d+)?)([a-z][a-z0-9]*)$/.exec(p);
  return m && UNIDADES.has(m[2]);
};

/**
 * Parte un nombre en un esqueleto: las palabras, con los colores y tamaños reemplazados por
 * huecos. Dos fichas son hermanas si tienen el mismo esqueleto y distinto valor en algún hueco.
 */
export function esqueleto(nombre) {
  const originales = String(nombre || '').split(/[\s/|,;()]+/).filter(Boolean);
  const pal = originales.map((o) => normalizar(o).replace(/^[^a-z0-9]+|[^a-z0-9.,]+$/g, '').replace(/[.,]$/, ''));
  const piezas = []; // { tipo: 'palabra'|'color'|'tamano', valor, original }
  for (let i = 0; i < pal.length; i++) {
    const p = pal[i];
    if (!p) continue;
    // Tamaño: número + unidad, pegados o separados.
    if (numeroConUnidad(p)) {
      piezas.push({ tipo: 'tamano', valor: p.replace(',', '.') });
      continue;
    }
    if (esNumero(p) && i + 1 < pal.length && UNIDADES.has(pal[i + 1])) {
      piezas.push({ tipo: 'tamano', valor: `${p.replace(',', '.')}${pal[i + 1]}` });
      i++;
      continue;
    }
    // Talle: "talle M", "talle 38", o XL y parecidos sueltos.
    if (p === 'talle' && i + 1 < pal.length && /^([a-z]{1,4}|\d{1,3})$/.test(pal[i + 1])) {
      piezas.push({ tipo: 'tamano', valor: `talle ${pal[i + 1]}` });
      i++;
      continue;
    }
    if (TALLES_SUELTOS.has(p)) {
      piezas.push({ tipo: 'tamano', valor: p });
      continue;
    }
    // Color: una corrida de colores base, con modificadores pegados.
    if (COLORES.has(p)) {
      const valores = [p];
      let j = i + 1;
      while (j < pal.length && (COLORES.has(pal[j]) || MODIFICADORES_DE_COLOR.has(pal[j]))) {
        valores.push(pal[j]);
        j++;
      }
      piezas.push({ tipo: 'color', valor: valores.join(' ') });
      i = j - 1;
      continue;
    }
    piezas.push({ tipo: 'palabra', valor: p, original: originales[i] });
  }
  return {
    forma: piezas.map((x) => (x.tipo === 'palabra' ? x.valor : `[${x.tipo}]`)).join(' '),
    huecos: piezas.filter((x) => x.tipo !== 'palabra').map((x) => x.valor),
    palabras: piezas.filter((x) => x.tipo === 'palabra').map((x) => x.original),
    tieneHuecos: piezas.some((x) => x.tipo !== 'palabra'),
  };
}

/** Qué buscar en la tienda para encontrar hermanas, o null si el nombre no da para buscar. */
export function consultaHermanas(nombre) {
  const e = esqueleto(nombre);
  if (!e.tieneHuecos || e.palabras.length < 2) return null;
  return e.palabras.slice(0, 5).join(' ');
}

export function r3(producto, resultadosBusqueda, host) {
  const base = esqueleto(producto.productName);
  if (!base.tieneHuecos || !Array.isArray(resultadosBusqueda)) return [];
  const marca = normalizar(producto.brand);
  const hermanas = [];
  const vistos = new Set([String(producto.productId)]);
  for (const c of resultadosBusqueda) {
    if (!c || vistos.has(String(c.productId))) continue;
    vistos.add(String(c.productId));
    if (marca && c.brand && normalizar(c.brand) !== marca) continue;
    if (!algunaComprable(c)) continue; // una ficha que no se puede comprar no le quita una opción a nadie
    const e = esqueleto(c.productName);
    if (e.forma !== base.forma) continue; // cualquier palabra de más (pack, kit, nano) la descarta
    if (e.huecos.join('|') === base.huecos.join('|')) continue;
    hermanas.push({ nombre: c.productName, url: `https://${host}/${c.linkText}/p` });
  }
  if (hermanas.length === 0) return [];
  const queCambia = base.forma.includes('[color]') && base.forma.includes('[tamano]')
    ? 'el color o el tamaño'
    : base.forma.includes('[color]') ? 'el color' : 'el tamaño';
  return [
    {
      regla: 'R3',
      titulo: 'Variantes separadas en fichas distintas',
      quePasa: `En la tienda ${hermanas.length === 1 ? 'hay otra ficha' : `hay ${hermanas.length} fichas más`} del mismo producto donde solo cambia ${queCambia}. Cada una es un producto aparte, sin selector.`,
      porQueImporta:
        `Quien entra a esta ficha no ve que hay otra opción. Compra la que tiene adelante aunque buscaba otra, o se va pensando que no hay.`,
      comoSeArregla:
        `En el administrador de VTEX (Catálogo › Productos y SKUs), unificá las fichas en un solo producto con selector de ${queCambia === 'el tamaño' ? 'tamaño' : 'color'}: un SKU por opción. Después desactivá las fichas que sobran y redirigí sus enlaces a la que queda.`,
      dato: {
        enlaces: [{ texto: `${producto.productName} (esta ficha)`, url: `https://${host}/${producto.linkText}/p` }, ...hermanas.map((h) => ({ texto: h.nombre, url: h.url }))],
        texto: hermanas.map((h) => h.nombre).join(' · '),
      },
    },
  ];
}

// ---------------------------------------------------------------------------------------------
// Revisión completa

async function leerJson(fetchFn, url) {
  const r = await fetchFn(url, { headers: { 'User-Agent': AGENTE, Accept: 'application/json' }, signal: AbortSignal.timeout(ESPERA_MS) });
  if (r.status === 401 || r.status === 403) {
    const e = new Error('rechazado');
    e.codigo = 'rechazado';
    throw e;
  }
  if (!r.ok && r.status !== 206) {
    const e = new Error(`status ${r.status}`);
    e.codigo = 'no-leido';
    throw e;
  }
  const texto = await r.text();
  try {
    return JSON.parse(texto);
  } catch {
    const e = new Error('no es JSON');
    e.codigo = 'no-vtex';
    throw e;
  }
}

/**
 * Revisa una ficha. Hace como máximo MAX_PEDIDOS pedidos a la tienda (hoy usa dos).
 * @param {string} enlace
 * @param {{ fetch?: typeof fetch }} [op]
 */
export async function revisarFicha(enlace, op = {}) {
  const fetchReal = op.fetch || globalThis.fetch;
  let pedidos = 0;
  const pedir = (url) => {
    if (pedidos >= MAX_PEDIDOS) throw Object.assign(new Error('demasiados pedidos'), { codigo: 'limite' });
    pedidos++;
    return leerJson(fetchReal, url);
  };

  const e = leerEnlace(enlace);
  if (e.error) return { estado: e.error, mensaje: e.mensaje, hallazgos: [], pedidos };

  let datos;
  try {
    datos = await pedir(urlProducto(e.host, e.slug));
  } catch (err) {
    const mensajes = {
      rechazado: 'La tienda no deja leer su catálogo desde afuera. No puedo revisar esta ficha.',
      'no-vtex': MENSAJE_NO_VTEX + ' Esta tienda no respondió como una tienda VTEX.',
    };
    return { estado: err.codigo === 'no-vtex' ? 'no-vtex' : 'error', mensaje: mensajes[err.codigo] || 'No pude leer la ficha. Probá de nuevo en un rato.', hallazgos: [], pedidos };
  }
  const producto = Array.isArray(datos) ? datos[0] : null;
  if (!producto || !Array.isArray(producto.items)) {
    return { estado: 'error', mensaje: 'No encontré ese producto en la tienda. Revisá que el enlace sea el de una ficha.', hallazgos: [], pedidos };
  }

  const hallazgos = [...r4(producto), ...r2(producto)];

  const consulta = consultaHermanas(producto.productName);
  let busqueda = null;
  let r3Revisado = false;
  if (consulta) {
    try {
      busqueda = await pedir(urlBusqueda(e.host, consulta));
      r3Revisado = true;
    } catch {
      busqueda = null;
    }
  }
  if (busqueda) hallazgos.push(...r3(producto, busqueda, e.host));

  return {
    estado: 'ok',
    producto: {
      nombre: producto.productName,
      marca: producto.brand || null,
      url: e.url,
      tienda: e.host,
      variantes: (producto.items || []).length,
    },
    hallazgos,
    chequeos: {
      R2: true,
      R3: r3Revisado ? 'revisado' : consulta ? 'no-se-pudo' : 'sin-color-ni-tamano-en-el-nombre',
      R4: true,
    },
    pedidos,
  };
}
