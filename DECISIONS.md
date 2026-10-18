# Decisiones

Cada decisión con su porqué y lo que se descartó. Si no está acá, se vuelve a discutir.

## Spec 001 · Revisor de ficha VTEX (17/10/2026, agente `spec-ambigua`)

### D1 · Cómo se reconoce una ficha VTEX: el enlace termina en `/p`

- **Decisión:** se acepta solo un enlace cuyo último tramo es `/p` (`https://tienda/<slug>/p`). Todo
  lo demás devuelve "Todavía solo reviso tiendas VTEX." sin hacer ningún pedido (criterio 7).
- **Por qué:** es como VTEX arma las URLs de producto, y se decide sin salir a la red. Los dos enlaces
  de la muestra que no son VTEX (Tiendanube `/productos/...`, WooCommerce `/producto/...`) no terminan
  en `/p`.
- **Si un sitio no VTEX termina en `/p`:** el pedido a la API no devuelve JSON y la respuesta es el
  mismo mensaje. Gasta un pedido, nunca más de uno.
- **Descartado:** pedir la página y buscar marcas de VTEX en el HTML (gasta pedidos y rompe el
  criterio 7); una lista de dominios VTEX conocidos (no escala).
- **Además:** no se leen IPs, `localhost` ni dominios sin punto, para que la función no sirva para
  pedir direcciones internas.

### D2 · Qué es "el valor visible" de una variante (R2 y R4)

- **Decisión:** el valor de cada campo de `variations` del SKU, sin el prefijo de color (`#ffffff_Blanco`
  se ve "Blanco"), unidos con " / " en el orden de los campos. Si un SKU no tiene un campo que otros sí
  tienen, ese hueco cuenta como "sin <campo>". Si el producto no tiene ningún campo de variación, el
  valor visible es el nombre del SKU.
- **Por qué:** es lo que muestra el selector de VTEX. El caso Colorshop solo se detecta así.
- 🔍 **Suposición:** que sin variaciones el selector muestra el nombre del SKU (caso Pardo). No lo vi en
  pantalla; la muestra 1 lo deja abierto ("Ver en pantalla la pochoclera de Pardo"). La prueba del
  criterio 2 no depende de eso, pero el texto del hallazgo sí.
- La comparación ignora mayúsculas, tildes y espacios repetidos.

### D3 · R4: un hallazgo por clase de problema, no uno por grupo

- **Decisión:** como máximo dos hallazgos R4 por ficha: "Variantes que no se distinguen" (mismo valor
  visible completo) y "Variantes sin valor en el selector" (les falta un campo). Cada uno lista sus
  grupos en el dato. "Distinto producto" = distinto nombre de SKU; "distinto precio" = distinto
  `Price`. Mismo nombre y mismo precio no se marca.
- **Por qué:** en Colorshop hay cuatro grupos iguales (Blanco y Negro, en 240 y 440 cm3) y seis
  colores sin "Colores" cargado. Seis tarjetas que dicen lo mismo esconden el arreglo; dos tarjetas
  con su lista se leen en el teléfono.
- **Consecuencia que hay que mirar en Gate 2:** Colorshop da **dos** hallazgos R4, no uno. El segundo
  (Hueso, Mango shot, Rosa, Fucsia, Verde aqua, Celeste sin color cargado) es un problema real del
  catálogo, pero no estaba en lo esperado. El criterio 3 pide "un hallazgo R4 con al menos tres
  variantes" y se cumple; si Dafne quiere solo el primero, se borra el bloque `incompletos` de `r4`.
- **Descartado:** un hallazgo por grupo (repetitivo); filtrar por stock (una variante sin stock igual
  se ve en el selector y confunde).

### D4 · R2: misma primera imagen = mismo `imageId`

- Se compara `images[0].imageId` entre SKU con distinto valor visible. No se miran los píxeles: dos
  archivos distintos con la misma foto no se detectan (queda en "Lo que no reviso").

### D5 · R3: lista de colores y tamaños, y cómo se evitan hermanos falsos

- **Lista** (`lib/vocabulario.mjs`): colores comunes en español (con género y plural) y en inglés,
  más los de los fixtures (`green`, `blueberry`, y los de Colorshop: beige, bermellón, celeste,
  fucsia, hueso...). Modificadores (claro, oscuro, marino, inglés, traful, africano, espacial, aqua)
  solo cuentan pegados a un color. Tamaños: número + unidad (`240 cm3`, `500ml`, `4 kg`), talles
  XS/XL/XXL y "talle M" / "talle 38". S, M y L solas no cuentan.
- **Afuera a propósito**, porque también son productos o sabores: natural, salmón, mostaza,
  chocolate, arena, oliva, mate, oro, plata, vino, mango, champagne. También los nombres de fantasía
  (Cinnamon Spice, Mauve Mirage).
- **Regla de hermanas:** cada nombre se convierte en un esqueleto: sus palabras con los colores y
  tamaños reemplazados por huecos. Es hermana si el esqueleto es **idéntico** (mismas palabras, mismo
  orden, mismos huecos), algún hueco tiene otro valor, es otro producto y, si las dos tienen marca, es
  la misma marca.
