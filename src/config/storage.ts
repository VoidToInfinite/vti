/**
 * Registro declarativo de TODO lo que este sitio escribe en el equipo del
 * visitante.
 *
 * Fuente de verdad única para dos consumidores que, si cada uno mantuviera su
 * propia lista, divergirían a la primera incorporación:
 *
 *   1. la tabla de almacenamiento de la política de privacidad,
 *   2. los tests que impiden que se añada almacenamiento sin declararlo.
 *
 * SUSTITUYE a `src/config/cookies.ts` (retirado el 2026-08-08). Aquel fichero
 * modelaba además tres CATEGORÍAS de consentimiento (`necessary`, `analytics`,
 * `marketing`), de las que solo la primera llegó a tener entradas: el sitio no
 * ha tenido nunca una sola cookie HTTP ni un solo script de terceros. El
 * nombre `cookies` describía por tanto algo que no existe, y la maquinaria de
 * consentimiento que sostenía —banner, panel de preferencias y la propia
 * entrada `vti-consent`— pedía permiso para almacenamiento que la ley EXIME de
 * pedirlo.
 *
 * NOTA LEGAL, medida y no supuesta: este registro contiene EXCLUSIVAMENTE
 * almacenamiento exento de consentimiento. El art. 22.2 LSSI-CE exceptúa lo
 * estrictamente necesario para prestar el servicio expresamente solicitado por
 * el usuario, y la Guía de cookies de la AEPD (ed. julio 2023) lista la
 * personalización de interfaz ELEGIDA POR EL PROPIO USUARIO entre esos
 * supuestos: `vti-theme` se escribe cuando la persona pulsa el conmutador de
 * tema, y solo entonces.
 *
 * `vti-reading-position` (crítica externa #19, 2026-09-06) se apoya en la
 * MISMA excepción del art. 22.2 por otra vía, y conviene no confundirlas: no
 * es una preferencia que nadie elija, es el estado técnico de la propia
 * sesión de navegación —dónde iba leyendo— que el sitio necesita para no
 * dejar al visitante en otra sección al recargar. Es de primera parte, no
 * contiene ningún dato personal (una `id` de sección y tres números), no sale
 * del navegador y se borra sola al cerrar la pestaña. La atribución concreta
 * a la Guía de cookies de la AEPD del párrafo anterior es de `vti-theme` y no
 * se extiende a esta entrada: aquí lo que se invoca es el criterio literal de
 * la ley («estrictamente necesario para prestar el servicio expresamente
 * solicitado»), no un supuesto tasado de esa guía.
 *
 * AQUÍ VIVIÓ `vti-lang`, RETIRADA el 2026-09-02 (D3, decisión del dueño). El
 * argumento que la sostenía era el mismo de arriba —«el idioma también lo
 * elige la persona»— pero dejó de ser cierto cuando la ola G mudó el idioma a
 * la URL: desde entonces `I18nProvider` escribía la clave al MONTAR, con el
 * idioma de la ruta, así que una visita a `/` sin una sola interacción ya
 * dejaba `vti-lang: "es"` en el equipo (medido por el evaluador Nielsen de la
 * crítica #15: contexto nuevo, `goto('/')`, `localStorage` de `[]` a
 * `[["vti-lang","es"]]` en 3 s). Eso no es «una elección hecha por ti», que es
 * literalmente lo que la política de privacidad promete de esta lista, y
 * además nadie la leía: el censo sobre `src/` y `app/` no encontró un solo
 * `getItem`. Con el idioma en la URL la clave era redundante, así que se
 * retira entera —escritura, entrada de este registro y fila de la tabla legal—
 * en vez de documentarse como excepción.
 *
 * REGLA DURA para quien añada algo aquí: este fichero solo admite
 * almacenamiento técnico exento. El día que entre una tecnología NO exenta
 * (analítica con cookies, píxeles, publicidad), declararla aquí no basta —
 * hace falta volver a introducir un mecanismo de consentimiento previo, y esa
 * decisión no puede tomarse añadiendo una línea a un array.
 */

