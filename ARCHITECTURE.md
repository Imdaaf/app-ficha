# Arquitectura

Una página estática y una función de Netlify. Sin dependencias, sin claves, sin base de datos.

```
navegador                         Netlify                              tienda VTEX
public/index.html  ── GET /api/revisar?url= ──▶  netlify/functions/revisar.mjs
public/app.js                                      └─ lib/revisor.mjs  ── ≤5 GET ──▶ /api/catalog_system/pub/...
public/render.js  ◀── JSON { estado, producto, hallazgos, pedidos }
```

| Archivo | Qué hace |
|---|---|
| `lib/revisor.mjs` | Lee el enlace, pide el producto y la búsqueda, corre R2, R3 y R4. Recibe `fetch` por parámetro. |
| `lib/vocabulario.mjs` | Colores, modificadores, unidades y talles que usa R3. |
| `netlify/functions/revisar.mjs` | La función: recibe `?url=` y devuelve el resultado en JSON. |
| `public/render.js` | Arma el HTML de un resultado. Función pura, la usa la página y la prueban las pruebas. |
| `public/index.html`, `app.js`, `estilos.css` | La página, pensada primero para el teléfono. |
| `fixtures/` | Respuestas reales guardadas en el paso cero, y `indice.json` (URL → archivo). |
| `test/` | `node --test`: criterios 1 a 11 de la spec 001. |
| `scripts/capturar-fixtures.mjs` | Renueva los fixtures pidiendo a las tiendas. No lo usan las pruebas. |
| `scripts/servidor-local.mjs` | Página + función en `localhost:8888`, y la demo en `/demo/`. No se publica. |

## Por qué así

- **La función existe por CORS:** una página de otro dominio no puede leer la API de la tienda.
- **La lógica no sabe de Netlify:** `revisarFicha(enlace, { fetch })` se prueba con un `fetch`
  simulado que cuenta los pedidos.
- **El resultado es JSON con los textos ya armados:** la página solo los muestra; todo texto que
  viene de la tienda se escapa.

Las decisiones y lo descartado están en `DECISIONS.md`.
