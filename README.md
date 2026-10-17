# Revisor de fichas VTEX

Se pega el enlace de una ficha de producto de una tienda VTEX y dice qué problemas de carga del
catálogo tiene —variantes separadas, variantes que no se distinguen, variantes que comparten foto— y
cómo se arregla cada uno. Spec: `specs/001-revisor-vtex.md`.

Necesita Node 18 o más nuevo. No hay nada que instalar.

## Pruebas

```
node --test
```

Corren sobre las respuestas guardadas en `fixtures/`: no hacen pedidos a ninguna tienda.

## Probarlo en la compu, sin publicar

```
node scripts/servidor-local.mjs --fixtures   # responde con los fixtures, sin salir a la red
node scripts/servidor-local.mjs              # lee las tiendas de verdad
```

- `http://localhost:8888/` — la página. Con `--fixtures` funcionan los cuatro enlaces de
  `test/casos.mjs`.
- `http://localhost:8888/demo/` — un resultado de cada tipo (R2, R3, R4, sin hallazgos, no VTEX).

## Publicar

Lo hace una persona, después de Gate 2: Netlify publica `public/` y la función de
`netlify/functions/`, según `netlify.toml`. No hay variables de entorno.
