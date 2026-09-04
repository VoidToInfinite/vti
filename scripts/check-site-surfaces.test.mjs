import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, it, expect } from "vitest";
import {
    BROKEN_SEGMENT,
    CHECKS,
    DEUDA_ZOOM,
    EN_PREFIX,
    HOME_DOC,
    LEGAL_DOCS,
    ROOT_FONT_BASE_PX,
    SURFACES,
    WIDTH_SWEEP,
    ZOOM_FONT_PX,
    especificadoresDePlaywright,
    fallosDeDeudaNoObservada,
} from "./check-site-surfaces.mjs";
/* Alias del repo, no ruta relativa con extension: este fichero es `.mjs` y el
   parser de Rollup no admite un `.ts` explicito en el especificador. */
import { EN_ROUTES, ROUTES, resolveRoute } from "@/config/site";

/*
 * ESTE FICHERO ES LO QUE METE EL CANDADO DE NAVEGADOR DENTRO DEL GATE, y es
 * tambien lo que impide que ese candado se vacie en silencio.
 *
 * `check-site-surfaces.mjs` sabe medir ocho superficies y sabe fallar por su
 * cuenta, pero `pnpm run ci` no lo llama: necesita el sitio SERVIDO, y el gate
 * corre antes de `pnpm build` -- el mismo motivo por el que
 * `scripts/measure-home-js.mjs` tampoco entra. Lo que SI corre en el gate es
 * esto, con el mismo patron que `check-dark-art-weight.test.mjs` con su script.
 *
 * QUE PROTEGE, exactamente. Un candado de navegador al que alguien le borra la
 * mitad de las rutas, o una familia de comprobaciones, SIGUE SALIENDO VERDE: se
 * limita a medir menos. Es la forma de vacuidad que este repo ya pago dos veces
 * y que las dos veces se descubrio tarde. Aqui se ata la COBERTURA:
 *
 *   1. las rutas del script son las rutas REALES del sitio, comparadas contra
 *      `src/config/site.ts` (la fuente unica) y no contra strings gemelos;
 *   2. el camino que provoca la 404 no es ninguna ruta conocida, verificado con
 *      el propio `resolveRoute()` del repo;
 *   3. el barrido de anchos cubre de verdad los dos extremos del encargo y el
 *      escalon `md` donde la cabecera cambia de forma;
 *   4. cada familia declarada en `CHECKS` tiene una comprobacion REAL en el
 *      cuerpo del script, marcada con `[check: <id>]`, y cada marca del cuerpo
 *      esta declarada en `CHECKS`. El vinculo es bidireccional a proposito:
 *      declarar una familia que nadie mide y medir una que nadie declara son
 *      los dos la misma mentira.
 *
 * Validado con bug inyectado a proposito (ver el informe del frente Q-2):
 * borrando el marcador `[check: forced-colors]` del cuerpo del script, el cuarto
 * caso cae en rojo con "la familia declarada forced-colors no tiene ninguna
 * comprobacion marcada en el cuerpo del script"; restaurado, verde.
 *
 * DOS HUECOS DE ESA PRIMERA VERSION, medidos y cerrados por el frente de
 * correccion de la misma ola:
 *
 *   a. El vinculo bidireccional ataba la COHERENCIA, no la EXTENSION. Quitando
 *      A LA VEZ la familia `"forced-colors"` de `CHECKS` (linea 159 del script) y
 *      su marcador del cuerpo (linea 714) -- la supresion SIMETRICA, que es la
 *      que hace quien recorta de verdad -- los cinco casos seguian en verde:
 *      «Test Files  1 passed (1) / Tests  5 passed (5)». El script pasaba a medir
 *      trece familias diciendo catorce y nadie se enteraba. Lo cierra
 *      `FAMILIAS_ESPERADAS`, tecleada abajo.
 *   b. El primer caso derivaba su expectativa de la MISMA lista que verificaba
 *      (`LEGAL_DOCS.length * 2 + 2`), asi que era autorreferencial: quitando la
 *      entrada `legalNotice` de `LEGAL_DOCS` (linea 107 del script) salia «✓
 *      cubre los dos documentos legales en los dos idiomas mas una 404 por
 *      idioma» en verde, y solo caia su hermano, que tecleaba las dos claves. Y
 *      tecleadas, un TERCER documento legal en `src/config/site.ts` no quedaria
 *      obligado a entrar en el barrido. Ahora la lista de documentos se DERIVA
 *      de `ROUTES`, la fuente unica del sitio, con las rutas que no son un
 *      documento legal excluidas por nombre.
 *
 * Los dos cierres, validados repitiendo LA MISMA supresion que antes salia en
 * verde:
 *
 *   a. quitadas la linea 159 (`"forced-colors",`) y la 714 (`// [check:
 *      forced-colors]`) del script --
 *
 *        AssertionError: el candado declara 13 familias y prometio 14: si de
 *        verdad mide otra cosa, actualiza FAMILIAS_ESPERADAS a la vez que el
 *        script; si no, restaura lo que falta: expected [ …(13) ] to deeply
 *        equal [ …(14) ]
 *        - Expected
 *        + Received
 *        -   "forced-colors",
 *
 *   b. quitada la entrada `legalNotice` de `LEGAL_DOCS` (linea 107) --
 *
 *        AssertionError: los documentos que recorre el script no son los que
 *        declara src/config/site.ts: uno de los dos lados se movio solo:
 *        expected [ 'privacy' ] to deeply equal [ 'legalNotice', 'privacy' ]
 *
 *      El caso que antes salia «✓» ahora es el primero en caer. Restauradas las
 *      tres lineas, los nueve casos en verde.
 *
 * LO QUE ANADE LA CRITICA #19 (2026-09-04), y por que hacia falta: el barrido no
 * incluia la PORTADA -- las seis superficies eran las dos legales por dos
 * idiomas mas dos 404 -- y ningun caso de este fichero lo notaba, porque todos
 * derivaban su expectativa de las mismas seis filas que el script declaraba.
 * Ahora son ocho, la extension se compara contra `SUPERFICIES_ESPERADAS`
 * (tecleada) y ademas se exige que TODA clave de `ROUTES` este recorrida en sus
 * dos idiomas. Las dos direcciones, validadas con supresion real:
 *
 *   c. borrada la entrada de la portada inglesa de `SURFACES` (el script) --
 *
 *        AssertionError: el barrido ya no son las ocho superficies acordadas: si
 *        el sitio gano o perdio una de verdad, actualiza SUPERFICIES_ESPERADAS a
 *        la vez que el script; si no, restaura la que falta: expected [ …(7) ]
 *        to deeply equal [ …(8) ]
 *
 *        AssertionError: src/config/site.ts declara la ruta home y el candado no
 *        la recorre en ingles: expected [ '/', '/privacidad', …(5) ] to include
 *        '/en'
 *
 *   d. anadida una sancion `main|home` a `DEUDA_ZOOM` -- que es exactamente la
 *      salida comoda para apagar el rojo de la home en vez de arreglarla --
 *
 *        AssertionError: alguien anadio una sancion de zoom: cada entrada apaga
 *        una zona entera del documento en todas las superficies de su tipo (...):
 *        expected [ 'main|home' ] to deeply equal []
 *
 * Restauradas las dos, los doce casos en verde.
 */

