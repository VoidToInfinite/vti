#!/usr/bin/env node
/**
 * Candado de contraste del texto de la home fuera del hero (ola Q, frente
 * defensivo).
 *
 * POR QUE EXISTE. Ronda tras ronda, los evaluadores tecnicos declaran haber
 * medido el contraste de texto sobre arte SOLO en el hero, y lo dicen con
 * estas palabras: "no repeti la medicion pixel a pixel en Story / Journey /
 * Features / Contact por limite de tiempo", "es muestra, no censo". Es decir:
 * cuatro secciones por dos temas, en un sitio cuyo rasgo distintivo es
 * precisamente el texto sobre escenas ilustradas, no se habian medido nunca.
 * Este fichero cierra ese hueco por los dos lados: la tabla del final del
 * docblock es el censo EN NAVEGADOR, con su fecha y su metodo, y el codigo es
 * el candado deterministico que impide que una tinta se degrade sin que el
 * gate se entere.
 *
 * ## QUE SE MIDIO, Y COMO (2026-09-04)
 *
 * Chrome real (`chromium.launch({ channel: "chrome" })`) sobre el build de
 * produccion de `0226846` servido en local, tema fijado por `localStorage`
 * ANTES de cargar, `deviceScaleFactor: 1`, a 390x844 y 1440x900, en 40-49
 * posiciones de scroll por combinacion de tema y ancho. Las posiciones no son
 * una rejilla uniforme: se barre la pagina en pasos de 110 px anotando que
 * piezas de texto aparecen en cada una, y se eligen por cobertura codiciosa
 * las que anaden texto nuevo -- sin eso, en los decks oscuros solo se llega a
 * medir la diapositiva que este a opacidad plena, y el censo pierde la mitad
 * de la copia (medido: 61 firmas con rejilla uniforme, 92 con cobertura).
 *
 * El metodo es el que este repo ya pago dos lecciones por aprender
 * (`task/lessons.md`, 2026-09-02 bis):
 *
 * - La TINTA se resuelve pintando el color computado en un canvas de 1x1 y
 *   leyendo el pixel. `getComputedStyle` devuelve `oklch()` sin convertir, y
 *   sacarle numeros con una expresion regular da la terna OKLCH, no sRGB.
 * - El FONDO se captura con la tinta APAGADA (`color` y
 *   `-webkit-text-fill-color` transparentes), no con el elemento oculto: un
 *   `visibility: hidden` se llevaria por delante el fondo del propio boton o
 *   de la propia tarjeta. Los tramos con `background-clip: text` se
 *   neutralizan aparte (`background: none`), porque si no el degradado del
 *   logotipo se cuenta a si mismo como fondo.
 * - Se compara la tinta nominal contra la DISTRIBUCION del fondo bajo la caja
 *   de cada linea de texto (`Range.getClientRects`, no la caja del elemento),
 *   con erosion de 2 px para separar el borde antialiaseado del interior, y se
 *   reporta p05 / mediana / porcentaje bajo umbral. Nunca el peor pixel: sobre
 *   un campo de estrellas el peor pixel siempre existe y no describe nada.
 * - Solo cuenta el texto que DE VERDAD se pinta: si apagar la tinta no cambia
 *   ni un pixel de su caja, la pieza esta recortada (`VisuallyHidden`) o
 *   tapada, y se descarta. Esa prueba fisica sustituye a cualquier heuristica
 *   de z-order -- la primera version usaba `elementFromPoint` y descartaba por
 *   error toda la copia de los decks a 1440.
 * - El texto que pasa por debajo de la barra fija al desplazarse tambien se
 *   descarta: es un estado transitorio del scroll, no una pantalla que nadie
 *   lea. Sin ese filtro el instrumento "medía" etiquetas del formulario contra
 *   el logotipo del cabecero.
 *
 * Umbral por tamano computado, no a ojo: 3:1 para texto grande (>= 24 px, o
 * >= 18,66 px con peso >= 700) y 4,5:1 para el resto.
 *
 * ## RESULTADO DEL CENSO: 1.872 mediciones, 349 firmas, CERO incumplimientos
 *
 * Las 45 piezas del inventario de abajo son el censo completo agrupado por
 * seccion, tema y tinta, con el peor p05 de todas las posiciones y anchos. La
 * conclusion es que el sistema aguanta: las 45 pasan su umbral, y las tintas
 * que las pintan son TODAS tokens del repo -- ni un solo color suelto en el
 * texto de las cuatro secciones.
 *
 * NO SIEMPRE FUE 45 DE 45, y el historial importa porque explica por que
 * `SANCIONADAS` existe y por que hoy esta vacia. El censo del 2026-09-04
 * encontro UN incumplimiento: `journey/light/primary/700`, la etiqueta
 * «Descubre» del primer paso (`ScStepLabel`, `Journey.tsx`), con p05 4,47 y
 * mediana 4,53 contra un umbral de 4,5 (el 15,9 % de la caja por debajo a
 * 1440, el 17,5 % a 390). Se ANOTO como sancionada en vez de arreglarse,
 * porque el arreglo movia colores visibles y era una decision del dueno.
 * Consecuencia: durante dos rondas este gate salio en VERDE con un
 * incumplimiento de WCAG 1.4.3 vivo y medido dentro. La critica externa #19
 * (2026-09-06) lo volvio a levantar como P1 con sonda propia -- p05 4,405 y
 * el 33,9 % del fondo bajo 4,5 a 1440; p05 4,399 y el 37,8 % a 390 -- y el
 * dueno decidio arreglarlo: `LABEL_SAFE_STEP` pasa a ser una tabla por rampa
 * y «Descubre» sube a primary/800 (5,189 nominal contra la parada oscura del
 * degradado de la tarjeta, frente a los 4,510 de primary/700), con «Aprende»
 * a primary/900 para no colisionar. Las dos filas de este inventario quedan
 * actualizadas con su tinta nueva y RECENSADAS en Chrome el mismo dia sobre
 * el build integrado: p05 5,04 y 7,14 a 1440 (5,03 y 7,15 a 390), 0 % del
 * fondo bajo 4,5 en las cuatro medidas (ver la nota del campo `censo`).
 *
 * La leccion, escrita donde se vuelva a leer: una excepcion documentada NO
 * es un candado. `SANCIONADAS` cuantifica y hace visible lo que incumple,
 * que es mejor que esconderlo, pero mientras una entrada este ahi el gate
 * miente por omision. Por eso ahora esta vacia y su test lo exige.
 *
 * La segunda pieza mas justa es el CTA de la tarjeta de Gaming en oscuro
 * (`FEATURES_GAMING_ACCENT_DARK`, «Únete a la partida» y su flecha): p05 4,65
 * a 1440, con el 1,5 % de la caja por debajo. Pasa, pero conviene saber que su
 * docblock en `features.layers.ts` declara 5,04:1 y esa cifra es contra
 * `semantic.bg`, no contra el sitio donde el CTA se pinta de verdad --- la
 * superficie de la tarjeta con el arte de la escena detras, que es mas clara.
 * La cifra del docblock es reproducible; simplemente no es la del render.
 *
 * De paso, el censo refuto una cifra que el repo daba por medida: el docblock
 * de `stepLabelColor` (`Journey.tsx`) declaraba "4.57 · 5.27 · 5.33 · 6.01 ·
 * 8.34 · 5.33" para las seis etiquetas, y esas son las cifras contra la parada
 * CLARA del degradado de la tarjeta (`#e5f6ff`), no contra la oscura
 * (`#ffecfd`), que es la que manda. Reproducido con el propio `contrastRatio`
 * del repo, contra `#ffecfd` salian 4,510 · 5,189 · 5,263 · 5,890 · 8,194 ·
 * 5,228. Ese docblock quedo corregido en la ola Q y reescrito en la ola S,
 * donde las seis pasan a 5,189 · 7,331 · 5,263 · 5,890 · 8,194 · 5,228 --
 * las cuatro de `secondary`/`error` sin tocar, y las dos de `primary`
 * subidas un escalon mas.
 *
 * ## QUE VIGILA ESTE CANDADO, Y QUE NO
 *
 * VIGILA la TINTA. Cada pieza declara su tinta como una REFERENCIA al token
 * que la pinta (`palette.<rampa>[<paso>]`, o una constante con nombre de la
 * seccion), y el script resuelve esa referencia leyendo las fuentes reales del
 * repo -- `src/theme/tokens/color.ts` para las rampas y
 * `src/components/sections/Features/features.layers.ts` para los acentos de
 * Gaming, que no salen de ninguna rampa. Si alguien aclara un peldano, cambia
 * un croma o mueve una pieza de escalon, el ratio se mueve aqui y el gate lo
 * ve. Ese es el defecto que atrapa, y es exactamente el que el repo ya ha
 * pagado tres veces (`languageAccent`, `navActiveAccent`, `stepLabelColor`:
 * un acento tomado directo de `palette`, sin pasar por un rol auditado).
 *
 * NO VIGILA la SUPERFICIE, y hay que decirlo con todas las letras. El fondo de
 * cada pieza es una LUMINANCIA MEDIDA en navegador (`superficieL`), no un
 * token: es el fondo del 5 % peor bajo esa pieza, derivado del p05 de la
 * medicion. No se puede calcular desde el repo -- son once capas de WebP con
 * paralaje encima de un degradado -- y usar el `*_VOID` de la escena en su
 * lugar seria mentir en el lado facil: el void es lo MAS OSCURO de la escena,
 * o sea el mejor caso para una tinta clara, no el peor. `features.layers.ts`
 * ya documenta ese mismo error ("el void HEXADECIMAL de la escena, que es el
 * suelo que `contrast.ts` puede calcular, no el pixel que el visitante ve").
 * Por eso: si el ARTE cambia, esta tabla queda obsoleta y hay que volver a
 * medir con el metodo de arriba. No se sube ninguna cifra sin repetir el
 * censo.
 *
 * Tampoco cubre el hero (ya medido en rondas anteriores), ni `About`, ni las
 * paginas legales, ni la 404, ni idiomas distintos del castellano: el ingles
 * cambia la longitud de las cajas pero no la tinta ni la superficie.
 *
 * ## LA CABECERA FIJA ENTRA EN EL CENSO (critica externa #20, 2026-09-07)
 *
 * Las cuatro filas `header/*` son las primeras que NO son de una seccion de la
 * home: son los dos enlaces del selector de idioma (`LanguageSelector.tsx`),
 * medidos con la pagina DESPLAZADA, que es cuando el arte de las secciones
 * pasa por debajo de la barra fija. Nadie los habia medido asi -- las rondas
 * anteriores midieron esa pieza sobre el hero y sobre los fondos que el
 * cristal de la barra compone-- y ahi habia un P1: 3,400:1 en oscuro
 * («English», banda y = 9.275-9.750, 37 de 240 mediciones bajo 4,5) y 3,488:1
 * en claro («Español», banda y = 4.900-5.200, 12 de 174), las dos con la
 * pagina en movimiento y SIN `prefers-reduced-motion` (con la preferencia
 * activa el arte no se desplaza y la banda no existe).
 *
 * `superficieL` sale del mismo barrido: es la luminancia del fondo del 5 %
 * peor bajo la caja del enlace en la posicion mas hostil, tomada bajo
 * CUALQUIERA de los dos enlaces y aplicada a los dos -- el arte se desplaza,
 * asi que el parche que hoy pasa bajo uno pasa manana bajo el otro. Las cuatro
 * filas llevan `censo` porque su `p05` es la tinta NUEVA calculada contra ese
 * fondo medido, no una relectura en navegador: el fondo se midio con la tinta
 * apagada (no depende del color del texto) y el cambio de esta entrega no toca
 * el fondo de la barra, asi que el calculo es exacto -- pero la relectura la
 * hace el orquestador al reconstruir, y hasta entonces la marca se queda.
 *
 * El `y` de estas filas es POSICION DE SCROLL, como en el resto de la tabla,
 * no la posicion del enlace en pantalla: el selector vive siempre en la barra.
 *
 * Corre dentro de `pnpm run ci` por dos caminos, a proposito: como paso propio
 * (`pnpm check:text-contrast`) y desde `scripts/check-text-contrast.test.mjs`, que
 * lo importa y asserta dentro de `pnpm test` -- mismo patron que
 * `check-dark-art-weight.mjs` con su test.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Umbral WCAG AA para texto normal. */
