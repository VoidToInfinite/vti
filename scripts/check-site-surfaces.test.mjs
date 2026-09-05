import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, afterEach, beforeEach, describe, it, expect } from "vitest";
import {
    BANDA_DE_REFLOW,
    BROKEN_SEGMENT,
    CHECKS,
    DEUDA_ZOOM,
    EN_PREFIX,
    HOME_DOC,
    LEGAL_DOCS,
    MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA,
    MIN_CARACTERES_POR_LINEA,
    RATIO_MINIMO_DE_CRECIMIENTO,
    ROOT_FONT_BASE_PX,
    SURFACES,
    WIDTH_SWEEP,
    ZOOM_FONT_PX,
    comparaCrecimiento,
    especificadoresDePlaywright,
    fallosDeCrecimientoEnLaBanda,
    fallosDeDeudaNoObservada,
    probeCrecimientoDeTexto,
    probeLegibilidadDeTexto,
    probePerdidaHorizontal,
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
 *
 * LO QUE ANADE LA OLA R (2026-09-05). Hasta aqui este fichero solo ataba la
 * COBERTURA del candado: que las listas no encojan. Eso deja sin candar el
 * CUERPO de las sondas -- una sonda que mide el lado equivocado, o con el umbral
 * equivocado, pasa los doce casos de arriba sin despeinarse -- y deja un hueco
 * mas en la propia cobertura. Los tres cierres, con su rojo LITERAL observado:
 *
 *   e. EL RECORTE SIMETRICO DE DOS FICHEROS. El hueco (a) se cerro a nivel de
 *      dos bloques (`CHECKS` y su marcador), pero `FAMILIAS_ESPERADAS` vive en
 *      ESTE fichero: quitando a la vez la familia de `CHECKS`, su linea de
 *      `FAMILIAS_ESPERADAS` y su marcador del cuerpo --tres bloques, dos
 *      ficheros-- los dos candados de familias volvian a coincidir sobre una
 *      lista mas corta. Repetida esa supresion con `"forced-colors"`, el unico
 *      caso que cae es el nuevo:
 *
 *        AssertionError: el script declara 15 familias y el contrato tiene un
 *        suelo de 16: este numero solo sube, y sube en el mismo commit que anade
 *        la familia nueva. Si has quitado una, restaurala; el candado no mide
 *        menos de lo que un dia midio: expected 15 to be greater than or equal
 *        to 16
 *
 *      Los otros dos casos de familias siguieron en «✓», que es exactamente la
 *      demostracion de que no veian esta supresion. Restauradas las tres
 *      lineas, 22 en verde. LIMITE DECLARADO, porque no decirlo seria vender el
 *      candado por mas de lo que es: bajar `FAMILIAS_MINIMAS` a mano NO pone
 *      nada en rojo -- es un suelo, y bajarlo es una decision visible en el
 *      diff, que es justo la friccion que faltaba; lo que ya no se puede es
 *      recortar el contrato borrando lineas que se leen como limpieza.
 *
 *   f. EL LADO IZQUIERDO DE LA SONDA DE PERDIDA. Devolviendo `sobra` a
 *      `r.right - cw` (la formula anterior, `grep -c "r.left"` daba 0) --
 *
 *        AssertionError: un elemento con left -30 dentro de un viewport de 320
 *        px pierde 30 px por la izquierda: con la formula de un solo lado
 *        (r.right - cw) sale -20 y no se reporta nada: expected [] to have a
 *        length of 1 but got +0
 *
 *   g. EL UMBRAL DE LEGIBILIDAD. Bajando `MIN_CARACTERES_POR_LINEA` de 4 a 1 --
 *      que es la forma de vaciar la familia sin quitarla -- caen SIETE casos
 *      («Tests 7 failed | 27 passed (34)», repetida la inyeccion el 2026-09-05
 *      por el frente J). La ola escribio «cuatro» el dia que la midio y esa
 *      cuenta se quedo vieja el mismo dia: el segundo factor de la familia
 *      llego por la tarde con tres casos mas que tambien dependen del umbral
 *      (la caja de 100 px de 320, la que se absuelve por estirada y la que se
 *      reporta sin ancho de documento). Las dos primeras lineas rojas, que son
 *      las que la ola cito y siguen saliendo igual:
 *
 *        AssertionError: el umbral se calibro en 4 contra las dos poblaciones
 *        medidas (defectos de 0,9 a 2,7 caracteres por linea; suelo fisico de la
 *        tipografia grande a 320 px de 5 a 7). Bajarlo vacia la familia sin
 *        quitarla: expected 1 to be greater than or equal to 4
 *
 *        AssertionError: 6 caracteres en 3 lineas son 2 por linea, por debajo
 *        del umbral de 1: la caja tiene que reportarse: expected [] to have a
 *        length of 1 but got +0
 *
 *      Y las dos piezas de la sonda que no son el umbral, tambien vistas en
 *      rojo. Quitando la confirmacion contra las cajas de linea reales
 *      (`const lineas = lineasPorCaja;`) --
 *
 *        AssertionError: el texto ocupa 2 lineas reales de las 9 que mide la
 *        caja: 21 caracteres en 2 lineas son 10,5 por linea y no hay defecto:
 *        expected [ { zona: 'suelto', sel: 'p', …(5) } ] to deeply equal []
 *
 *      y apagando la guarda de vacuidad de las cajas de tres lineas --
 *
 *        AssertionError: el script ya no convierte en rojo la guarda de vacuidad
 *        "la sonda de legibilidad no encontro ni una sola caja de tres o mas
 *        lineas": sin ella un cero en el contador pasaria por pagina limpia:
 *        expected '/*\n * SIN SHEBANG, al contrario que …' to contain 'la sonda
 *        de legibilidad no encontro n…'
 *
 *   h. LOS DOS FILTROS QUE EVITAN FALSOS POSITIVOS, tambien vistos en rojo,
 *      porque un filtro roto es tan grave como una medida rota: uno deja de
 *      absolver lo que debe y el candado empieza a mentir por el otro lado.
 *      Estrechando el filtro de ancestro a `if (ox === "scroll")` --dejando
 *      fuera `auto`, que es el valor que usa `ScTableWrap`-- cae el tercer caso
 *      de la sonda de perdida:
 *
 *        AssertionError: expected [ { zona: 'suelto', sel: 'td', …(3) } ] to
 *        deeply equal []
 *
 *      Y neutralizando la guarda de escritura horizontal (`const escritura =
 *      "horizontal-tb";`, sin leer el estilo computado) cae el de texto
 *      vertical:
 *
 *        AssertionError: una caja vertical no se examina: expected 1 to be +0 //
 *        Object.is equality
 *
 * Restaurado todo, 22 casos en verde.
 *
 * LO QUE ANADE EL SEGUNDO FACTOR DE LA FAMILIA DE LEGIBILIDAD (2026-09-05, ola
 * S). El candado que la ola R entrego medía UN factor --caracteres por linea--
 * y la primera corrida contra el build de `5bfe092`, con los rellenos ya
 * arreglados, demostro que ese factor solo NO separa las dos poblaciones: el
 * rotulo del CTA («Escríbeme», 9 caracteres en 3 lineas dentro de una caja de
 * 108 px de 320) es defecto y el acento de la nota de cierre del deck de Story
 * («un nuevo comienzo», 17 caracteres en 5 lineas dentro de una caja de 177,61
 * px de 320) no lo es, y los dos daban ~3,4 caracteres por linea. Lo que los
 * separa es el ANCHO DE LA CAJA RESPECTO AL VIEWPORT: 34 % contra 55 %. La
 * tabla completa de las dos poblaciones esta en el docblock de
 * `MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA`.
 *
 * Las TRES inyecciones que validan el factor nuevo, con su rojo LITERAL:
 *
 *   i. QUITADO EL SEGUNDO FACTOR de la sonda (borrado el bloque
 *      `if (anchoRelativo !== null && anchoRelativo >= maxAnchoRelativo)`, que
 *      es exactamente la version anterior) -- «Tests 2 failed | 24 passed»:
 *
 *        AssertionError: una caja de 200 px en un documento de 320 ocupa el 62,5
 *        % del viewport: con esa anchura disponible, tres lineas de dos
 *        caracteres son fisica de la tipografia, no un defecto de rellenos:
 *        expected [ { zona: 'suelto', sel: 'p', …(6) } ] to deeply equal []
 *
 *        AssertionError: 17 caracteres en 5 lineas son 3,4 por linea, por debajo
 *        del primer factor, pero la caja ocupa el 55,5 % del viewport: es el
 *        suelo fisico de una tipografia que WCAG 1.4.4 exige que crezca, no un
 *        defecto de rellenos: expected [ { zona: 'suelto', sel: 'p', …(6) } ] to
 *        deeply equal []
 *
 *   j. SUBIDO EL UMBRAL a 0,9 -- la forma de llenar el informe de falsos
 *      positivos sin tocar la sonda -- caen los DOS mismos casos, con las dos
 *      mismas lineas. El caso que teclea el suelo NO cae, y esa es justo la
 *      demostracion de que un suelo no ata la direccion contraria: lo que ata
 *      subirlo es la medida real reproducida.
 *
 *   k. BAJADO EL UMBRAL a 0,2 -- la forma de vaciar la familia por el otro
 *      lado -- «Tests 4 failed | 22 passed», el primero de ellos el suelo
 *      tecleado:
 *
 *        AssertionError: el umbral relativo se calibro en 0,5 contra las dos
 *        poblaciones medidas (defectos del 7 % al 45 % del viewport; tipografia
 *        grande legitima del 55 % al 65 %). Bajarlo deja de ver el defecto de
 *        rellenos: con 0,2 el rotulo del CTA a 320 px, que ocupa el 34 %,
 *        saldria en verde: expected 0.2 to be greater than or equal to 0.5
 *
 *        AssertionError: una caja de 100 px en un documento de 320 ocupa el 31 %
 *        del viewport y parte 6 caracteres en 3 lineas: es el defecto de
 *        rellenos que esta familia existe para cazar: expected [] to have a
 *        length of 1 but got +0
 *
 *   l. INVERTIDA LA CAIDA CONSERVADORA sin ancho de documento (`if
 *      (anchoRelativo === null || anchoRelativo >= maxAnchoRelativo)`, o sea
 *      absolver cuando el factor no se puede evaluar, que es la forma de vaciar
 *      la familia entera el dia que la sonda pierda el `clientWidth`) -- «Tests
 *      1 failed | 25 passed»:
 *
 *        AssertionError: sin ancho de documento el segundo factor no absuelve a
 *        nadie: expected [] to have a length of 1 but got +0
 *
 * Restauradas las cuatro, 26 casos en verde.
 *
 * LO QUE ANADE EL FRENTE J (2026-09-05): la ATADURA QUE FALTABA EN EL BARRIDO DE
 * ANCHOS y la FAMILIA DIECISIETE. Los dos huecos los encontro el verificador de
 * candados de la ola R midiendo, no leyendo.
 *
 *   m. EL BARRIDO DE ANCHOS NO TENIA ATADURA DE EXTENSION. Los tres asertos que
 *      ya habia --minimo 320, maximo 1920, contiene 768-- los cumple un barrido
 *      de tres anchos, asi que el verificador dejo `WIDTH_SWEEP` en `[320, 768,
 *      1920]`, de doce a tres, y los 26 casos siguieron en verde: el candado de
 *      navegador pasaba a mirar la cuarta parte de las anchuras sin una sola
 *      linea roja. Se cierra con el mismo patron que las superficies y las
 *      familias --`ANCHOS_ESPERADOS` tecleada (`toEqual`) mas
 *      `MINIMO_ANCHOS_BARRIDOS` numerico--, y repetida la MISMA supresion caen
 *      dos casos («Tests 2 failed | 32 passed (34)»):
 *
 *        AssertionError: el barrido ya no son los 12 anchos acordados: si el
 *        sitio gano o perdio un escalon de verdad, actualiza ANCHOS_ESPERADOS a
 *        la vez que el script; si no, restaura los que faltan. Un barrido
 *        recortado mide menos y sale igual de verde: expected [ 320, 768, 1920 ]
 *        to deeply equal [ 320, 360, 390, 414, 480, 600, …(6) ]
 *
 *        AssertionError: la banda mide a 390px, que no es un ancho del barrido:
 *        los dos lados del candado tienen que medir las mismas anchuras reales:
 *        expected [ 320, 768, 1920 ] to include 390
 *
 *   n. LA FAMILIA DIECISIETE, `texto-crece-con-la-preferencia`, con sus dos
 *      funciones puras ejercitadas en jsdom. Las tres inyecciones, cada una
 *      aplicada SOLA, ejecutada, vista en rojo y restaurada:
 *
 *      Bajando `RATIO_MINIMO_DE_CRECIMIENTO` de 1.5 a 1 --la forma de vaciar la
 *      familia sin quitarla-- caen CINCO casos («Tests 5 failed | 29 passed
 *      (34)»); el primero es el suelo tecleado y el segundo la sonda:
 *
 *        AssertionError: el crecimiento minimo se calibro en 1.5 contra las dos
 *        poblaciones medidas (F94 de x0.98 a x1.00; tipografia fluida legitima
 *        de x1.75 a x2.00). Bajarlo vacia la familia sin quitarla: con 1 el h1
 *        del hero, que se queda en 34 px, saldria en verde: expected 1 to be
 *        greater than or equal to 1.5
 *
 *        AssertionError: una caja que pasa de 24 a 24 px no crece (x1.00) y
 *        tiene que reportarse; la que pasa de 16 a 32 (x2.00) no: expected [] to
 *        deeply equal [ 'no se mueve' ]
 *
 *      Quitando la guarda del control de `comparaCrecimiento` (`controlDobla:
 *      true`, que es el candado sin su guarda) cae uno:
 *
 *        AssertionError: el cuerpo se quedo en 16 px: la emulacion no llego y el
 *        x1 de la caja no dice nada del sitio: expected true to be false //
 *        Object.is equality
 *
 *      Y renombrando el mensaje con el que el SCRIPT convierte esa guarda en
 *      rojo --que es la otra mitad, porque una guarda que no llega al informe no
 *      para nada-- cae el mismo caso por su otra asercion:
 *
 *        AssertionError: el script ya no convierte en rojo la guarda "la caja de
 *        control (el cuerpo) no dobla con la preferencia de tamano de texto":
 *        sin ella una corrida sin emulacion pasaria por defecto del sitio, o un
 *        emparejamiento roto por pagina limpia
 *
 * Restauradas las cuatro, 34 casos en verde.
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
 * recorte. Estas dieciseis familias solo se tocan cuando el script mida algo
 * distinto de verdad, y entonces se tocan a la vez que el script.
 *
 * `texto-al-200-por-ciento` entra el 2026-09-04 con el P1 de zoom de las
 * legales: la familia `responsive-sin-desbordamiento` que ya estaba NO lo veia,
 * y no por descuido sino por una razon concreta que conviene no olvidar --
 * mide `documentElement.scrollWidth`, y con `html, body { overflow-x: clip }`
 * declarado en `GlobalStyles` ese numero nunca supera el ancho del viewport
 * aunque haya contenido fuera. La sonda nueva mira las cajas, no el scroll.
 *
 * `legibilidad-al-200-por-ciento` entra el 2026-09-05 por el mismo motivo un
 * escalon mas adentro: la familia anterior mide que no se PIERDA contenido, y
 * el arreglo que llevo esa cuenta a cero px fuera dejo la portada con los
 * valores de las tarjetas de Contact a 23,2 px de ancho --de 0,9 a 1,4
 * caracteres por linea-- y el rotulo del CTA saliendo letra por linea. Con el
 * candado en verde. No se perdia texto; no se podia leer.
 *
 * `texto-crece-con-la-preferencia` entra el mismo dia, y cierra el escalon que
 * queda por debajo de las dos: las dos miden CONSECUENCIAS de que el texto
 * crezca, y un texto que NO crece no produce ninguna de las dos --ni se sale ni
 * se parte en trocitos--, asi que las dos lo dan por bueno. El `h1` del hero, su
 * tagline y el statement de Story llevaban meses en 34, 15 y 24 px con la
 * preferencia al 200 % (patron de fallo F94 de WCAG 1.4.4: `clamp()` de
 * `font-size` con suelo y techo en pixeles) y ningun candado del repo lo veia.
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
    "legibilidad-al-200-por-ciento",
    "texto-crece-con-la-preferencia",
    "sin-javascript",
];