const RUTA_SCRIPT = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "check-site-surfaces.mjs",
);
const SCRIPT = readFileSync(RUTA_SCRIPT, "utf8");

/**
 * Las rutas del sitio que NO son un documento legal, excluidas por nombre. Todo
 * lo demas que `ROUTES` declare es un documento que este candado tiene que
 * recorrer: si manana nace `/cookies`, el test cae hasta que alguien decida
 * explicitamente si entra en el barrido o se anade a esta lista con su motivo.
 * Esa decision forzada es el punto; una lista de claves tecleada no la fuerza.
 *
 * `home` sigue aqui, pero desde la critica externa #19 (2026-09-04) eso ya NO
 * significa "fuera del barrido": la portada entra como superficie propia, con su
 * kind, porque no es un documento legal y no comparte con ellos ni el indice
 * interno ni la forma. Lo que esta lista dice es de que grupo NO forma parte,
 * no si se recorre -- y el caso de abajo exige que se recorra.
 */
const RUTAS_SIN_DOCUMENTO_LEGAL = new Set(["home"]);

/** Los documentos legales que el sitio declara HOY, derivados de la fuente unica. */
const IDS_LEGALES = Object.keys(ROUTES).filter(
    (clave) => !RUTAS_SIN_DOCUMENTO_LEGAL.has(clave),
);

