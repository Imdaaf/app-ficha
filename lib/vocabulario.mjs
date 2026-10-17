// Vocabulario de colores y tamaños para R3 (fichas hermanas).
// Criterio de la spec: ante la duda, no marcar. Por eso quedan afuera palabras que también son
// productos o sabores (natural, salmón, mostaza, chocolate, arena, oliva, mate, oro, plata, vino).
// Todo va normalizado: minúsculas y sin tildes.

// Colores base: cuentan solos.
export const COLORES = new Set([
  // español, con género y plural
  'rojo', 'roja', 'rojos', 'rojas',
  'negro', 'negra', 'negros', 'negras',
  'blanco', 'blanca', 'blancos', 'blancas',
  'azul', 'azules',
  'verde', 'verdes',
  'amarillo', 'amarilla',
  'naranja',
  'violeta', 'lila', 'purpura',
  'rosa', 'rosado', 'rosada',
  'fucsia', 'magenta',
  'gris', 'grafito',
  'marron', 'beige', 'camel', 'nude',
  'celeste', 'turquesa', 'aguamarina', 'cian',
  'dorado', 'dorada', 'plateado', 'plateada',
  'bordo', 'borravino',
  'crudo', 'cruda', 'hueso', 'marfil',
  'cobre', 'coral', 'terracota', 'bermellon', 'ocre', 'caqui', 'kaki',
  'multicolor',
  // inglés
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple',
  'grey', 'gray', 'silver', 'gold', 'orange', 'brown', 'navy', 'teal', 'ivory',
  'graphite', 'midnight',
  // de los fixtures (Cetrogar)
  'blueberry',
]);

// Modificadores: solo cuentan pegados a un color base ("verde claro", "azul marino").
export const MODIFICADORES_DE_COLOR = new Set([
  'claro', 'clara', 'oscuro', 'oscura', 'marino', 'ingles', 'traful', 'africano',
  'espacial', 'aqua', 'agua', 'pastel', 'fluo', 'metalizado', 'metalizada',
  'light', 'dark',
]);

// Unidades de tamaño: solo cuentan pegadas a un número ("240 cm3", "500ml", "4 kg").
export const UNIDADES = new Set([
  'ml', 'cc', 'cm3', 'l', 'lt', 'lts', 'litro', 'litros',
  'kg', 'kgs', 'g', 'gr', 'grs', 'gramos',
  'cm', 'mm', 'm', 'mts', 'metros', 'pulgadas',
]);

// Talles en letras que no se confunden con otra cosa. S, M y L solas son ambiguas:
// solo cuentan después de "talle".
export const TALLES_SUELTOS = new Set(['xs', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl']);