/**
 * La clave literal de `localStorage`, declarada UNA sola vez.
 *
 * Hubo un tiempo en que `ThemeProvider.tsx`, `I18nProvider.tsx` y
 * `LanguageSelector.tsx` mantenían cada uno su propio `const STORAGE_KEY =
 * "vti-theme"` / `"vti-lang"` — tres copias del mismo literal que solo
 * coincidían por disciplina, no por construcción. Un rename en cualquiera de
 * los tres habría dejado la tabla legal de `/privacidad` mintiendo sobre lo
 * que el sitio realmente escribe (art. 22.2 LSSI-CE exige que esa tabla sea
 * exacta). El consumidor que queda importa `STORAGE_KEYS` de aquí; el candado
 * en `storage.test.ts` falla si alguien vuelve a declarar el literal fuera de
 * este fichero.
 *
 * Que hoy quede UNA sola clave no convierte este objeto en un envoltorio
 * innecesario: sigue siendo el único punto donde el literal existe, y es lo
 * que ata el registro de abajo, los tres consumidores del tema y la tabla de
 * `/privacidad` al mismo string.
 */
export const STORAGE_KEYS = {
  theme: "vti-theme",
  /**
   * Posición de lectura de la portada, en `sessionStorage` (crítica externa
   * #19, P1 #2 — ver el docblock de `src/hooks/useReloadLanding.ts` para el
   * defecto medido y la causa raíz).
   *
   * Qué guarda: la sección de primer nivel que estaba bajo el centro del
   * viewport, el desplazamiento dentro de ella, el `scrollY` y el `pathname`.
   * Números y un `id` de sección: NADA que identifique a nadie, y nada que
   * viaje a ningún sitio — no sale del navegador.
   *
   * Por qué existe: bajo `output: "export"` el HTML horneado es siempre la
   * rama clara, así que el navegador restituye la posición de una recarga
   * contra una página 4.485 px más corta que la oscura y deja al lector una
   * sección atrás. Esta entrada es lo que permite devolverlo a la suya.
   *
   * Por qué `sessionStorage` y no `localStorage`: una posición de lectura
   * solo tiene sentido dentro de la pestaña que la produjo. MUERE AL CERRAR
   * LA PESTAÑA, sin que nadie tenga que borrarla, y no viaja a otras pestañas
   * ni sobrevive al cierre del navegador.
   *
   * Y ANTES DE ESO SE CONSUME (2026-09-06): desde la verificación de la ola S,
   * la entrada se retira en cuanto la portada decide qué hacer con ella, se
   * restituya o se descarte, y solo vuelve a escribirse en la siguiente salida
   * (`pagehide`/`visibilitychange`). El motivo primero fue un defecto de
   * scroll --sin retirarla, volver a la portada por un enlace tras una recarga
   * repetía la restitución-- pero el efecto sobre esta ficha es el que importa
   * aquí: el dato no sigue vivo cuando ya no hace falta, que es lo que la
   * tabla de `/privacidad` promete de una entrada declarada como estado
   * técnico de la sesión.
   */
  readingPosition: "vti-reading-position",
} as const;

export interface StorageEntry {
  /** Identificador literal escrito en el equipo. Es también la clave i18n. */
  readonly id: string;
  /**
   * `"sessionStorage"` desde la crítica externa #19: la primera entrada de
   * este registro que NO sobrevive al cierre de la pestaña. Se declara como
   * tipo propio y no se disfraza de `localStorage` porque la tabla de
   * `/privacidad` lo pinta literalmente y esa tabla tiene que ser exacta
   * (art. 22.2 LSSI-CE).
   */
  readonly kind: "localStorage" | "sessionStorage" | "cookie";
  /**
   * Duración en días, o `null` si no caduca por sí sola. Ni `localStorage` ni
   * `sessionStorage` llevan reloj de expiración: `null` es el valor honesto
   * para esas entradas, no un cero ni un número inventado. Lo que las
   * distingue es QUIÉN las borra —a la de sesión se la lleva la pestaña al
   * cerrarse— y eso lo dice `kind`, no este campo.
   */
  readonly durationDays: number | null;
  /** Titular del almacenamiento. `"first-party"` = el propio sitio. */
  readonly provider: "first-party";
}

/**
 * El nombre legible y la finalidad de cada entrada NO viven aquí: viven en el
 * namespace i18n `legal`, bajo `Legal.common.storage.<id>.name` y
 * `Legal.common.storage.<id>.purpose`, porque son copia de interfaz y tienen
 * que existir en los dos idiomas como todo lo demás.
 */
export const STORAGE_REGISTRY: readonly StorageEntry[] = [
  {
    id: STORAGE_KEYS.theme,
    kind: "localStorage",
    durationDays: null,
    provider: "first-party",
  },
  {
    id: STORAGE_KEYS.readingPosition,
    kind: "sessionStorage",
    durationDays: null,
    provider: "first-party",
  },
] as const;