/**
 * LA EXTENSION DEL BARRIDO, TECLEADA, y por que no se deriva de `SURFACES`.
 *
 * Es la leccion que esta ola ha pagado CUATRO veces: un candado que recorre una
 * lista sale en verde cuando la lista encoge. Derivar la expectativa de la
 * misma lista que se verifica (`LEGAL_DOCS.length * 2 + 2`, que es lo que hacia
 * la version anterior de este fichero) es el test autorreferencial que deja
 * pasar cualquier recorte. Estas ocho filas se tocan cuando el sitio gane o
 * pierda una superficie de verdad, y entonces se tocan a la vez que el script.
 *
 * Ata las DOS direcciones: borrar una fila cae por el `toEqual`, y anadir una
 * tambien -- lo segundo importa tanto como lo primero, porque una superficie
 * nueva que entra sin que nadie la mire es una superficie sin medir con el
 * candado diciendo que la mide.
 */
const SUPERFICIES_ESPERADAS = [
    { path: "/", locale: "es", kind: "home" },
    { path: "/en", locale: "en", kind: "home" },
    { path: "/privacidad", locale: "es", kind: "legal" },
    { path: "/en/privacy", locale: "en", kind: "legal" },
    { path: "/aviso-legal", locale: "es", kind: "legal" },
    { path: "/en/legal-notice", locale: "en", kind: "legal" },
    { path: `/${BROKEN_SEGMENT}`, locale: "es", kind: "notFound" },
    { path: `/en/${BROKEN_SEGMENT}`, locale: "en", kind: "notFound" },
];

/*
 * El CONTRATO del candado, tecleado aqui y no derivado de `CHECKS`: derivarlo de
 * la lista que se verifica es el test autorreferencial que deja pasar cualquier
 * recorte. Estas quince familias solo se tocan cuando el script mida algo
 * distinto de verdad, y entonces se tocan a la vez que el script.
 *
 * `texto-al-200-por-ciento` entra el 2026-09-04 con el P1 de zoom de las
 * legales: la familia `responsive-sin-desbordamiento` que ya estaba NO lo veia,
 * y no por descuido sino por una razon concreta que conviene no olvidar --
 * mide `documentElement.scrollWidth`, y con `html, body { overflow-x: clip }`
 * declarado en `GlobalStyles` ese numero nunca supera el ancho del viewport
 * aunque haya contenido fuera. La sonda nueva mira las cajas, no el scroll.
 */
const FAMILIAS_ESPERADAS = [
    "recorrido-teclado",
    "foco-visible",
    "sin-trampas-de-foco",
    "jerarquia-encabezados",
    "ids-unicos",
    "aria-sin-referencias-colgantes",
    "landmarks-con-nombre",
    "aterrizaje-del-indice",
    "disclosure-escape-y-foco",
    "hoja-movil-escape-y-foco",
    "reduced-motion",
    "forced-colors",
    "responsive-sin-desbordamiento",
    "texto-al-200-por-ciento",
    "sin-javascript",
];