export const UMBRAL_NORMAL = 4.5;
/** Umbral WCAG AA para texto grande (>= 24 px, o >= 18,66 px con peso >= 700). */
export const UMBRAL_GRANDE = 3;

/** El umbral que le toca a una pieza por su tamano COMPUTADO, no a ojo. */
export function umbralDe(px, peso) {
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    return grande ? UMBRAL_GRANDE : UMBRAL_NORMAL;
}

/*
 * ---------------------------------------------------------------------------
 * Lectura de las fuentes de verdad del repo.
 *
 * Este fichero es `.mjs` y no puede importar los tokens de TypeScript, asi que
 * los LEE. No los copia: copiarlos seria fabricar una segunda fuente de verdad
 * que se desincroniza en el primer retoque de la escala, que es justo el
 * defecto que este candado existe para atrapar. Cada lector falla ruidosamente
 * si no encuentra lo que busca -- un inventario que no puede resolver su tinta
 * esta desfasado, y lo que hay que hacer entonces es volver a medir, no
 * silenciar el error.
 * ---------------------------------------------------------------------------
 */

function leer(relativo) {
    return readFileSync(path.join(ROOT, relativo), "utf8");
}

function numeros(fuente, etiqueta, patron) {
    const m = fuente.match(patron);
    if (!m) {
        throw new Error(
            `El candado de contraste no encuentra ${etiqueta} donde lo espera. ` +
                `La escala de color se ha movido: vuelve a medir el censo antes de ` +
                `tocar este fichero.`,
        );
    }
    return m[1]
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map(Number);
}