/**
 * EL SUELO NUMERICO DEL CONTRATO, y por que hacia falta un tercer candado sobre
 * la misma lista.
 *
 * Los dos que ya habia atan la COHERENCIA (cada familia declarada tiene su
 * marcador en el cuerpo y al reves) y la IGUALDAD contra `FAMILIAS_ESPERADAS`.
 * Ninguno de los dos sobrevive al recorte SIMETRICO, que es el que hace quien
 * recorta de verdad: se quita la familia de `CHECKS`, su marcador
 * `// [check: ...]` del cuerpo y su linea de `FAMILIAS_ESPERADAS` --tres
 * bloques, dos ficheros-- y los dos candados vuelven a coincidir sobre una
 * lista mas corta. El script pasa a medir quince cosas diciendo quince, sin una
 * sola linea roja. Es exactamente el hueco (a) que este fichero ya cerro una vez
 * a nivel de dos bloques; con `FAMILIAS_ESPERADAS` en el mismo fichero que el
 * test, el recorte solo tenia que ser un poco mas ancho.
 *
 * Este numero esta TECLEADO y solo puede SUBIR. Es la unica pieza del contrato
 * que no se puede recortar sin escribir a mano un numero mas pequeno, que es
 * una decision visible en el diff en vez de tres borrados que se leen como
 * limpieza. Se sube el dia que el candado gane una familia de verdad, en el
 * mismo commit que la gana.
 *
 * Sube a 17 el 2026-09-05 con `texto-crece-con-la-preferencia`, en el mismo
 * commit que la anade, que es exactamente la regla de arriba cumpliendose.
 */
