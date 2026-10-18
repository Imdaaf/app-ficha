---
estado: en curso
depende_de: []
---

# 001 · Revisor de ficha de producto — primera versión, VTEX

Una página web donde se pega el enlace de una ficha de producto de una tienda VTEX y devuelve qué
problemas de carga del catálogo tiene —variantes separadas, variantes que no se distinguen,
variantes que comparten foto— y cómo se arregla cada uno. Sin IA, sin cuentas, publicada en Netlify.

**Tipo:** feature · **Flujo:** design-first: el primer paso es una prueba mínima de que las tres
reglas detectan los casos reales conocidos; si no los detectan, no se construye la página.

Aprobada por Dafne en Gate 1 el 17/10/2026.

## Estado previo

No hay código. El método y la evidencia viven en el espacio de trabajo de Dafne:

- C:\Users\dafne\Dafne-OS\initiatives\revisor-ficha-producto\2026-10-10-discovery-brief.md
- C:\Users\dafne\Dafne-OS\initiatives\revisor-ficha-producto\criterios-v1.md
- C:\Users\dafne\Dafne-OS\initiatives\revisor-ficha-producto\2026-10-10-muestra-1-resultados.md
- C:\Users\dafne\Dafne-OS\initiatives\revisor-ficha-producto.md (sección "El revisor angosto")

Comprobado el 10/10/2026: la API pública de catálogo de VTEX
(`/api/catalog_system/pub/products/search/<slug>/p` y `?ft=<texto>`) responde a pedidos hechos
desde un servidor, sin clave. Una página de otro sitio no puede leerla directamente (CORS), así
que hace falta una función del lado del servidor.

## Qué hace

1. Se pega el enlace de una ficha. Si no es VTEX, la página lo dice y no revisa nada.
2. Una función de Netlify lee el producto y, si hace falta, busca productos hermanos en la misma
   tienda.
3. Corre tres chequeos y muestra cada hallazgo con: qué pasa, por qué lleva a una compra
   equivocada, cómo se arregla, y el dato que lo prueba (variantes, precios, enlaces).
4. Muestra siempre, aunque no encuentre nada, lo que no revisa y por qué.

### Los chequeos

- **R2 · Variantes con la misma foto.** Dos o más variantes con distinto valor visible (color,
  tamaño) cuya primera imagen es la misma.
- **R3 · Variantes separadas en fichas distintas.** Productos de la misma tienda cuyo nombre
  coincide con el de la ficha salvo un color o un tamaño.
- **R4 · Variantes que no se distinguen.** Dos o más variantes de la ficha con el mismo valor
  visible —el que el comprador ve en el selector— y distinto producto o precio.

## Criterios de aceptación

Las pruebas corren con `node --test` sobre respuestas de la API guardadas como archivos
(`fixtures/`), capturadas en el primer paso. No dependen de que la tienda siga igual.

| # | Criterio | Cómo se comprueba |
|---|---|---|
| 1 | **Paso cero:** se guardan las respuestas reales de los cuatro casos de abajo y las tres reglas dan lo esperado sobre ellas | `node --test` sobre los cuatro fixtures; si alguno falla, se para (ver condiciones) |
| 2 | La pochoclera de Pardo **no** da hallazgos: tiene dos SKU «Rojo» a $37.800 y $71.699, pero sin atributos de variante la ficha no muestra selector y el comprador ve una sola. *Cambiado en Gate 2, 18/10/2026: antes esperaba un hallazgo R4.* | Prueba sobre `fixtures/pardo-pochoclera.json`: cero hallazgos R4, y el catálogo sigue con dos variantes |
| 3 | R4 marca el Aerosol Esmalte 3 en 1 de Colorshop: blanco mate, satinado y común bajo "Blanco / 240 cm3" | Prueba sobre `fixtures/colorshop-aerosol.json`: un hallazgo R4 con al menos tres variantes |
| 4 | R3 encuentra que el localizador Motorola "green" de Cetrogar tiene un hermano "Blueberry" | Prueba sobre `fixtures/cetrogar-tag-green.json` y su búsqueda: un hallazgo R3 que enlaza la ficha Blueberry |
| 5 | Control: el delineador Essence de Pigmento (8 colores en una ficha, cada uno con su foto) no da ningún hallazgo | Prueba sobre `fixtures/pigmento-delineador.json`: cero hallazgos |
| 6 | R2 marca variantes que comparten la primera imagen y no marca las que no | Dos fixtures sintéticos, uno de cada lado |
| 7 | Un enlace que no es VTEX devuelve "todavía solo reviso tiendas VTEX" y no hace pedidos | Prueba con un enlace de Tiendanube y uno de WooCommerce de la muestra: cero pedidos a la tienda |
| 8 | Cada revisión hace como máximo 5 pedidos a la tienda | Prueba con `fetch` simulado que cuenta los pedidos en los cuatro casos |
| 9 | Todo hallazgo tiene los cuatro campos llenos: qué pasa, por qué importa, cómo se arregla, dato | Prueba que recorre los hallazgos de los cuatro casos |
| 10 | La página nunca dice que la ficha "está bien" o "no tiene problemas": dice "no encontré problemas en estos 3 chequeos" | `grep -riE "sin problemas\|est[aá] bien\|todo ok"` sobre los archivos de la página: sin resultados |
| 11 | La sección "Lo que no reviso" aparece siempre, con los packs y la foto de cada variante, y por qué | Prueba de la página: la sección existe con resultado vacío y con hallazgos |
| 12 | Se usa en un teléfono: a 375 px de ancho no hay desplazamiento horizontal | En el navegador a 375 px: `document.documentElement.scrollWidth <= 375` en la página con un resultado de cada tipo |
| 13 | No necesita claves, cuentas ni servicios pagos | `grep -riE "api[_-]?key\|secret\|token"` en el código: sin resultados; `netlify.toml` sin variables de entorno |