/** Reconstruye las cinco rampas de `src/theme/tokens/color.ts`. */
export function leerPaleta() {
    const fuente = leer("src/theme/tokens/color.ts");
    const pasos = numeros(fuente, "STEPS", /export const STEPS = \[([^\]]+)\]/);
    const L = numeros(fuente, "la escalera L", /const L = \[([^\]]+)\]/);
    const CMUL = numeros(fuente, "CMUL", /const CMUL = \[([^\]]+)\]/);
    const nc = numeros(fuente, "el croma neutro", /const nc = \[([^\]]+)\]/);

    const paleta = {};
    for (const [, nombre, hue, croma] of fuente.matchAll(
        /(\w+): ramp\(([\d.]+), ([\d.]+)\)/g,
    )) {
        const rampa = {};
        pasos.forEach((paso, i) => {
            rampa[paso] =
                `oklch(${L[i]} ${+(Number(croma) * CMUL[i]).toFixed(3)} ${hue})`;
        });
        paleta[nombre] = rampa;
    }
    const neutral = {};
    pasos.forEach((paso, i) => {
        neutral[paso] = `oklch(${L[i]} ${nc[i]} 286)`;
    });
    paleta.neutral = neutral;

    /*
     * Sonda de no-vacuidad: si la reconstruccion se desalinea (una escalera con
     * un valor de mas, un croma pico que cambia de sitio), lo que sale no es un
     * error, es una paleta PLAUSIBLE con los numeros cambiados -- y todos los
     * ratios de abajo saldrian bien igualmente. Estos tres anclajes son los que
     * impiden que este candado pase en verde midiendo colores inventados.
     */
    const anclas = [
        ["neutral", 50, "oklch(0.985 0 286)"],
        ["neutral", 1000, "oklch(0.32 0 286)"],
        ["primary", 700, "oklch(0.53 0.13 235.851)"],
    ];
    for (const [rampa, paso, esperado] of anclas) {
        if (paleta[rampa]?.[paso] !== esperado) {
            throw new Error(
                `El candado de contraste reconstruyo ${rampa}[${paso}] como ` +
                    `${paleta[rampa]?.[paso]} y esperaba ${esperado}. La escala de ` +
                    `color cambio: el censo en navegador de este fichero esta obsoleto ` +
                    `y hay que repetirlo, no ajustar este ancla.`,
            );
        }
    }
    return paleta;
}