describe("cobertura del candado de las superficies del sitio", () => {
    it("recorre TODOS los documentos legales que el sitio declara, en los dos idiomas, mas la portada y una 404 por idioma", () => {
        /* Sonda positiva: si `ROUTES` se quedara sin documentos legales, todo lo
           de abajo pasaria por vacuidad. */
        expect(IDS_LEGALES.length).toBeGreaterThan(0);
        expect(
            [...LEGAL_DOCS.map((d) => d.id)].sort(),
            `los documentos que recorre el script no son los que declara ` +
                `src/config/site.ts: uno de los dos lados se movio solo`,
        ).toEqual([...IDS_LEGALES].sort());

        /* LA EXTENSION, atada contra la lista TECLEADA de arriba y no contra una
           aritmetica sobre la propia lista que se verifica. Este es el caso que
           habria cazado el hueco de la critica #19: el barrido no incluia la
           portada y ningun test lo notaba, porque todos derivaban su expectativa
           de las mismas seis filas que el script declaraba. */
        expect(
            SURFACES.map((s) => ({
                path: s.path,
                locale: s.locale,
                kind: s.kind,
            })),
            `el barrido ya no son las ocho superficies acordadas: si el sitio ` +
                `gano o perdio una de verdad, actualiza SUPERFICIES_ESPERADAS a la ` +
                `vez que el script; si no, restaura la que falta`,
        ).toEqual(SUPERFICIES_ESPERADAS);

        const portadas = SURFACES.filter((s) => s.kind === "home");
        const legales = SURFACES.filter((s) => s.kind === "legal");
        const cuatrocientos = SURFACES.filter((s) => s.kind === "notFound");
        expect(portadas).toHaveLength(2);
        expect(legales).toHaveLength(IDS_LEGALES.length * 2);
        expect(cuatrocientos).toHaveLength(2);

        for (const locale of ["es", "en"]) {
            expect(
                portadas.filter((s) => s.locale === locale),
                `falta la portada de la rama ${locale}`,
            ).toHaveLength(1);
            expect(
                legales.filter((s) => s.locale === locale),
                `falta la rama ${locale} de algun documento legal`,
            ).toHaveLength(IDS_LEGALES.length);
            expect(
                cuatrocientos.filter((s) => s.locale === locale),
                `falta la 404 de la rama ${locale}`,
            ).toHaveLength(1);
        }
    });

    it("las rutas del script son las del sitio, leidas de src/config/site.ts, y NINGUNA ruta declarada se queda sin recorrer", () => {
        // Sonda positiva: sin documentos, los `toContain` de abajo no correrian.
        expect(LEGAL_DOCS.length).toBeGreaterThan(0);

        const caminos = SURFACES.map((s) => s.path);
        for (const clave of IDS_LEGALES) {
            expect(
                caminos,
                `el script no recorre la ruta castellana de ${clave}`,
            ).toContain(ROUTES[clave]);
            expect(
                caminos,
                `el script no recorre la ruta inglesa de ${clave}`,
            ).toContain(EN_ROUTES[clave]);
        }
        expect(EN_PREFIX).toBe(EN_ROUTES.home);

        /*
         * LA PORTADA, contra la fuente unica y no contra dos strings gemelos. Y
         * el barrido completo: TODA clave de `ROUTES` -- legal o no -- tiene que
         * estar recorrida en sus dos idiomas. Es la segunda direccion del
         * candado de extension: la lista tecleada de arriba impide que el
         * barrido encoja, y esto impide que el SITIO crezca por debajo de el
         * sin que nadie lo note.
         */
        expect(HOME_DOC.es).toBe(ROUTES.home);
        expect(HOME_DOC.en).toBe(EN_ROUTES.home);
        for (const clave of Object.keys(ROUTES)) {
            expect(
                caminos,
                `src/config/site.ts declara la ruta ${clave} y el candado no la recorre en castellano`,
            ).toContain(ROUTES[clave]);
            expect(
                caminos,
                `src/config/site.ts declara la ruta ${clave} y el candado no la recorre en ingles`,
            ).toContain(EN_ROUTES[clave]);
        }
    });

    it("el camino que provoca la 404 no es ninguna ruta conocida del sitio", () => {
        /* Si `BROKEN_SEGMENT` se convirtiera algun dia en una ruta real, las dos
           superficies de 404 medirian una pagina normal y el candado seguiria en
           verde midiendo lo que no toca. Se comprueba con el propio resolvedor
           del repo, no con una lista aparte. */
        expect(resolveRoute(`/${BROKEN_SEGMENT}`)).toBeNull();
        expect(resolveRoute(`${EN_PREFIX}/${BROKEN_SEGMENT}`)).toBeNull();
    });

    it("el barrido de anchos cubre los dos extremos del encargo y el escalon md", () => {
        expect(Math.min(...WIDTH_SWEEP)).toBe(320);
        expect(Math.max(...WIDTH_SWEEP)).toBe(1920);
        expect(
            WIDTH_SWEEP,
            "sin 768 el barrido no cruza el escalon en el que la cabecera cambia de la hoja movil a la fila",
        ).toContain(768);
        // Estrictamente creciente: un ancho repetido o desordenado mide menos de
        // lo que la lista aparenta.
        for (let i = 1; i < WIDTH_SWEEP.length; i++) {
            expect(WIDTH_SWEEP[i]).toBeGreaterThan(WIDTH_SWEEP[i - 1]);
        }
    });

    /*
     * LA DEUDA DE ZOOM, atada en los tres sentidos que puede fallar.
     *
     * `DEUDA_ZOOM` es la unica lista del candado cuyo CRECIMIENTO es tan
     * peligroso como su encogimiento: cada entrada apaga una zona entera del
     * documento. Un frente apurado que se encuentre el script en rojo tiene a un
     * teclazo la salida de sancionar su propio defecto, y el rojo desaparece sin
     * que nadie lo lea.
     */
    it("NINGUNA zona del sitio esta sancionada: la lista de deuda de zoom sigue vacia", () => {
        /*
         * LA LISTA VACIA ES LA ENTREGA DE LA CRITICA #19. La version anterior
         * sancionaba cinco zonas -- header|legal, footer|legal, header|notFound,
         * main|notFound, footer|notFound -- y el verificador de la ronda
         * siguiente reprodujo las cinco con sonda propia: no eran deuda, eran
         * incumplimientos vivos de WCAG 1.4.4 en produccion. Estan arregladas en
         * la causa (Navbar/BrandName, Footer, NotFoundContent) y medidas a 0 px
         * fuera; el docblock de DEUDA_ZOOM lleva el antes y el despues de cada
         * una.
         *
         * Con la lista vacia, CUALQUIER perdida de texto o de control al 200 %
         * de tamano de fuente pone el script en rojo, en cualquiera de las ocho
         * superficies. Y la via mas comoda para silenciar ese rojo -- escribir
         * aqui la zona que acaba de romperse -- cae contra este caso, que
         * obliga a tomar esa decision a la vista y con la medicion delante.
         */
        expect(
            DEUDA_ZOOM.map((d) => d.clave),
            `alguien anadio una sancion de zoom: cada entrada apaga una zona entera ` +
                `del documento en todas las superficies de su tipo. Si de verdad hay ` +
                `algo que no se puede cerrar, se decide aqui, con su medicion, y no ` +
                `de paso mientras se apaga un rojo`,
        ).toEqual([]);

        /* La mecanica sigue viva aunque la lista este vacia: el dia que alguien
           anada una entrada, tendra que declarar tope, medida y motivo. */
        for (const d of DEUDA_ZOOM) {
            expect(
                d.topePx,
                `la sancion ${d.clave} no declara tope`,
            ).toBeGreaterThan(d.medidoPx);
            expect(
                d.topePx - d.medidoPx,
                `la sancion ${d.clave} deja ${d.topePx - d.medidoPx} px de holgura: ` +
                    `con tanto margen dejaria pasar un empeoramiento real`,
            ).toBeLessThanOrEqual(6);
            expect(
                d.motivo.length,
                `la sancion ${d.clave} no explica por que`,
            ).toBeGreaterThan(20);
        }
    });

    it("una sancion de zoom que ya no se reproduce se denuncia, en vez de quedarse mintiendo", () => {
        /*
         * Sonda de la tercera regla, la que impide que la lista sobreviva a su
         * propio arreglo. Se comprueba sobre la funcion pura, sin navegador.
         *
         * Con `DEUDA_ZOOM` vacia esta comprobacion no puede hacerse sobre la
         * lista real sin quedarse vacua, asi que se hace sobre una lista
         * SINTETICA que se le pasa a la misma funcion: lo que se prueba es la
         * mecanica, que es lo que tiene que seguir funcionando el dia que
         * alguien vuelva a sancionar algo.
         */
        expect(
            fallosDeDeudaNoObservada(new Set()),
            "sin sanciones declaradas no puede sobrar ninguna",
        ).toEqual([]);

        const sobrantes = fallosDeDeudaNoObservada(new Set(), [
            {
                clave: "footer|legal",
                topePx: 38,
                medidoPx: 35.22,
                motivo: "entrada sintetica de este test, no una sancion real del repo",
            },
        ]);
        expect(sobrantes).toHaveLength(1);
        expect(sobrantes[0]).toContain("footer|legal");
        expect(sobrantes[0]).toContain("ya no se reproduce");

        /* Y observada, no sobra: la otra mitad de la mecanica. */
        expect(
            fallosDeDeudaNoObservada(new Set(["footer|legal"]), [
                {
                    clave: "footer|legal",
                    topePx: 38,
                    medidoPx: 35.22,
                    motivo: "entrada sintetica de este test, no una sancion real del repo",
                },
            ]),
        ).toEqual([]);
    });

    it("el zoom que mide la familia de texto es el 200 % que exige WCAG 1.4.4, no un 150 % complaciente", () => {
        /*
         * La familia `texto-al-200-por-ciento` puede seguir en la lista, con su
         * marcador en el cuerpo y su sonda intacta, y aun asi dejar de medir el
         * defecto: basta bajar `ZOOM_FONT_PX` de 32 a 24. El barrido saldria
         * verde -- a 150 % el token del correo si cabe -- sobre una pagina que
         * WCAG sigue considerando fallo. Lo que se ata aqui es la MAGNITUD, que
         * es la mitad del contrato que la lista de familias no cubre.
         *
         * Los dos numeros se afirman por separado a proposito: sin fijar la base
         * de 16 px, subir las dos constantes a la vez (base 24, zoom 48)
         * conservaria la razon de 2 y volveria a medir otra cosa.
         */
        expect(
            ROOT_FONT_BASE_PX,
            "la raiz por defecto de los navegadores es 16 px: es el denominador del porcentaje",
        ).toBe(16);
        expect(
            ZOOM_FONT_PX,
            "el 200 % de WCAG 1.4.4 sobre una raiz de 16 px son 32 px, no otra cosa",
        ).toBe(32);
        expect(ZOOM_FONT_PX / ROOT_FONT_BASE_PX).toBe(2);
    });

    it("la lista de familias sigue siendo la que el candado prometio medir", () => {
        /* La supresion SIMETRICA -- quitar la familia de `CHECKS` y su marcador
           del cuerpo a la vez -- no la ve el caso de abajo, porque despues de
           quitarla los dos lados siguen coincidiendo. La ve esto. */
        expect(
            [...CHECKS].sort(),
            `el candado declara ${CHECKS.length} familias y prometio ` +
                `${FAMILIAS_ESPERADAS.length}: si de verdad mide otra cosa, actualiza ` +
                `FAMILIAS_ESPERADAS a la vez que el script; si no, restaura lo que falta`,
        ).toEqual([...FAMILIAS_ESPERADAS].sort());
        expect(
            new Set(CHECKS).size,
            `hay familias repetidas en CHECKS: alguien cuadro la cuenta duplicando ` +
                `una en vez de conservar la que falta`,
        ).toBe(CHECKS.length);
    });

    it("cada familia declarada tiene comprobacion real en el script, y cada comprobacion esta declarada", () => {
        /* La clase de caracteres admite DIGITOS desde el 2026-09-04: la familia
           `texto-al-200-por-ciento` lleva el porcentaje en el nombre y con
           `[a-z-]+` el marcador de su cuerpo era invisible para este matcher --
           el test cayo con "la familia declarada texto-al-200-por-ciento no tiene
           ninguna comprobacion marcada", que es el vinculo bidireccional
           funcionando, no un fallo suyo. Ampliar la clase no afloja nada: las dos
           comparaciones de abajo siguen siendo las mismas en los dos sentidos. */
        const marcados = [
            ...SCRIPT.matchAll(/\/\/ \[check: ([a-z0-9-]+)\]/g),
        ].map((m) => m[1]);

        // Sonda positiva: sin marcas, las dos comparaciones de abajo pasarian
        // por vacuidad, que es justo el fallo que este fichero existe para
        // impedir.
        expect(marcados.length).toBeGreaterThan(0);
        expect(CHECKS.length).toBeGreaterThan(0);

        for (const familia of CHECKS) {
            expect(
                marcados,
                `la familia declarada ${familia} no tiene ninguna comprobacion marcada en el cuerpo del script`,
            ).toContain(familia);
        }
        for (const marca of marcados) {
            expect(
                CHECKS,
                `el script comprueba ${marca}, que no esta declarada en CHECKS`,
            ).toContain(marca);
        }
    });
});