- **El pack:** "Localizador Tag Motorola XT2445 Nano Pack 4 Green/Black" tiene "nano pack 4" de más,
  así que su esqueleto no coincide con el de "...XT2445 green" y no se marca. No hizo falta una lista
  de palabras prohibidas (pack, kit, combo): cualquier palabra de más descarta. No se llegó a la
  condición de parada: con los fixtures, R3 no da ningún falso y sigue encontrando el Blueberry.
- **Búsqueda:** las primeras 5 palabras del esqueleto, sin los huecos (`ft=Localizador tag Motorola
  XT2445`), 20 resultados. Si el nombre no tiene color ni tamaño, o quedan menos de 2 palabras, no se
  busca: R3 no aplica y no gasta pedido.
- **Lo que se pierde:** hermanas con nombres de fantasía, con otro orden de palabras o fuera de los
  primeros 20 resultados. Está dicho en "Lo que no reviso".

### D6 · Pedidos: dos por revisión, con tope de cinco en el código

- Uno al producto y, si hace falta, uno a la búsqueda. El tope de 5 lo impone `revisarFicha`, no la
  costumbre: el sexto pedido tira error. Cada pedido espera como máximo 6 s.

### D7 · Fixtures y pruebas

- Las respuestas reales se guardaron tal cual en `fixtures/`, con `fixtures/indice.json` que dice qué
  URL responde cada archivo. El `fetch` simulado de las pruebas responde solo con eso y falla ante
  cualquier URL que no esté: una prueba nunca sale a la red.
- La búsqueda de Cetrogar se capturó con la consulta que arma el código (`Localizador tag Motorola
  XT2445`), no con `localizador tag motorola`, para que el fixture sea exactamente lo que el revisor
  pide. También se guardó la búsqueda de la pochoclera de Pardo (no trae hermanas).
- R2 se prueba con dos fixtures sintéticos en `fixtures/sinteticos/` (criterio 6): ninguno de los
  cuatro casos reales tiene variantes con la misma foto.

### D8 · Tecnología

- HTML, CSS y JavaScript sin framework; una función de Netlify v2 (`export default async (req)`), sin
  dependencias. La lógica está en `lib/revisor.mjs` y el armado del HTML en `public/render.js`, los
  dos probados con `node --test`.
- La demo con un resultado de cada tipo (`demo/`) y el servidor local (`scripts/servidor-local.mjs`)
  no se publican: `netlify.toml` publica solo `public/`. Mostrar en público hallazgos de tiendas
  reales es una decisión de Dafne, no del agente.

### D9 · Textos

- Voseo, frases cortas. Cada "cómo se arregla" nombra dónde en el administrador de VTEX (Catálogo ›
  Productos y SKUs) y qué cargar; cada "por qué" nombra la compra equivocada. La prueba del criterio
  9 rechaza "revisá" y "consultá con".
- Sin hallazgos, la página dice "No encontré problemas en estos 3 chequeos." y nunca que la ficha
  está en orden.
- 🔍 El nombre del menú "Catálogo › Productos y SKUs" sale de memoria, no se verificó en un
  administrador VTEX real. Lo confirma Dafne.

## Gate 2 · ajustes (18/10/2026, sesión supervisora con Dafne)

### D10 · R4 no marca fichas sin atributos de variante

La pochoclera de Pardo tiene dos SKU con el mismo nombre, a $37.800 y $71.699, y ningún atributo de
variante cargado. Dafne la miró en pantalla: no hay selector y se ve una sola variante, con
$37.800 aun entrando por el enlace de la otra (`?skuId=128574`, código FJ_10523). Sin selector, el
comprador no puede confundir una variante con otra, así que R4 no tiene nada que marcar. Reemplaza
lo que D2 suponía ("sin variaciones, el selector muestra el nombre del SKU"), que resultó falso.
El criterio 2 de la spec cambió en consecuencia.

Confirmado por Dafne el mismo día: entrando por `?skuId=128574` y agregando al carrito, la tienda
dice "Este producto no está disponible actualmente", y esa variante no aparece en el buscador.
La API la da con stock, pero en la tienda no se puede comprar: el dato de stock de la API no
alcanza para saber qué se vende de verdad.

Se probó y se descartó pedir el canal de venta 1 (`sc=1`): para Pardo devolvió lo mismo que sin
canal, y en tiendas que usan otro canal principal podría no encontrar el producto.

### D11 · Solo cuentan las variantes que se pueden comprar (R2, R3, R4)

Una variante sin stock o sin precio no lleva a una compra equivocada, aunque la tienda la muestre
tachada. La oferta que se usa es la de un vendedor que tenga stock y precio, prefiriendo el
principal; R2 y R4 descartan las variantes no comprables y R3 descarta las fichas hermanas sin
ninguna variante comprable.

### D12 · "Lo que no reviso" suma el selector sin nombres

Pigmento muestra en el selector solo una foto chica por color, sin nombre ni texto al pasar el
mouse; el tono se lee solo en el título. Es del diseño de la tienda, no del catálogo, así que esta
versión no lo detecta. Lo dice en "Lo que no reviso" y queda primero para la próxima versión.

Cerrado en Gate 2 por Dafne (18/10/2026): los textos cumplen la rúbrica, el segundo hallazgo de
Colorshop se queda, y la ruta del menú de VTEX está bien.

## Abierto

| Qué | Quién cierra |
|---|---|
| Detectar el selector sin nombres (D12) | Próxima versión |