/** Lee los acentos de Gaming, que no salen de ninguna rampa. */
export function leerAcentosGaming() {
    const fuente = leer("src/components/sections/Features/features.layers.ts");
    const salida = {};
    for (const [, nombre, valor] of fuente.matchAll(
        /export const (FEATURES_GAMING_ACCENT\w*) = "([^"]+)";/g,
    )) {
        salida[nombre] = valor;
    }
    if (
        !salida.FEATURES_GAMING_ACCENT_DARK ||
        !salida.FEATURES_GAMING_ACCENT_LIGHT
    ) {
        throw new Error(
            `El candado de contraste no encuentra los acentos de Gaming en ` +
                `features.layers.ts. Un cero aqui no es "no hay acentos": es que las ` +
                `constantes cambiaron de nombre y el inventario quedo desfasado.`,
        );
    }
    return salida;
}

/*
 * ---------------------------------------------------------------------------
 * Matematica de contraste. Misma conversion OKLCH -> sRGB lineal y misma
 * formula WCAG que `src/theme/tokens/contrast.ts`, reescrita aqui por el mismo
 * motivo que la lectura de tokens: este fichero es `.mjs` y no puede importar
 * TypeScript. Los dos caminos se comprueban entre si en el test.
 * ---------------------------------------------------------------------------
 */

const acotar01 = (v) => Math.min(1, Math.max(0, v));