const FAMILIAS_MINIMAS = 17;

/**
 * EL BARRIDO DE ANCHOS, TECLEADO, y por que hacia falta un cuarto candado sobre
 * una lista que ya tenia caso propio.
 *
 * El caso que ya existia afirma tres cosas del barrido --el minimo, el maximo y
 * que contiene 768-- y ninguna de las tres se rompe al RECORTARLO: el
 * verificador de candados de la ola R dejo `WIDTH_SWEEP` en `[320, 768, 1920]`,
 * de doce anchos a tres, y los 26 casos de este fichero siguieron en verde. El
 * candado de navegador pasaba a mirar la cuarta parte de las anchuras --sin los
 * escalones intermedios donde la cabecera y las tarjetas cambian de forma-- y lo
 * decia igual de tranquilo.
 *
 * Es la MISMA leccion que `SUPERFICIES_ESPERADAS` y `FAMILIAS_MINIMAS`, aplicada
 * a la tercera lista del contrato: una lista que se recorre sale verde cuando
 * encoge. Estos doce anchos se tocan cuando el sitio gane o pierda un escalon de
 * verdad, y entonces se tocan a la vez que el script.
 *
 * Ata las DOS direcciones, igual que la de superficies: quitar un ancho cae por
 * el `toEqual` y anadirlo tambien, porque un ancho nuevo que entra sin que nadie
 * lo mire es coste de corrida sin criterio detras.
 */
const ANCHOS_ESPERADOS = [
    320, 360, 390, 414, 480, 600, 768, 834, 1024, 1280, 1440, 1920,
];

/**
 * EL SUELO NUMERICO DEL BARRIDO, con el mismo papel que `FAMILIAS_MINIMAS`: el
 * `toEqual` de arriba y este numero se recortan a la vez solo escribiendo a mano
 * un numero mas pequeno, que es una decision visible en el diff en vez de una
 * lista mas corta que se lee como limpieza.
 */
const MINIMO_ANCHOS_BARRIDOS = 12;

/**
 * LA BANDA DE REFLOW de la familia `texto-crece-con-la-preferencia`, tecleada
 * con el mismo criterio que las tres listas de arriba. Son 320 y 390 px: el
 * extremo estrecho del encargo y el ancho de dispositivo mas comun de esa zona,
 * los dos por debajo del escalon `md`. El porque de que la banda sea estrecha
 * --y no el barrido entero-- esta en el docblock de `BANDA_DE_REFLOW`, con la
 * medida de la tipografia fluida que lo obliga.
 */