/*
 * LA SALIDA DE EMERGENCIA, ATADA. Este candado no corre en el gate porque
 * necesita el sitio servido; se ejecuta a mano, y la unica forma de ejecutarlo en
 * esta maquina es apuntar `PLAYWRIGHT_CORE` al paquete instalado fuera del repo.
 * Esa variable estuvo ROTA para la lectura natural de su propia documentacion --
 * la ruta del DIRECTORIO del paquete --, y el script moria diciendo que
 * Playwright no estaba instalado. Un candado que la ronda siguiente no sabe
 * arrancar siguiendo sus instrucciones es un candado que no correra.
 *
 * Se prueba contra un paquete de mentira montado en disco, no contra el
 * Playwright de esta maquina: la ruta real es de UNA maquina y el gate corre en
 * otras. Lo que se verifica es lo que fallaba -- que una ruta de DIRECTORIO
 * termine en un especificador que `import()` sabe resolver.
 *
 * VALIDADO CON BUG INYECTADO: desactivando la deteccion de directorio
 * (`esDirectorio = false && statSync(valor).isDirectory()`, que devuelve
 * exactamente el comportamiento anterior) los dos primeros casos caen con
 *
 *   AssertionError: un directorio tiene que resolverse al FICHERO de entrada: un
 *   import() de una URL file:// de carpeta no lee el package.json del paquete
 *
 *   Error: loadChromium no supo cargar el paquete desde la ruta de su
 *   DIRECTORIO, que es la forma en que la variable se reparte en los encargos y
 *   la lectura natural de su propia documentacion. Salida de node: Error: Este
 *   candado necesita Playwright, que NO es dependencia del repo a proposito...
 *
 * Restaurada la deteccion, verde. Y con el arreglo puesto, el candado entero
 * corrio contra el build servido apuntando `PLAYWRIGHT_CORE` al DIRECTORIO del
 * paquete: «CUMPLE - 6 superficies, 14 familias, cero incumplimientos (tema
 * dark, base http://localhost:4321)», codigo de salida 0.
 */