function oklchALinealSrgb(texto) {
    const m = texto.match(/^oklch\(([^ ]+) ([^ ]+) ([^ ]+)\)$/);
    if (!m) throw new Error(`Formato oklch invalido: ${texto}`);
    const [L, C, H] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const rad = (H * Math.PI) / 180;
    const a = C * Math.cos(rad);
    const b = C * Math.sin(rad);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3;
    const mm = m_ ** 3;
    const s = s_ ** 3;
    return {
        r: acotar01(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
        g: acotar01(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
        b: acotar01(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s),
    };
}

/** Luminancia relativa WCAG de un color `oklch()`. */
export function luminancia(oklch) {
    const { r, g, b } = oklchALinealSrgb(oklch);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre dos luminancias relativas. */
export function ratio(a, b) {
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/*
 * ---------------------------------------------------------------------------
 * EL INVENTARIO: el censo en navegador del 2026-09-04, una fila por
 * combinacion de seccion, tema y tinta.
 *
 * - `tinta` es una REFERENCIA, no un color: `"<rampa>/<paso>"`, `"blanco"` (el
 *   `oklch(1 0 0)` de `semantic.onBrand` claro) o el nombre de una constante
 *   de seccion. Se resuelve leyendo el repo, y eso es lo que hace que este
 *   candado vea un cambio de token.
 * - `px` y `peso` son los COMPUTADOS de la pieza con el peor p05, y de ellos
 *   sale el umbral.
 * - `superficieL` es la luminancia relativa del fondo del 5 % peor bajo esa
 *   pieza, MEDIDA (ver el docblock). No se toca sin repetir el censo.
 * - `p05` es lo que dio la medicion; el script recalcula el ratio desde
 *   `tinta` y `superficieL`, asi que las dos columnas tienen que coincidir
 *   mientras nadie mueva un token. El test comprueba justo eso.
 * - `censo` es un campo OPCIONAL que el script no lee: marca una fila cuyo
 *   `p05` todavia no sale de una medicion en navegador sino del calculo
 *   nominal contra su `superficieL`. Hoy NINGUNA fila lo lleva. Existio unas
 *   horas durante la ola S (2026-09-06): el frente que cambio la tinta de las
 *   dos filas de Journey (el arreglo del P1 #5) no podia reconstruir el build,
 *   y dejar el `p05` viejo habria sido una cifra falsa. El recenso lo hizo el
 *   orquestador ese mismo dia sobre el build integrado (captura de VIEWPORT
 *   de la caja del rotulo con la tinta apagada, 1.320 y 1.188 pixeles, a 1440
 *   y a 390): «Descubre» primary/800 p05 5,040 a 1440 y 5,034 a 390 (mediana
 *   5,155, 0 % del fondo bajo 4,5); «Aprende» primary/900 p05 7,144 y 7,149
 *   (0 % bajo 4,5). En esas dos filas `superficieL` se deriva del p05 medido
 *   y de la luminancia de la tinta que calcula ESTE script (L = (Ltinta +
 *   0,05) x p05 - 0,05), de modo que `calculado` reproduce el p05 exacto; es
 *   la luminancia del fondo del 5 % peor expresada en la escala de tinta del
 *   script, que es lo que la columna significa para todas las demas filas.
 * ---------------------------------------------------------------------------
 */
// prettier-ignore
export const PIEZAS = [
    { seccion: "contact", tema: "dark", tinta: "neutral/1100", px: 16, peso: 600, superficieL: 0.57085, p05: 10.28, vp: "390", y: 9010, ejemplo: "Escríbeme" },
    { seccion: "contact", tema: "dark", tinta: "neutral/400", px: 14, peso: 400, superficieL: 0.00595, p05: 9.39, vp: "390", y: 8638, ejemplo: "0 de 1200 caracteres" },
    { seccion: "contact", tema: "dark", tinta: "neutral/300", px: 14, peso: 400, superficieL: 0.00866, p05: 11.71, vp: "390", y: 8886, ejemplo: "discord.gg/CuGhqdG3g3" },
    { seccion: "contact", tema: "dark", tinta: "primary/300", px: 32, peso: 700, superficieL: 0.00471, p05: 12.59, vp: "390", y: 8059, ejemplo: "infinito." },
    { seccion: "contact", tema: "dark", tinta: "secondary/300", px: 14, peso: 600, superficieL: 0.00826, p05: 10.66, vp: "1440", y: 9257, ejemplo: "Únete a la comunidad" },
    { seccion: "contact", tema: "dark", tinta: "neutral/50", px: 32, peso: 700, superficieL: 0.00752, p05: 17.49, vp: "390", y: 8059, ejemplo: "Construyamos algo" },
    { seccion: "contact", tema: "light", tinta: "neutral/1000", px: 14, peso: 600, superficieL: 0.85558, p05: 10.9, vp: "390", y: 7677, ejemplo: "Tu correo (opcional)" },
    { seccion: "contact", tema: "light", tinta: "neutral/800", px: 14, peso: 400, superficieL: 0.89225, p05: 5.39, vp: "390", y: 7500, ejemplo: "Navegar por esta web no envía " },
    { seccion: "contact", tema: "light", tinta: "primary/800", px: 32, peso: 700, superficieL: 0.89767, p05: 5.24, vp: "390", y: 6794, ejemplo: "infinito." },
    { seccion: "contact", tema: "light", tinta: "neutral/700", px: 14, peso: 400, superficieL: 0.90527, p05: 4.78, vp: "1440", y: 4869, ejemplo: "Opcional: tu propia aplicación" },
    { seccion: "contact", tema: "light", tinta: "secondary/700", px: 14, peso: 600, superficieL: 0.89688, p05: 5.34, vp: "1440", y: 5368, ejemplo: "Explora el código" },
    { seccion: "contact", tema: "light", tinta: "blanco", px: 16, peso: 600, superficieL: 0.13016, p05: 5.83, vp: "390", y: 7677, ejemplo: "Escríbeme" },
    { seccion: "features", tema: "dark", tinta: "FEATURES_GAMING_ACCENT_DARK", px: 14, peso: 600, superficieL: 0.01381, p05: 4.65, vp: "1440", y: 8247, ejemplo: "→" },
    { seccion: "features", tema: "dark", tinta: "primary/600", px: 14, peso: 600, superficieL: 0.01052, p05: 5.76, vp: "390", y: 7427, ejemplo: "Hablemos de aprender" },
    { seccion: "features", tema: "dark", tinta: "secondary/600", px: 14, peso: 600, superficieL: 0.01008, p05: 4.98, vp: "390", y: 7848, ejemplo: "Cuéntame tu idea" },
    { seccion: "features", tema: "dark", tinta: "primary/400", px: 24, peso: 600, superficieL: 0.01061, p05: 8.76, vp: "390", y: 7848, ejemplo: "Imagina" },
    { seccion: "features", tema: "dark", tinta: "neutral/300", px: 12, peso: 400, superficieL: 0.01177, p05: 11.13, vp: "1440", y: 8247, ejemplo: "Buscar el reto que aún no sabe" },
    { seccion: "features", tema: "dark", tinta: "primary/300", px: 24, peso: 600, superficieL: 0.01008, p05: 11.47, vp: "390", y: 7637, ejemplo: "Aprende" },
    { seccion: "features", tema: "dark", tinta: "neutral/50", px: 32, peso: 700, superficieL: 0.00654, p05: 17.79, vp: "1440", y: 7470, ejemplo: "Tres formas de seguir avanzand" },
    { seccion: "features", tema: "light", tinta: "neutral/1000", px: 32, peso: 700, superficieL: 0.95597, p05: 12.1, vp: "390", y: 4567, ejemplo: "Tres formas de seguir avanzand" },
    { seccion: "features", tema: "light", tinta: "neutral/800", px: 16, peso: 400, superficieL: 0.95597, p05: 5.76, vp: "390", y: 4759, ejemplo: "Aprendizaje, imaginación y jue" },
    { seccion: "features", tema: "light", tinta: "primary/800", px: 11, peso: 600, superficieL: 0.95597, p05: 5.56, vp: "390", y: 4567, ejemplo: "¿Por dónde empiezas?" },
    { seccion: "features", tema: "light", tinta: "primary/700", px: 14, peso: 600, superficieL: 1, p05: 5.07, vp: "390", y: 5453, ejemplo: "Hablemos de aprender" },
    { seccion: "features", tema: "light", tinta: "secondary/700", px: 14, peso: 600, superficieL: 0.97345, p05: 5.77, vp: "390", y: 6572, ejemplo: "Cuéntame tu idea" },
    { seccion: "features", tema: "light", tinta: "FEATURES_GAMING_ACCENT_LIGHT", px: 14, peso: 600, superficieL: 1, p05: 5.34, vp: "390", y: 6572, ejemplo: "Únete a la partida" },
    { seccion: "journey", tema: "dark", tinta: "neutral/300", px: 16, peso: 400, superficieL: 0.0317, p05: 8.41, vp: "390", y: 4565, ejemplo: "Construye conocimiento, desarr" },
    { seccion: "journey", tema: "dark", tinta: "primary/300", px: 42.9, peso: 900, superficieL: 0.00423, p05: 12.71, vp: "390", y: 6617, ejemplo: "”" },
    { seccion: "journey", tema: "dark", tinta: "neutral/50", px: 16, peso: 400, superficieL: 0.01407, p05: 15.7, vp: "390", y: 3637, ejemplo: "Cada descubrimiento crea una p" },
    { seccion: "journey", tema: "light", tinta: "neutral/1000", px: 32, peso: 700, superficieL: 0.88169, p05: 11.21, vp: "390", y: 3796, ejemplo: "Tu viaje no tiene un último pa" },
    { seccion: "journey", tema: "light", tinta: "secondary/900", px: 14, peso: 700, superficieL: 0.87653, p05: 8.09, vp: "1440", y: 2093, ejemplo: "Comparte" },
    { seccion: "journey", tema: "light", tinta: "neutral/800", px: 12, peso: 500, superficieL: 0.86703, p05: 5.25, vp: "390", y: 4567, ejemplo: "Transforma tu pensamiento en a" },
    { seccion: "journey", tema: "light", tinta: "primary/900", px: 14, peso: 700, superficieL: 0.85968, p05: 7.14, vp: "1440", y: 2093, ejemplo: "Aprende" },
    { seccion: "journey", tema: "light", tinta: "secondary/800", px: 14, peso: 700, superficieL: 0.87653, p05: 5.84, vp: "390", y: 3796, ejemplo: "Crea" },
    { seccion: "journey", tema: "light", tinta: "primary/800", px: 14, peso: 700, superficieL: 0.85660, p05: 5.04, vp: "1440", y: 2093, ejemplo: "Descubre" },
    { seccion: "journey", tema: "light", tinta: "error/700", px: 14, peso: 700, superficieL: 0.87353, p05: 5.18, vp: "1440", y: 2866, ejemplo: "Evoluciona" },
    { seccion: "journey", tema: "light", tinta: "secondary/700", px: 14, peso: 700, superficieL: 0.77015, p05: 4.62, vp: "390", y: 4374, ejemplo: "Imagina" },
    { seccion: "story", tema: "dark", tinta: "neutral/300", px: 14, peso: 600, superficieL: 0.00406, p05: 12.71, vp: "390", y: 3637, ejemplo: "Únete a la comunidad en Discor" },
    { seccion: "story", tema: "dark", tinta: "primary/300", px: 32, peso: 700, superficieL: 0.00216, p05: 13.21, vp: "390", y: 629, ejemplo: "a la creación." },
    { seccion: "story", tema: "dark", tinta: "neutral/50", px: 12, peso: 500, superficieL: 0.13568, p05: 5.42, vp: "1440", y: 3076, ejemplo: "6" },
    { seccion: "story", tema: "light", tinta: "neutral/1000", px: 16, peso: 400, superficieL: 0.87962, p05: 11.19, vp: "390", y: 1721, ejemplo: "VoidToInfinite es un proyecto " },
    { seccion: "story", tema: "light", tinta: "secondary/900", px: 12, peso: 700, superficieL: 0.7973, p05: 7.4, vp: "390", y: 2088, ejemplo: "04" },
    { seccion: "story", tema: "light", tinta: "neutral/800", px: 14, peso: 600, superficieL: 0.87962, p05: 5.32, vp: "1440", y: 2424, ejemplo: "Únete a la comunidad en Discor" },
    { seccion: "story", tema: "light", tinta: "primary/800", px: 12, peso: 700, superficieL: 0.8337, p05: 4.88, vp: "390", y: 1354, ejemplo: "01" },
    { seccion: "story", tema: "light", tinta: "secondary/800", px: 12, peso: 700, superficieL: 0.82331, p05: 5.51, vp: "390", y: 2088, ejemplo: "03" },
    { seccion: "story", tema: "light", tinta: "secondary/700", px: 12, peso: 700, superficieL: 0.8343, p05: 4.99, vp: "390", y: 1721, ejemplo: "02" },
    { seccion: "header", tema: "dark", tinta: "neutral/200", px: 14, peso: 400, superficieL: 0.10446, p05: 5.36, vp: "1440", y: 9450, ejemplo: "English", censo: "tinta nueva sobre fondo medido" },
    { seccion: "header", tema: "dark", tinta: "primary/200", px: 14, peso: 700, superficieL: 0.10446, p05: 5.37, vp: "1440", y: 9425, ejemplo: "Español", censo: "tinta nueva sobre fondo medido" },
    { seccion: "header", tema: "light", tinta: "neutral/900", px: 14, peso: 400, superficieL: 0.58110, p05: 5.09, vp: "1440", y: 4925, ejemplo: "English", censo: "tinta nueva sobre fondo medido" },
    { seccion: "header", tema: "light", tinta: "primary/900", px: 14, peso: 700, superficieL: 0.58110, p05: 4.96, vp: "1440", y: 4925, ejemplo: "Español", censo: "tinta nueva sobre fondo medido" },
];

/**
 * VACIA, y esa es la entrega de la ola S (2026-09-06).
 *
 * QUE ES ESTO. El mecanismo sigue montado --`comprobarContrasteDeTexto` filtra
 * por esta tabla y el CLI imprime cuantas hay-- y es el mismo patron que la
 * allowlist documentada de `scripts/detect-anti-patterns.mjs`: una excepcion
 * con nombre y explicacion, nunca un umbral rebajado en silencio.
 *
 * POR QUE ESTA VACIA. Tuvo exactamente una entrada, `journey/light/primary/700`
 * («Descubre»), desde el censo del 2026-09-04 hasta hoy. Durante esas dos
 * rondas, `pnpm check:text-contrast` salio con codigo 0 mientras el propio
 * fichero documentaba un incumplimiento de WCAG 1.4.3 medido en navegador. Un
 * gate que sale verde con un incumplimiento dentro no es un gate: es un acta.
 * La critica externa #19 lo confirmo con sonda propia y el dueno decidio
 * arreglarlo (ver el docblock de cabecera y el de `stepLabelColor`,
 * `Journey.tsx`).
 *
 * COMO SE VUELVE A LLENAR. Solo con una decision del dueno FECHADA y escrita
 * aqui: quien la tomo, cuando, que se midio y que hay que hacer para
 * retirarla. No vale «lo arreglamos en la proxima ola», no vale una entrada
 * puesta por un agente para desbloquear su gate, y no vale ampliarla sin
 * cambiar el test que exige que este vacia -- ese test es lo que obliga a que
 * anadir una sancion sea un acto deliberado y visible en el diff, no un
 * atajo. Mientras tanto, un incumplimiento nuevo se arregla o para el gate.
 */
export const SANCIONADAS = {};

/** Resuelve la referencia de tinta de una pieza a su literal `oklch()`. */
export function resolverTinta(pieza, paleta, gaming) {
    if (pieza.tinta === "blanco") return "oklch(1 0 0)";
    if (pieza.tinta.includes("/")) {
        const [rampa, paso] = pieza.tinta.split("/");
        const valor = paleta[rampa]?.[Number(paso)];
        if (!valor) {
            throw new Error(
                `El inventario pide ${pieza.tinta}, que la paleta del repo ya no ` +
                    `declara. Vuelve a medir el censo: la pieza «${pieza.ejemplo}» se ` +
                    `pinta hoy con otra cosa.`,
            );
        }
        return valor;
    }
    const valor = gaming[pieza.tinta];
    if (!valor) {
        throw new Error(
            `El inventario pide la constante ${pieza.tinta}, que ya no existe en ` +
                `features.layers.ts. Vuelve a medir el censo.`,
        );
    }
    return valor;
}

/** Veredicto completo: una fila por pieza, con su ratio y su holgura. */
export function comprobarContrasteDeTexto() {
    const paleta = leerPaleta();
    const gaming = leerAcentosGaming();
    if (PIEZAS.length === 0) {
        throw new Error(
            "El inventario de contraste esta vacio. Un cero aqui no es «todo " +
                "cumple»: es que el censo desaparecio.",
        );
    }
    const filas = PIEZAS.map((pieza) => {
        const tinta = resolverTinta(pieza, paleta, gaming);
        const umbral = umbralDe(pieza.px, pieza.peso);
        const calculado = ratio(luminancia(tinta), pieza.superficieL);
        const clave = `${pieza.seccion}/${pieza.tema}/${pieza.tinta}`;
        return {
            clave,
            ejemplo: pieza.ejemplo,
            tinta,
            umbral,
            calculado,
            medido: pieza.p05,
            holgura: calculado - umbral,
            sancionada: Object.hasOwn(SANCIONADAS, clave),
            vp: pieza.vp,
            y: pieza.y,
        };
    });
    const incumplen = filas.filter(
        (f) => f.calculado < f.umbral && !f.sancionada,
    );
    const sancionadasVivas = filas.filter((f) => f.sancionada);
    return { filas, incumplen, sancionadasVivas };
}

/*
 * CLI. Se ejecuta solo cuando este fichero ES el punto de entrada; importado
 * desde el test no imprime ni llama a process.exit.
 */
if (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    const { filas, incumplen, sancionadasVivas } = comprobarContrasteDeTexto();
    const orden = [...filas].sort((a, b) => a.holgura - b.holgura);
    for (const f of orden) {
        const marca = f.sancionada
            ? "SANCIONADA"
            : f.calculado < f.umbral
              ? "FALLA"
              : "ok";
        console.log(
            `${marca.padEnd(11)} ${f.clave.padEnd(46)} u=${String(f.umbral).padEnd(3)} ` +
                `calculado=${f.calculado.toFixed(2).padStart(6)} medido=${f.medido.toFixed(2).padStart(6)} ` +
                `«${f.ejemplo}»`,
        );
    }
    console.log("—".repeat(76));
    console.log(`piezas del censo          : ${filas.length}`);
    console.log(`sancionadas y documentadas: ${sancionadasVivas.length}`);
    console.log(`incumplimientos nuevos    : ${incumplen.length}`);
    if (incumplen.length > 0) {
        for (const f of incumplen) {
            console.log(
                `  NO CUMPLE ${f.clave} («${f.ejemplo}»): ${f.calculado.toFixed(2)}:1 ` +
                    `contra un umbral de ${f.umbral}:1. No bajes el umbral ni toques ` +
                    `superficieL: vuelve a medir en navegador con el metodo del docblock.`,
            );
        }
    }
    process.exit(incumplen.length === 0 ? 0 : 1);
}