const BANDA_ESPERADA = [320, 390];

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
            "sin 768 el barrido no cruza el escalon en el que la cabecera cambia de la hoja movil a la fila " +
                "(768 px a la raiz por defecto: desde el frente F, 2026-09-05, el escalon se declara como 48em)",
        ).toContain(768);
        // Estrictamente creciente: un ancho repetido o desordenado mide menos de
        // lo que la lista aparenta.
        for (let i = 1; i < WIDTH_SWEEP.length; i++) {
            expect(WIDTH_SWEEP[i]).toBeGreaterThan(WIDTH_SWEEP[i - 1]);
        }
    });

    it("el barrido de anchos no puede ENCOGER: los doce anchos son los acordados y son doce", () => {
        /*
         * Las tres afirmaciones de arriba --minimo, maximo y el 768-- las cumple
         * un barrido de tres anchos, y esa es exactamente la supresion que el
         * verificador de la ola R hizo: `[320, 768, 1920]`, con los 26 casos del
         * fichero en verde. El candado de navegador medía la cuarta parte de las
         * anchuras y ninguna linea se ponia roja.
         *
         * Las dos direcciones se afirman por separado a proposito, igual que en
         * el contrato de familias: el `toEqual` caza el recorte de ESTE fichero
         * contra el script, y el suelo tecleado caza el recorte de los DOS a la
         * vez, que es lo que hace quien limpia de verdad.
         */
        expect(
            WIDTH_SWEEP,
            `el barrido ya no son los ${MINIMO_ANCHOS_BARRIDOS} anchos acordados: ` +
                `si el sitio gano o perdio un escalon de verdad, actualiza ` +
                `ANCHOS_ESPERADOS a la vez que el script; si no, restaura los que ` +
                `faltan. Un barrido recortado mide menos y sale igual de verde`,
        ).toEqual(ANCHOS_ESPERADOS);
        expect(
            WIDTH_SWEEP.length,
            `el barrido bajo de ${MINIMO_ANCHOS_BARRIDOS} anchos: este numero solo ` +
                `sube, y recortar la lista tecleada de este fichero a la vez que la ` +
                `del script es justo la supresion que el caso de arriba no ve`,
        ).toBeGreaterThanOrEqual(MINIMO_ANCHOS_BARRIDOS);
    });

    it("la banda de reflow de la familia de crecimiento es estrecha, tecleada, y sale del propio barrido", () => {
        /*
         * La familia `texto-crece-con-la-preferencia` no recorre el barrido
         * entero --el porque, con la medida de la tipografia fluida que lo
         * obliga, esta en el docblock de `BANDA_DE_REFLOW`--, pero su banda no
         * puede ser una TERCERA lista que encoja sola ni deslizarse hacia
         * anchuras donde el termino en `vw` domina y la medida deja de
         * significar lo mismo.
         */
        expect(
            BANDA_DE_REFLOW,
            "la banda de reflow ya no son los dos anchos acordados: si son otros, " +
                "se decide aqui y con la medicion delante",
        ).toEqual(BANDA_ESPERADA);
        expect(
            BANDA_DE_REFLOW.length,
            "una banda de un solo ancho no puede absolver a la tipografia fluida " +
                "que crece en un ancho y no en el otro: hacen falta los dos",
        ).toBeGreaterThanOrEqual(2);
        for (const width of BANDA_DE_REFLOW) {
            expect(
                WIDTH_SWEEP,
                `la banda mide a ${width}px, que no es un ancho del barrido: los dos ` +
                    `lados del candado tienen que medir las mismas anchuras reales`,
            ).toContain(width);
            expect(
                width,
                `a ${width}px ya se ha cruzado el escalon md (768 px con la raiz de ` +
                    `fabrica): fuera de la banda estrecha el termino en vw de la ` +
                    `tipografia fluida domina al suelo en rem y un x1.44 legitimo se ` +
                    `confundiria con un F94`,
            ).toBeLessThan(768);
        }
        expect(
            Math.min(...BANDA_DE_REFLOW),
            "la banda tiene que empezar en el ancho mas estrecho del encargo",
        ).toBe(Math.min(...WIDTH_SWEEP));
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

    it("el contrato de familias solo puede CRECER: ni el script ni este test bajan del suelo tecleado", () => {
        /*
         * El caso que cierra el recorte simetrico de DOS ficheros. Los dos
         * candados de abajo se comparan entre si, asi que sobreviven a que las
         * dos listas encojan a la vez; este se compara contra un numero escrito
         * a mano, que no encoge solo.
         *
         * Las dos direcciones se afirman por separado a proposito: `CHECKS`
         * vive en el script y `FAMILIAS_ESPERADAS` aqui, y recortar una sola
         * ya cae por el `toEqual` de abajo -- pero recortar las dos, que es lo
         * que pasa cuando alguien "limpia" de verdad, solo lo ve esto.
         */
        expect(
            CHECKS.length,
            `el script declara ${CHECKS.length} familias y el contrato tiene un ` +
                `suelo de ${FAMILIAS_MINIMAS}: este numero solo sube, y sube en el ` +
                `mismo commit que anade la familia nueva. Si has quitado una, ` +
                `restaurala; el candado no mide menos de lo que un dia midio`,
        ).toBeGreaterThanOrEqual(FAMILIAS_MINIMAS);
        expect(
            FAMILIAS_ESPERADAS.length,
            `la lista tecleada de este fichero bajo de ${FAMILIAS_MINIMAS} familias: ` +
                `recortarla a la vez que CHECKS es justo la supresion que los otros ` +
                `dos casos no ven`,
        ).toBeGreaterThanOrEqual(FAMILIAS_MINIMAS);
    });

    it("el umbral de legibilidad es el calibrado, y no puede bajar hasta volverse vacuo", () => {
        /*
         * La familia `legibilidad-al-200-por-ciento` puede seguir declarada, con
         * su marcador y su sonda intactos, y dejar de ver el defecto: basta
         * bajar el umbral. Con `< 1` caracter por linea ninguna de las cajas
         * medidas el 2026-09-05 se reportaria -- la peor daba exactamente 1
         * ("Escríbeme", 9 caracteres en 9 lineas) -- y la familia saldria en
         * verde sobre la portada entera.
         *
         * El suelo es 4 y no una igualdad porque SUBIRLO endurece el candado:
         * la unica direccion peligrosa es hacia abajo.
         */
        expect(
            MIN_CARACTERES_POR_LINEA,
            `el umbral se calibro en 4 contra las dos poblaciones medidas (defectos ` +
                `de 0,9 a 2,7 caracteres por linea; suelo fisico de la tipografia ` +
                `grande a 320 px de 5 a 7). Bajarlo vacia la familia sin quitarla`,
        ).toBeGreaterThanOrEqual(4);
    });

    it("el umbral de ancho relativo es el calibrado, y no puede bajar hasta vaciar la familia por el otro lado", () => {
        /*
         * EL SEGUNDO FACTOR, tecleado. La familia declara ilegible una caja
         * cuando se cumplen LAS DOS condiciones: caracteres por linea por
         * debajo de `MIN_CARACTERES_POR_LINEA` Y ancho de caja por debajo de
         * `MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA x clientWidth`. La segunda tiene
         * su propia forma de volverse vacua, y es BAJAR el numero: con 0,2, el
         * rotulo del CTA a 320 px --caja de 108 px, el 34 % del viewport, tres
         * caracteres por linea-- dejaria de reportarse y el defecto real
         * saldria en verde. Con 0,05 no quedaria ni una caja en la familia.
         *
         * La direccion contraria, subirlo, no vacia nada pero llena el informe
         * de falsos positivos, y esa la caza el caso que reproduce el acento de
         * la nota del deck (55,5 % del viewport): con 0,9 vuelve a contarse.
         *
         * El hueco entre las dos poblaciones medidas el 2026-09-05 va del 45 %
         * (kicker, h2 del deck, cita de Journey: defectos) al 55 % (acento de la
         * nota: fisica); 0,5 cae en medio.
         */
        expect(
            MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA,
            `el umbral relativo se calibro en 0,5 contra las dos poblaciones ` +
                `medidas (defectos del 7 % al 45 % del viewport; tipografia grande ` +
                `legitima del 55 % al 65 %). Bajarlo deja de ver el defecto de ` +
                `rellenos: con 0,2 el rotulo del CTA a 320 px, que ocupa el 34 %, ` +
                `saldria en verde`,
        ).toBeGreaterThanOrEqual(0.5);
        expect(
            MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA,
            `un umbral de 1 o mas anula el segundo factor: toda caja es mas ` +
                `estrecha que el viewport entero y la familia vuelve a tener un ` +
                `solo factor`,
        ).toBeLessThan(1);
    });

    it("el crecimiento minimo que exige la familia diecisiete es el calibrado, y no puede bajar hasta volverse vacuo", () => {
        /*
         * El mismo patron que los dos umbrales de legibilidad, sobre la constante
         * nueva. La familia puede seguir declarada, con su marcador y su sonda
         * intactos, y dejar de ver el defecto: basta bajar el minimo. Con 1
         * ninguna de las cajas medidas el 2026-09-05 se reportaria --el `h1` del
         * hero da exactamente x1.00-- y la portada saldria en verde.
         *
         * El suelo es 1.5 y no 2 porque la tipografia fluida legitima del repo
         * crece x1.75 a 320 px (`clamp(1.75rem, 10vw, 11rem)` de la etiqueta de
         * paso de Journey, medida): exigir el doble convertiria un patron
         * correcto en defecto. Subirlo endurece el candado hasta ese punto; la
         * unica direccion vacia es hacia abajo.
         */
        expect(
            RATIO_MINIMO_DE_CRECIMIENTO,
            `el crecimiento minimo se calibro en 1.5 contra las dos poblaciones ` +
                `medidas (F94 de x0.98 a x1.00; tipografia fluida legitima de x1.75 ` +
                `a x2.00). Bajarlo vacia la familia sin quitarla: con 1 el h1 del ` +
                `hero, que se queda en 34 px, saldria en verde`,
        ).toBeGreaterThanOrEqual(1.5);
        expect(
            RATIO_MINIMO_DE_CRECIMIENTO,
            `un minimo por encima de 1.75 declararia defecto la tipografia fluida ` +
                `correcta (clamp con suelo en rem y termino en vw), que es el patron ` +
                `que WCAG 1.4.4 pide y no el que prohibe`,
        ).toBeLessThanOrEqual(1.75);
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
 * LAS DOS SONDAS DE ZOOM, EJERCITADAS DE VERDAD EN JSDOM.
 *
 * Todo lo de arriba ata la COBERTURA del candado --que las listas no encojan--,
 * y eso deja fuera la mitad que de verdad mide: el CUERPO de las sondas. Una
 * sonda con la familia declarada, su marcador en el cuerpo y la lista intacta
 * puede estar midiendo el lado equivocado o el umbral equivocado, y los ocho
 * casos de arriba seguirian en verde. El gate no tiene navegador, pero estas dos
 * sondas son funciones puras sobre el DOM: se les puede montar el caso en jsdom
 * con `getBoundingClientRect` sobrescrito por elemento y el ancho del viewport
 * declarado a mano, que es exactamente el patron que la regla 44 de `RULES.md`
 * permite (no se mide layout: se le DA el layout a la sonda y se comprueba que
 * saca la conclusion correcta).
 *
 * LO QUE JSDOM NO DA, dicho para que nadie lo confunda con un descuido:
 * `innerText` no existe (la sonda cae a `textContent`, que en estos casos es el
 * mismo texto) y `Range.getClientRects` tampoco, asi que la confirmacion contra
 * las cajas de linea reales se prueba con el prototipo instrumentado -- que es
 * lo unico que se puede hacer sin motor de layout, y sirve porque lo que se
 * verifica es la DECISION de la sonda ante unas cajas de linea dadas, no las
 * cajas.
 */
function medida(el, { left, right, top = 0, height }) {
    const rect = {
        left,
        right,
        top,
        bottom: top + height,
        width: right - left,
        height,
        x: left,
        y: top,
    };
    el.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect });
}

function anchoDeViewport(px) {
    Object.defineProperty(document.documentElement, "clientWidth", {
        configurable: true,
        get: () => px,
    });
}

/** Prototipo de `Range` en jsdom, que no trae `getClientRects`. */
const PROTO_RANGO = Object.getPrototypeOf(document.createRange());

afterEach(() => {
    document.body.innerHTML = "";
    delete document.documentElement.clientWidth;
    delete PROTO_RANGO.getClientRects;
});

describe("la sonda de perdida horizontal mide los DOS lados del viewport", () => {
    it("reporta lo que se sale por la IZQUIERDA, con su lado y su magnitud", () => {
        /*
         * El hueco que cierra este caso: la sonda calculaba `r.right - cw` y
         * nada mas, asi que un elemento centrado que se sale por la izquierda
         * --lo que hace cualquier caja con `margin-inline: auto` mas ancha que
         * su contenedor-- era invisible para el candado. El repo tenia el
         * contraejemplo delante: el `h1` de la 404 al 200 % de texto desbordaba
         * por los dos lados a la vez (left -41,28 / right 361,28) y solo se
         * cerro porque la derecha delataba al mismo elemento.
         */
        anchoDeViewport(320);
        const el = document.createElement("h1");
        el.textContent = "Titulo centrado que se sale por la izquierda";
        document.body.appendChild(el);
        medida(el, { left: -30, right: 300, height: 40 });

        const { perdidos, candidatos } = probePerdidaHorizontal();
        expect(candidatos, "la sonda no llego a mirar el elemento").toBe(1);
        expect(
            perdidos,
            `un elemento con left -30 dentro de un viewport de 320 px pierde 30 px ` +
                `por la izquierda: con la formula de un solo lado (r.right - cw) ` +
                `sale -20 y no se reporta nada`,
        ).toHaveLength(1);
        expect(perdidos[0].sobra).toBe(30);
        expect(perdidos[0].lado).toBe("izquierda");
    });

    it("sigue reportando lo que se sale por la derecha, con el lado dicho", () => {
        anchoDeViewport(320);
        const el = document.createElement("p");
        el.textContent = "Se sale por la derecha";
        document.body.appendChild(el);
        medida(el, { left: 0, right: 362.5, height: 40 });

        const { perdidos } = probePerdidaHorizontal();
        expect(perdidos).toHaveLength(1);
        expect(perdidos[0].sobra).toBe(42.5);
        expect(perdidos[0].lado).toBe("derecha");
    });

    it("no cuenta como perdido lo que un ancestro alcanza con scroll horizontal, tampoco por la izquierda", () => {
        /* La tabla de almacenamiento vive dentro de un `overflow-x: auto` con su
           `role="region"` y su `tabindex`: ahi el contenido se alcanza con el
           dedo, con la rueda y con el teclado, y contarlo como perdido seria
           sancionar un patron correcto. El filtro tiene que valer para los dos
           lados o el lado nuevo llegaria con falsos positivos de nacimiento. */
        anchoDeViewport(320);
        const envoltorio = document.createElement("div");
        envoltorio.style.overflowX = "auto";
        const el = document.createElement("td");
        el.textContent = "Celda dentro de una tabla desplazable";
        envoltorio.appendChild(el);
        document.body.appendChild(envoltorio);
        medida(envoltorio, { left: 0, right: 320, height: 40 });
        medida(el, { left: -30, right: 300, height: 40 });

        const { perdidos, candidatos } = probePerdidaHorizontal();
        expect(candidatos, "la sonda tiene que haber mirado la celda").toBe(1);
        expect(perdidos).toEqual([]);
    });
});

describe("la sonda de legibilidad al 200 % de texto", () => {
    /**
     * EL VIEWPORT SE DECLARA, y desde el 2026-09-05 no es opcional: el segundo
     * factor de la familia compara el ancho de la caja contra
     * `documentElement.clientWidth`, y jsdom devuelve 0 si nadie lo declara. Con
     * 640 px, la caja por defecto de 200 px ocupa el 31 % -- estrecha, como las
     * de los casos que ya existian antes de que el segundo factor entrara.
     */
    beforeEach(() => {
        anchoDeViewport(640);
    });

    /** Los dos umbrales del candado, en la forma que la sonda los recibe. */
    const UMBRALES = {
        minCaracteresPorLinea: MIN_CARACTERES_POR_LINEA,
        maxAnchoRelativo: MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA,
    };

    /** Caja de texto con `line-height` y `font-size` resueltos a mano. */
    function cajaDeTexto(texto, { alto, ancho = 200, lineHeight = "20px" }) {
        const el = document.createElement("p");
        el.textContent = texto;
        el.style.lineHeight = lineHeight;
        el.style.fontSize = "16px";
        document.body.appendChild(el);
        medida(el, { left: 0, right: ancho, height: alto });
        return el;
    }

    it("declara ilegible una caja estrecha de tres lineas con seis caracteres, y legible la de tres con treinta", () => {
        /*
         * Las dos poblaciones del PRIMER factor, en su forma minima. 6/3 = 2 cae
         * dentro de la banda de los defectos medidos (0,9 a 2,7) y 30/3 = 10
         * esta muy por encima del suelo fisico de la tipografia grande (5 a 7).
         * Las dos cajas miden 200 px de 640, el 31 % del viewport, asi que el
         * segundo factor las deja pasar a las dos y lo que decide es la ratio.
         */
        cajaDeTexto("abcdef", { alto: 60 });
        const estrecha = probeLegibilidadDeTexto(UMBRALES);
        expect(estrecha.conTresLineas).toBe(1);
        expect(
            estrecha.ilegibles,
            `6 caracteres en 3 lineas son 2 por linea, por debajo del umbral de ` +
                `${MIN_CARACTERES_POR_LINEA}: la caja tiene que reportarse`,
        ).toHaveLength(1);
        expect(estrecha.ilegibles[0].lineas).toBe(3);
        expect(estrecha.ilegibles[0].caracteres).toBe(6);
        expect(estrecha.ilegibles[0].ratio).toBe(2);
        expect(
            estrecha.ilegibles[0].porcentajeDelViewport,
            "el informe cita el porcentaje del viewport de cada caja: es el segundo factor del veredicto",
        ).toBe(31.3);

        document.body.innerHTML = "";
        cajaDeTexto("abcdefghij".repeat(3), { alto: 60 });
        const holgada = probeLegibilidadDeTexto(UMBRALES);
        expect(holgada.conTresLineas).toBe(1);
        expect(
            holgada.ilegibles,
            "30 caracteres en 3 lineas son 10 por linea: texto normal, no defecto",
        ).toEqual([]);
    });

    it("la MISMA caja troceada se reporta a 100 px de ancho en un documento de 320 y NO a 200 px", () => {
        /*
         * EL SEGUNDO FACTOR, aislado: lo unico que cambia entre las dos mitades
         * de este caso es el ancho de la caja. Seis caracteres en tres lineas
         * son dos por linea en las dos, o sea que el primer factor las senala a
         * las dos; 100 px de 320 son el 31 % y 200 px de 320 el 62,5 %.
         *
         * Quitar el segundo factor de la sonda deja la segunda mitad en rojo.
         */
        anchoDeViewport(320);
        cajaDeTexto("abcdef", { alto: 60, ancho: 100 });
        const angosta = probeLegibilidadDeTexto(UMBRALES);
        expect(
            angosta.ilegibles,
            `una caja de 100 px en un documento de 320 ocupa el 31 % del viewport ` +
                `y parte 6 caracteres en 3 lineas: es el defecto de rellenos que ` +
                `esta familia existe para cazar`,
        ).toHaveLength(1);
        expect(angosta.ilegibles[0].porcentajeDelViewport).toBe(31.3);
        expect(angosta.anchas).toBe(0);

        document.body.innerHTML = "";
        cajaDeTexto("abcdef", { alto: 60, ancho: 200 });
        const ancha = probeLegibilidadDeTexto(UMBRALES);
        expect(
            ancha.conTresLineas,
            "la caja ancha SI llega a evaluarse: es el segundo factor el que la absuelve, no el corte de altura",
        ).toBe(1);
        expect(
            ancha.ilegibles,
            `una caja de 200 px en un documento de 320 ocupa el 62,5 % del ` +
                `viewport: con esa anchura disponible, tres lineas de dos ` +
                `caracteres son fisica de la tipografia, no un defecto de rellenos`,
        ).toEqual([]);
        expect(
            ancha.anchas,
            "la caja absuelta por ancha se cuenta, para que un numero raro se vea en el informe",
        ).toBe(1);
    });

    it("el acento de la nota del deck oscuro no es defecto: 3,4 caracteres por linea en el 55 % del viewport", () => {
        /*
         * LA MEDIDA REAL que obligo al segundo factor, reproducida (build
         * servido de `5bfe092`, tema oscuro, `/`, 320 px de viewport, raiz 32
         * px): `main/span` de 177,61 px con «un nuevo comienzo» -- 17 caracteres
         * en 5 lineas, 3,4 por linea. Por debajo del primer factor y NO es
         * defecto: la nota de cierre pide `clamp(2.5rem, 11vw, 8rem)`, o sea 80
         * px con la raiz a 32, y «comienzo» mide ~336 px a ese cuerpo -- no cabe
         * en NINGUNA columna posible a 320 px. Acotar ese cuerpo con `vw` seria
         * el patron de fallo F94 de WCAG 1.4.4, que exige justo lo contrario:
         * que el texto llegue al 200 %.
         *
         * Este es el caso que cae si alguien SUBE el umbral relativo: con 0,9,
         * el 55,5 % vuelve a contarse y el candado pide acotar la tipografia.
         */
        anchoDeViewport(320);
        cajaDeTexto("un nuevo comienzo", { alto: 100, ancho: 177.61 });
        const r = probeLegibilidadDeTexto(UMBRALES);
        expect(
            r.conTresLineas,
            "la caja llega a evaluarse: 100 px de alto entre 20 de linea son 5 lineas",
        ).toBe(1);
        expect(
            r.ilegibles,
            `17 caracteres en 5 lineas son 3,4 por linea, por debajo del primer ` +
                `factor, pero la caja ocupa el 55,5 % del viewport: es el suelo ` +
                `fisico de una tipografia que WCAG 1.4.4 exige que crezca, no un ` +
                `defecto de rellenos`,
        ).toEqual([]);
        expect(r.anchas).toBe(1);
    });

    it("no mide texto vertical, donde 'caracteres por linea' no significa lo mismo", () => {
        const el = cajaDeTexto("abcdef", { alto: 60 });
        el.style.writingMode = "vertical-rl";
        const r = probeLegibilidadDeTexto(UMBRALES);
        expect(r.examinadas, "una caja vertical no se examina").toBe(0);
        expect(r.conTresLineas).toBe(0);
        expect(r.ilegibles).toEqual([]);
    });

    it("una caja estirada al alto de su fila no cuenta como texto ilegible", () => {
        /*
         * El falso positivo que la medicion del 2026-09-05 encontro y que la
         * confirmacion con las cajas de linea reales deshace: en `/privacidad`
         * con la raiz a 32 px las cuatro celdas de una fila daban las cuatro
         * `alto = 391,88 px` (9 lineas por el proxy) mientras su texto ocupaba
         * 2, 3, 4 y 2 lineas. Es la fila la que es alta, no el texto el que es
         * estrecho.
         *
         * Es un absolvedor DISTINTO del segundo factor y se cuenta aparte: aqui
         * la caja es estrecha de verdad (200 px de 640, el 31 %) y lo que sobra
         * es el alto.
         */
        cajaDeTexto("Tema (claro / oscuro)", { alto: 180 });
        const sinConfirmar = probeLegibilidadDeTexto(UMBRALES);
        expect(
            sinConfirmar.ilegibles,
            "con el proxy solo, 21 caracteres en 9 lineas son 2,33 por linea",
        ).toHaveLength(1);
        expect(sinConfirmar.ilegibles[0].lineas).toBe(9);
        expect(sinConfirmar.anchas).toBe(0);

        /* Las cajas de linea que el texto renderiza de verdad: dos. */
        PROTO_RANGO.getClientRects = () => [
            { top: 0, width: 180, height: 20 },
            { top: 20, width: 60, height: 20 },
        ];
        const confirmada = probeLegibilidadDeTexto(UMBRALES);
        expect(
            confirmada.ilegibles,
            `el texto ocupa 2 lineas reales de las 9 que mide la caja: 21 ` +
                `caracteres en 2 lineas son 10,5 por linea y no hay defecto`,
        ).toEqual([]);
        expect(
            confirmada.estiradas,
            "la caja descartada tiene que contarse, para que un numero raro se vea en el informe",
        ).toBe(1);
    });

    it("la confirmacion no salva una caja que de verdad es estrecha", () => {
        /* La otra direccion, que es la que importa: en las trece cajas que la
           portada declara ilegibles a 320 px los dos instrumentos dan el MISMO
           numero (11/11, 19/19, 23/23...), porque ahi la caja ceñia el texto.
           Una confirmacion que rebajara tambien esas seria una puerta trasera. */
        cajaDeTexto("Escríbeme", { alto: 180, ancho: 58.83 });
        PROTO_RANGO.getClientRects = () =>
            Array.from({ length: 9 }, (_, i) => ({
                top: i * 20,
                width: 58.83,
                height: 20,
            }));
        const r = probeLegibilidadDeTexto(UMBRALES);
        expect(r.ilegibles).toHaveLength(1);
        expect(r.ilegibles[0].lineas).toBe(9);
        expect(r.ilegibles[0].caracteres).toBe(9);
        expect(r.estiradas).toBe(0);
    });

    it("sin ancho de documento la caja se reporta igual: el segundo factor no se puede evaluar", () => {
        /*
         * La direccion conservadora, declarada. `clientWidth` a cero es un
         * instrumento roto, no una pagina limpia: absolver por no poder medir
         * vaciaria la familia entera en silencio en cuanto la sonda perdiera el
         * ancho del documento. En navegador `clientWidth` nunca es cero.
         */
        delete document.documentElement.clientWidth;
        cajaDeTexto("abcdef", { alto: 60 });
        const r = probeLegibilidadDeTexto(UMBRALES);
        expect(r.anchoDelDocumento).toBe(0);
        expect(
            r.ilegibles,
            "sin ancho de documento el segundo factor no absuelve a nadie",
        ).toHaveLength(1);
        expect(r.ilegibles[0].porcentajeDelViewport).toBeNull();
        expect(r.anchas).toBe(0);
    });

    it("las guardas de vacuidad cuentan lo que tienen que contar, y el script las convierte en rojo", () => {
        /*
         * Las dos formas de que esta familia salga verde sin haber medido nada:
         * que el filtro no encuentre una sola caja con texto, o que ninguna
         * llegue a tres lineas. La sonda las distingue con dos contadores
         * separados, y el script pone cada cero en rojo por su lado -- que es
         * el mismo patron que ya tenia su familia hermana con `candidatos`.
         */
        const vacio = probeLegibilidadDeTexto(UMBRALES);
        expect(vacio.examinadas).toBe(0);
        expect(vacio.conTresLineas).toBe(0);

        cajaDeTexto("abcdef", { alto: 40 });
        const dosLineas = probeLegibilidadDeTexto(UMBRALES);
        expect(
            dosLineas.examinadas,
            "una caja de dos lineas SI se examina: es el segundo contador el que la deja fuera",
        ).toBe(1);
        expect(dosLineas.conTresLineas).toBe(0);

        for (const guarda of [
            "la sonda de legibilidad no examino ni una sola caja con texto",
            "la sonda de legibilidad no encontro ni una sola caja de tres o mas lineas",
        ]) {
            expect(
                SCRIPT,
                `el script ya no convierte en rojo la guarda de vacuidad "${guarda}": ` +
                    `sin ella un cero en el contador pasaria por pagina limpia`,
            ).toContain(guarda);
        }
    });
});

/*
 * LA SONDA DE CRECIMIENTO Y SU VEREDICTO, EJERCITADOS EN JSDOM.
 *
 * La familia `texto-crece-con-la-preferencia` mide una DIFERENCIA entre dos
 * montajes de navegador, y eso no cabe en el gate. Lo que si cabe --y es donde
 * de verdad se decide-- son las dos funciones puras que dan el veredicto:
 * `comparaCrecimiento`, que empareja las cajas de las dos medidas y aplica el
 * minimo, y `fallosDeCrecimientoEnLaBanda`, que decide que una caja solo esta
 * rota si no crece en NINGUNA anchura de la banda. La sonda se ejercita con
 * rects y estilos simulados, igual que sus dos hermanas, y las medidas se le
 * pasan a las funciones puras tal cual salen de ella.
 */
describe("la sonda de crecimiento del texto con la preferencia de tamano", () => {
    beforeEach(() => {
        anchoDeViewport(640);
        document.body.style.fontSize = "16px";
    });

    /** Caja con `font-size` resuelto a mano y rect declarado. */
    function cajaConFuente(texto, { fontSize, ancho = 200, alto = 40 }) {
        const el = document.createElement("p");
        el.textContent = texto;
        el.style.fontSize = fontSize;
        document.body.appendChild(el);
        medida(el, { left: 0, right: ancho, height: alto });
        return el;
    }

    /** Una medida sintetica con la forma que devuelve la sonda. */
    function medidaSintetica(controlFontPx, cajas) {
        return {
            rootFontPx: controlFontPx,
            controlFontPx,
            cajas: cajas.map((c) => ({
                clave: `body>p:nth-child(1)||${c.texto}`,
                zona: "main",
                tag: "p",
                sel: "body>p:nth-child(1)",
                texto: c.texto,
                fontPx: c.fontPx,
            })),
        };
    }

    it("una caja que dobla pasa y una que se queda igual falla, con los dos tamanos en el resultado", () => {
        /*
         * Las dos poblaciones de la familia, en su forma minima. x2.00 es lo que
         * hace todo lo que se pide en `rem`; x1.00 es el patron de fallo F94
         * medido en el hero (34 -> 34 px con la raiz de 16 a 32).
         */
        cajaConFuente("crece con la raiz", { fontSize: "16px" });
        cajaConFuente("no se mueve", { fontSize: "24px" });
        const base = probeCrecimientoDeTexto();
        expect(base.cajas).toHaveLength(2);
        expect(base.controlFontPx).toBe(16);

        document.body.style.fontSize = "32px";
        document.body.children[0].style.fontSize = "32px";
        document.body.children[1].style.fontSize = "24px";
        const zoom = probeCrecimientoDeTexto();

        const r = comparaCrecimiento({
            base,
            zoom,
            ratioMinimo: RATIO_MINIMO_DE_CRECIMIENTO,
        });
        expect(
            r.comparadas,
            "las dos cajas existen en las dos medidas: las dos se comparan",
        ).toHaveLength(2);
        expect(
            r.controlDobla,
            "el cuerpo pasa de 16 a 32 px: la emulacion llego",
        ).toBe(true);
        expect(
            r.flojas.map((f) => f.texto),
            `una caja que pasa de 24 a 24 px no crece (x1.00) y tiene que ` +
                `reportarse; la que pasa de 16 a 32 (x2.00) no`,
        ).toEqual(["no se mueve"]);
        expect(r.flojas[0].basePx).toBe(24);
        expect(r.flojas[0].zoomPx).toBe(24);
        expect(r.flojas[0].ratio).toBe(1);
        expect(
            r.flojas[0].sel,
            "el mensaje necesita el selector para que el defecto se pueda encontrar",
        ).toContain("body>");
    });

    it("si la caja de control no dobla, el fallo es del instrumento y no del sitio", () => {
        /*
         * LA GUARDA QUE DISTINGUE LAS DOS COSAS. Sin ella, una corrida en la que
         * `Page.setFontSizes` no llega a la pagina --version de Chrome sin el
         * comando, sesion de CDP caida, un `html { font-size: 16px }` que fije la
         * raiz-- mide dos veces lo mismo, TODAS las cajas dan x1.00 y el informe
         * acusa al sitio de un defecto del aparato. El cuerpo tiene
         * `font-size: 1rem`, asi que dobla siempre que la preferencia llegue.
         */
        cajaConFuente("da igual lo que ponga", { fontSize: "16px" });
        const base = probeCrecimientoDeTexto();
        const zoom = probeCrecimientoDeTexto();
        const r = comparaCrecimiento({
            base,
            zoom,
            ratioMinimo: RATIO_MINIMO_DE_CRECIMIENTO,
        });
        expect(
            r.controlDobla,
            `el cuerpo se quedo en ${r.controlZoomPx} px: la emulacion no llego y ` +
                `el x${r.flojas[0]?.ratio} de la caja no dice nada del sitio`,
        ).toBe(false);
        expect(r.controlRatio).toBe(1);
        expect(
            r.flojas,
            "sin emulacion TODAS las cajas parecen rotas: por eso el control se mira aparte",
        ).toHaveLength(1);

        /* Y el script convierte esa guarda en rojo, que es lo que la vuelve un
           candado en vez de un dato del informe. */
        for (const guarda of [
            "la caja de control (el cuerpo) no dobla con la preferencia de tamano de texto",
            "la sonda de crecimiento no pudo comparar ni una sola caja",
        ]) {
            expect(
                SCRIPT,
                `el script ya no convierte en rojo la guarda "${guarda}": sin ella ` +
                    `una corrida sin emulacion pasaria por defecto del sitio, o un ` +
                    `emparejamiento roto por pagina limpia`,
            ).toContain(guarda);
        }
    });

    it("empareja por ruta estructural y texto, no por posicion, y no mira las cajas de 1x1 px", () => {
        /*
         * POR QUE NO POR INDICE, con el caso que lo rompe: la caja «alfa» deja de
         * medirse en la segunda pasada --queda en 1x1 px, que es la caja de
         * `VisuallyHidden`-- asi que las dos listas tienen distinta longitud.
         * Emparejando por posicion, «beta» (20 px) se compararia con «alfa» (10
         * px) y saldria x2.00: el defecto real desapareceria del informe.
         * Emparejando por clave, «beta» se compara consigo misma y da x1.00.
         */
        const alfa = cajaConFuente("alfa", { fontSize: "10px" });
        cajaConFuente("beta", { fontSize: "20px" });
        const base = probeCrecimientoDeTexto();
        expect(base.cajas.map((c) => c.texto)).toEqual(["alfa", "beta"]);

        document.body.style.fontSize = "32px";
        medida(alfa, { left: 0, right: 1, height: 1 });
        const zoom = probeCrecimientoDeTexto();
        expect(
            zoom.cajas.map((c) => c.texto),
            "una caja de 1x1 px es la de VisuallyHidden: existe para los lectores de pantalla y no se mide",
        ).toEqual(["beta"]);

        const r = comparaCrecimiento({
            base,
            zoom,
            ratioMinimo: RATIO_MINIMO_DE_CRECIMIENTO,
        });
        expect(r.comparadas).toHaveLength(1);
        expect(
            r.flojas.map((f) => `${f.texto} ${f.basePx}->${f.zoomPx}`),
            `emparejadas por posicion, beta (20 px) se compararia con alfa (10 px) ` +
                `y el x2.00 resultante taparia el defecto`,
        ).toEqual(["beta 20->20"]);
    });

    it("una caja que crece en un ancho de la banda y no en el otro queda absuelta; la que no crece en ninguno se reporta", () => {
        /*
         * LA MEDIDA REAL que obligo a la absolucion por ancho (2026-09-05, build
         * servido de `dcafec4`, tema oscuro, `/`): la etiqueta de paso del deck
         * de Journey se pide como `clamp(1.75rem, 10vw, 11rem)` y crece 32 -> 56
         * px a 320 (x1.75) pero solo 39 -> 56 a 390 (x1.44), porque a 390 el
         * termino en `vw` ya dominaba al suelo con la raiz de fabrica. El texto
         * crece --que es lo que WCAG 1.4.4 exige-- y reportarla seria pedir que
         * se acote una tipografia fluida correcta, o sea el F94 al reves.
         *
         * El `h1` del hero, en cambio, se queda en 34 px en los DOS anchos.
         */
        const comparacionEn = (width, journeyBase, journeyZoom) => ({
            width,
            comparacion: comparaCrecimiento({
                base: medidaSintetica(16, [
                    { texto: "Descubre", fontPx: journeyBase },
                    { texto: "Void", fontPx: 34 },
                ]),
                zoom: medidaSintetica(32, [
                    { texto: "Descubre", fontPx: journeyZoom },
                    { texto: "Void", fontPx: 34 },
                ]),
                ratioMinimo: RATIO_MINIMO_DE_CRECIMIENTO,
            }),
        });

        const banda = [comparacionEn(320, 32, 56), comparacionEn(390, 39, 56)];
        expect(
            banda[0].comparacion.flojas.map((f) => f.texto),
            "a 320 px la etiqueta de Journey crece x1.75: solo el hero cae",
        ).toEqual(["Void"]);
        expect(
            banda[1].comparacion.flojas.map((f) => f.texto).sort(),
            "a 390 px la etiqueta cae tambien, con x1.44",
        ).toEqual(["Descubre", "Void"]);

        const r = fallosDeCrecimientoEnLaBanda(banda);
        expect(r.comparadas).toBe(2);
        expect(
            r.sinCrecimiento.map((c) => c.medidas[0].texto),
            `la etiqueta de Journey crece en un ancho de la banda: el texto PUEDE ` +
                `crecer y no es F94. El h1 del hero no crece en ninguno`,
        ).toEqual(["Void"]);
        expect(
            r.absueltas,
            "la caja absuelta se cuenta, para que un numero raro se vea en el informe",
        ).toBe(1);
        expect(
            r.sinCrecimiento[0].medidas.map((m) => m.width),
            "el mensaje cita la caja en los dos anchos en los que fallo",
        ).toEqual([320, 390]);
    });

    it("sin ninguna caja emparejada el veredicto no dice que todo este bien", () => {
        /* La guarda de vacuidad, sobre la funcion pura: con las dos listas
           vacias no hay flojas, y eso NO puede leerse como "el sitio crece". El
           script mira `comparadas` y lo pone en rojo. */
        const r = fallosDeCrecimientoEnLaBanda([
            {
                width: 320,
                comparacion: comparaCrecimiento({
                    base: medidaSintetica(16, []),
                    zoom: medidaSintetica(32, []),
                    ratioMinimo: RATIO_MINIMO_DE_CRECIMIENTO,
                }),
            },
        ]);
        expect(r.comparadas).toBe(0);
        expect(r.sinCrecimiento).toEqual([]);
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