const paquetesFalsos = [];
function paqueteFalso(pkg, entrada) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "vti-playwright-falso-"));
    paquetesFalsos.push(dir);
    writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg));
    writeFileSync(
        path.join(dir, entrada),
        "export const chromium = { marca: 'paquete falso del candado' };\n",
    );
    return dir;
}

afterAll(() => {
    for (const dir of paquetesFalsos)
        rmSync(dir, { recursive: true, force: true });
});

describe("la salida de emergencia PLAYWRIGHT_CORE del candado de navegador", () => {
    it("resuelve la ruta de un DIRECTORIO al fichero de entrada que declara su package.json", () => {
        /* `playwright-core` declara `exports` y NO declara `main`, asi que
           quedarse en `main` tampoco habria bastado (comprobado en el paquete
           real de esta maquina). */
        const dir = paqueteFalso(
            {
                name: "playwright-core-falso",
                exports: { ".": { import: "./index.mjs" } },
            },
            "index.mjs",
        );
        const candidatos = especificadoresDePlaywright(dir);
        expect(
            candidatos[0],
            `un directorio tiene que resolverse al FICHERO de entrada: un import() ` +
                `de una URL file:// de carpeta no lee el package.json del paquete`,
        ).toBe(pathToFileURL(path.join(dir, "index.mjs")).href);
        expect(
            candidatos.at(-2),
            "los nombres de paquete siguen como ultimo recurso",
        ).toBe("playwright-core");
    });

    it("importa de verdad el paquete cuando PLAYWRIGHT_CORE apunta a su directorio", () => {
        /*
         * En NODE PELADO, no dentro de Vitest, y a proposito: el defecto vivia en
         * el `import()` real y el script se ejecuta con `node scripts/...`. Vite
         * reescribe los import dinamicos y no sabe cargar un fichero de fuera de
         * la raiz del proyecto (reproducido: llamar aqui a `loadChromium()`
         * directamente falla aunque la ruta sea correcta), asi que medirlo desde
         * dentro del corredor mediria otra cosa.
         */
        const dir = paqueteFalso(
            {
                name: "playwright-core-falso",
                exports: { ".": { import: "./entrada.mjs" } },
            },
            "entrada.mjs",
        );
        const sonda = path.join(dir, "sonda.mjs");
        writeFileSync(
            sonda,
            `import { loadChromium } from ${JSON.stringify(pathToFileURL(RUTA_SCRIPT).href)};\n` +
                `const chromium = await loadChromium();\n` +
                `process.stdout.write(String(chromium.marca));\n`,
        );

        let salida;
        try {
            salida = execFileSync(process.execPath, [sonda], {
                encoding: "utf8",
                env: { ...process.env, PLAYWRIGHT_CORE: dir },
            });
        } catch (error) {
            throw new Error(
                `loadChromium no supo cargar el paquete desde la ruta de su ` +
                    `DIRECTORIO, que es la forma en que la variable se reparte en los ` +
                    `encargos y la lectura natural de su propia documentacion. ` +
                    `Salida de node: ${String(error.stderr || error.message).trim()}`,
            );
        }
        expect(salida).toBe("paquete falso del candado");
    });

    it("acepta tambien el fichero de entrada y el nombre del paquete, y no inventa candidatos sin variable", () => {
        const dir = paqueteFalso(
            {
                name: "playwright-core-falso",
                exports: { ".": { import: "./index.mjs" } },
            },
            "index.mjs",
        );
        const fichero = path.join(dir, "index.mjs");
        expect(especificadoresDePlaywright(fichero)[0]).toBe(
            pathToFileURL(fichero).href,
        );
        expect(especificadoresDePlaywright("playwright-core")[0]).toBe(
            "playwright-core",
        );
        expect(especificadoresDePlaywright(undefined)).toEqual([
            "playwright-core",
            "playwright",
        ]);
    });
});