**Rúbrica del texto de los hallazgos (criterio 9):** cada "cómo se arregla" nombra una acción
concreta en el administrador de la tienda (por ejemplo "unificar las fichas en un producto con
selector de color"), sin "consultá con tu equipo" ni "revisá"; y cada "por qué importa" nombra la
compra equivocada, no la estética. Lo revisa Dafne en Gate 2.

## Decisiones

**Cerradas antes de delegar**

- DECIDIDO por Dafne (Gate 1, 17/10/2026): se revisa **una ficha**, no una tienda entera.
- DECIDIDO por Dafne (Gate 1, 17/10/2026): **sin IA** en esta versión.
- DECIDIDO por Dafne (Gate 1, 17/10/2026): **fecha de corte 31/10/2026**. Si a esa fecha no está
  publicada, sale lo que funcione junto con el análisis de la muestra.
- DECIDIDO por Dafne (Gate 1, 17/10/2026): el revisor se limita a **problemas de carga del
  catálogo**; los del diseño de la tienda quedan afuera.
- DECIDIDO por Dafne (discovery, 10/10/2026): cada hallazgo dice **cómo resolverlo**, no solo qué
  está mal.
- DECIDIDO por Dafne (Gate 2, 18/10/2026): solo cuentan las variantes que se pueden comprar, y R4
  no marca fichas sin atributos de variante, porque no muestran selector. Lo vio en la ficha de
  Pardo: en pantalla hay una sola variante.
- DECIDIDO por Dafne (Gate 2, 18/10/2026): "Lo que no reviso" suma el selector que no muestra el
  nombre de cada opción (caso Pigmento); detectarlo queda para la próxima versión.

**Delegadas, con criterio**

- *Lista de colores y tamaños para R3:* armarla con los valores que aparecen en los cuatro
  fixtures más colores y talles comunes en español e inglés. Criterio: **ante la duda, no
  marcar**. Es preferible perder un hermano a acusar a dos productos distintos.
- *Tecnología:* HTML, CSS y JavaScript sin framework, y una sola función de Netlify en Node.
  Criterio: la menor cantidad de dependencias, como ¿Se lo doy?.
- *Texto de la página:* español rioplatense, tuteo con voseo, frases cortas. Criterio: la rúbrica
  de arriba.

**Condiciones de parada: acá el agente para y pregunta**

- La API de VTEX rechaza los pedidos desde el servidor, o pide clave.
- Alguno de los cuatro casos reales no da lo esperado en el paso cero.
- Algo requiere una clave, una cuenta o un servicio pago.
- R3 marca hermanos falsos en los fixtures y la única forma de evitarlo es bajar a casi cero lo
  que detecta.

## Efectos fuera del sistema

- **Pedidos a tiendas de terceros:** solo lectura de su catálogo público, máximo 5 por revisión,
  sin guardar nada. Durante el desarrollo, las pruebas usan los fixtures y no la tienda.
- **Publicación en Netlify:** la hace Dafne, después de Gate 2. El agente no publica.
- Ninguno más: no hay correos, pagos ni mensajes.

## Fuera de alcance, y qué lo trae

| Qué | Lo trae |
|---|---|
| R1, packs: la foto contra la cantidad del título | Que Dafne abra una cuenta de la API de un modelo |
| Si la foto corresponde a la variante, mirando la imagen | Lo mismo |
| Tiendanube y WooCommerce | Que esta versión esté publicada, o que la primera persona que la use pegue una ficha de esas plataformas |
| Revisar una tienda entera | Que esta versión esté publicada y una revisión tarde menos de 10 segundos |
| Problemas del diseño de la tienda: variante elegida por defecto, compra rápida, carrito | Nada: es trabajo de agencia, no de esta herramienta |
