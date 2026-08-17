"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import styled from "styled-components";
import { Aura } from "@/components/scenes/aura/Aura";
import { Eye } from "@/components/scenes/eye/Eye";
import { useTheme } from "@/theme/ThemeProvider";
import { readResolvedTheme } from "@/theme/resolveTheme";
import type { ThemeName } from "@/theme/themes";
import {
  HERO_BACKDROP_HOLD_MS,
  HERO_DECODE_TIMEOUT_MS,
  HERO_HANDOFF_MS,
} from "./hero.transition";

type StackName = "eye" | "aura";
type StackPhase = "pending" | "active" | "leaving";
type Stacks = Partial<Record<StackName, StackPhase>>;

interface PendingEntry {
  readonly entering: StackName;
  readonly leaving: StackName;
  /*
   * `true` cuando este montaje "pending" pertenece a un cambio de tema de
   * USUARIO (spec S7.3): al resolver decode(), el efecto de la carrera de
   * mas abajo NO puede pasar el stack a "active" por su cuenta -- tiene que
   * esperar TAMBIEN al reloj del relevo (HERO_HANDOFF_MS, temporizador
   * propio del efecto de deteccion de cambio de tema). `false` para la
   * carga (montaje inicial o ajuste de hidratacion, spec S7.2): ahi decode()
   * es la UNICA condicion, no hay ningun stack saliente VISIBLE del que
   * despedirse ni ningun relevo que coordinar.
   */
  readonly needsHandoff: boolean;
}

// Luz -> Aura (fondo pastel), oscuro -> el ojo cosmico: la unica correspondencia
// que existe en todo el archivo, todo lo demas trabaja con "StackName" a secas.
function stackFor(themeName: ThemeName): StackName {
  return themeName === "light" ? "aura" : "eye";
}

function otherStack(stack: StackName): StackName {
  return stack === "aura" ? "eye" : "aura";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/*
 * Un frame de margen tras decodificar, para que el navegador ya haya pintado
 * el frame 0 del stack entrante antes de arrancar el stagger (spec S6.1).
 *
 * En CARRERA contra un temporizador, por el mismo motivo que decode(): en una
 * pestana oculta (document.hidden) el navegador NO dispara
 * requestAnimationFrame, asi que esta promesa no se resuelve nunca y el cruce
 * se queda colgado en "pending" -- el stack entrante invisible y el saliente
 * todavia a la vista. Medido en este entorno, que corre con la pestana oculta
 * de forma permanente: con rAF a secas, el fondo se quedaba en "pending"
 * indefinidamente mientras la copia si completaba su cruce.
 *
 * El margen de un frame es una MEJORA de alineacion, no una condicion de
 * correccion: si no llega a tiempo, arrancar sin el produce exactamente el
 * mismo estado final. Perderlo es aceptable; colgarse no.
 */
const NEXT_FRAME_TIMEOUT_MS = 50;

function nextFrame(): Promise<void> {
  return Promise.race([
    new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    }),
    wait(NEXT_FRAME_TIMEOUT_MS),
  ]);
}

/*
 * Envoltorio del cruce: ocupa el hero entero, en el mismo lugar donde hoy
 * vive <ScEye/> en Hero.tsx (tarea C2 sustituye esa composicion por esta).
 * z-index: base, el mismo valor que ScEye ya declara -- este componente
 * asume ese rol, no anade una capa nueva por encima.
 */
const ScBackdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${({ theme }) => theme.data.zIndex.base};
`;

/*
 * Envoltorio del ojo: SOLO posicionamiento, igual que ScAuraStack (spec
 * S6.4) -- ya NO anima su propia opacidad. ANTES de esta revision (2026-07-27)
 * si lo hacia, y de forma UNIFORME, sin retardo por capa -- el motivo se deja
 * documentado aqui porque explica una restriccion real del CSS, no una
 * eleccion de estilo:
 *
 * ScLayer (eye.parts.tsx) YA animaba `opacity` con @keyframes
 * (glowStrong/glowSoft, la respiracion de la corona), y una `transition` CSS
 * sobre la MISMA propiedad del MISMO elemento que otra `@keyframes` NO llega
 * a existir -- no es que pierda la carrera contra la animacion, el navegador
 * ni siquiera la crea (medido: `getAnimations()` devolvia solo la
 * CSSAnimation, ver task/lessons.md 2026-07-26). Un `transition-delay` por
 * capa en el ojo habria sido codigo muerto sin ningun error que lo delatara,
 * asi que el fundido de TODO el stack vivia aqui, en el UNICO elemento del
 * ojo que no competia con ninguna animacion propia -- de ahi el fundido
 * uniforme: este envoltorio no sabia nada de capas individuales, solo podia
 * atenuar el conjunto entero a la vez.
 *
 * Esa restriccion se RESOLVIO, no se rodeo: `eyeStagger()` (eye.parts.tsx)
 * declara el escalonado de cada capa como ANIMACION -- no como transicion --
 * con la animacion del escalonado SIEMPRE la ULTIMA de la lista
 * `animation-name`. Medido en Chromium (reloj conducido a mano via
 * `Animation.currentTime`, spec S6.1 de la revision 2026-07-27, docblock de
 * `eyeStagger`): dos animaciones CSS sobre la misma propiedad del mismo
 * elemento SI conviven, y gana la ULTIMA de la lista -- asi que el glow
 * sigue respirando encima del escalonado sin que ninguna de las dos se pise.
 * Por eso el fundido bajo de este envoltorio a las capas: cada una escalona
 * su propia opacidad, con su propio retardo, exactamente como ya hacia
 * ScAuraStack con las capas de Aura (por `transition`, no por `animation`,
 * porque Aura no tiene ningun glow con el que competir).
 *
 * El atributo data-state sigue viviendo en ESTE MISMO elemento (lo escribe
 * HeroBackdrop mas abajo); las piezas del ojo lo leen con el selector
 * DESCENDIENTE [data-state="..."] &, no calificado -- lo mismo que ya hacia
 * aura.parts.tsx con ScAuraStack.
 */
const ScEyeStack = styled.div`
  position: absolute;
  inset: 0;

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Envoltorio de Aura: SOLO posicionamiento, sin animar su propia opacidad.
 * El escalonado lo llevan las capas internas de Aura (aura.parts.tsx), que
 * leen data-state a traves de ESTE elemento via el selector DESCENDIENTE
 * [data-state="..."] & -- si este envoltorio TAMBIEN animara su opacidad, el
 * efecto compuesto seria el producto de las dos transiciones y la
 * coreografia se aplanaria en un unico fundido blando (spec S6.2.1, mismo
 * razonamiento que ScAuraSubject en aura.parts.tsx, y el mismo que ahora
 * aplica tambien a ScEyeStack, ver su comentario arriba).
 */
const ScAuraStack = styled.div`
  position: absolute;
  inset: 0;

  @media (forced-colors: active) {
    display: none;
  }
`;

/**
 * Orquesta el fondo del hero: las dos composiciones, Aura (tema claro) y el
 * ojo cosmico (tema oscuro), montadas sobre la misma maquina de tres fases
 * por stack (`pending -> active -> leaving`) que ahora sirve a DOS
 * coreografias distintas (revision 2026-07-27, spec S7.2-S7.3):
 *
 * - **CARGA** (montaje inicial, y su ajuste de hidratacion): el stack que
 *   corresponde al tema arranca en "pending", corre la carrera de
 *   `img.decode()` contra `HERO_DECODE_TIMEOUT_MS` (mas el frame de margen
 *   de `nextFrame()`), y al resolver pasa a "active" -- lo que dispara su
 *   propio escalonado de entrada, por capa (eye.parts.tsx/aura.parts.tsx).
 *   No es una maquina nueva: reutiliza `pendingEntry` y el mismo efecto de
 *   carrera que el cambio de tema (spec S7.2) -- la diferencia es que el
 *   stack saliente, sencillamente, no existe.
 *
 *   RETIRADO 2026-08-11 (Task 27, plan premium, spec S5.6): hasta esta
 *   revision, al resolver tambien avisaba UNA sola vez a
 *   `markBackdropRevealed()` (`useStage()`) para que el navbar y la copia
 *   del hero arrancaran la suya. Se retira sin cambiar el decode-gating de
 *   arriba ni una linea: desde la Task 10 ninguno de los dos leia ya ese
 *   aviso (su entrada es CSS estatico), asi que `useStage()`/
 *   `StageProvider` se habian quedado sin ningun consumidor real.
 * - **CAMBIO DE TEMA** (de usuario): un RELEVO SECUENCIAL, no un cruce
 *   solapado (spec S3 explica el porque: el `field` opaco de Aura entrando
 *   por encima del ojo saliente taparia sus ultimos escalones antes de que
 *   llegaran a apagarse, y la salida que pide el brief dejaria de verse). El
 *   entrante se monta en "pending" en el instante del click; el saliente
 *   sigue "active" hasta `HERO_BACKDROP_HOLD_MS` (cuando la copia, que se
 *   apaga en t=0, ya no esta en pantalla) y entonces pasa a "leaving",
 *   colapsando durante `HERO_STACK_MS` -- exactamente el intervalo hasta
 *   `HERO_HANDOFF_MS`. El decode() del entrante corre EN PARALELO con ese
 *   colapso. El entrante solo pasa a "active" -- momento en el que el
 *   saliente se DESMONTA -- cuando se cumplen las DOS condiciones: el reloj
 *   (`HERO_HANDOFF_MS`) Y el decode(); el MAXIMO de los dos, nunca solo uno
 *   (`clockReadyRef`/`decodeReadyRef`, mas abajo).
 *
 * El token de ejecucion (`tokenRef`), la limpieza de TODOS los
 * temporizadores en cada cambio de tema real y al desmontar, y el
 * desmontaje/reactivacion nunca atados a `transitionend`/`animationend`
 * (bajo `reduce` esos eventos no llegan a dispararse, task/lessons.md
 * 2026-07-26) se conservan integros de la revision anterior y cubren
 * tambien los dos temporizadores nuevos del relevo.
 *
 * Aura se monta SIEMPRE despues del ojo en el arbol: su capa `field` es
 * opaca, asi que es ella la que tiene que quedar encima para resolver el
 * cambio de lienzo sin animar background-color, y eso vale en los dos
 * sentidos del relevo -- por eso el orden de montaje en el JSX no depende de
 * cual es el entrante.
 *
 * ## Por que el HTML estatico no trae arte (2026-08-17)
 *
 * Hasta esta revision, los dos `useState` de mas abajo sembraban el stack
 * durante el RENDER, leyendo `themeName`. Bajo `output: "export"` eso tiene
 * una consecuencia que no es de estilo sino de bytes: `ThemeProvider` no
 * puede leer `localStorage` durante el render, asi que `themeName` vale
 * SIEMPRE "light" en el primer paso, asi que el HTML horneado por el build
 * traia SIEMPRE los cuatro `<img>` de Aura -- y el Float de React 19
 * hoisteaba ademas sus cuatro `<link rel="preload">` al `<head>`.
 *
 * El visitante oscuro pagaba esas nueve peticiones enteras. Medido contra el
 * build de produccion a 1280x720, contexto nuevo por tema, sumando
 * `encodedBodySize` de `performance.getEntriesByType("resource")`:
 *
 *   claro    28 peticiones    759.854 B
 *   oscuro   44 peticiones  2.354.922 B   de los cuales 309.276 B de arte
 *                                         claro que no vera nunca (13,1 %)
 *
 * Ahora el render no monta ningun stack -- ni en servidor ni en el primer
 * render de cliente -- y lo siembra el efecto de montaje con el tema ya
 * resuelto (ver su comentario). El HTML estatico deja de pedir arte, y quien
 * lo pide es el script de arranque del `<head>`, que precarga la rama
 * correcta y solo esa (`buildThemeBootstrapScript`, ahora con un registro por
 * tema en vez de solo el oscuro).
 *
 * LO QUE SE PIERDE, declarado: sin JavaScript ya no hay arte de fondo en el
 * hero. Es una perdida aceptada y acotada -- toda esta composicion es
 * `aria-hidden="true"` con `alt=""`, no comunica nada que no este ya en el
 * `<h1>` y la copia, que siguen viajando en el HTML estatico; el hero
 * conserva el color de fondo del tema por CSS, asi que la copia sigue
 * legible. No se anade respaldo `<noscript>`: las capas son elementos de
 * styled-components, y sin renderizarlas en servidor su CSS tampoco se emite,
 * de modo que un `<noscript>` entregaria imagenes sin encuadre ni
 * posicionamiento -- peor que no entregar ninguna.
 */
export function HeroBackdrop(): ReactElement {
  const { themeName, changeSource } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  // Carga (spec S7.2): NINGUN stack se monta durante el render -- ni en
  // servidor ni en el primer render de cliente. Los siembra el efecto de
  // montaje de mas abajo, con el tema YA RESUELTO. Ver el docblock del
  // componente, seccion "por que el HTML estatico no trae arte", para el
  // porque y los bytes que eso ahorra.
  const [stacks, setStacks] = useState<Stacks>({});
  const [pendingEntry, setPendingEntry] = useState<PendingEntry | null>(null);

  const stacksRef = useRef(stacks);
  // Sincroniza DESPUES de cada render (sin dependencias), mismo patron que
  // useParallaxLayers.ts: leer `stacks` directamente en el efecto de abajo
  // obligaria a declararlo como dependencia y reprogramaria el efecto en
  // cada cruce, aunque el tema no hubiera cambiado de verdad.
  useEffect(() => {
    stacksRef.current = stacks;
  });

  const prevThemeRef = useRef(themeName);
  const tokenRef = useRef(0);

  /*
   * Siembra el stack de la CARGA, ya en cliente y con el tema RESUELTO.
   *
   * `readResolvedTheme()` y no `themeName`: en el instante en que este efecto
   * corre, `themeName` todavia vale "light" para TODO EL MUNDO -- el efecto de
   * correccion de `ThemeProvider` es un efecto del PADRE, y React ejecuta los
   * de los hijos primero. Sembrar desde `themeName` montaria Aura durante un
   * commit en un visitante oscuro, y un commit basta: el navegador arranca la
   * peticion de los cuatro <img> en cuanto los ve en el DOM, aunque React los
   * retire en el tick siguiente. El atributo `data-theme`, en cambio, lo dejo
   * escrito el script de arranque antes del primer pintado.
   *
   * NO se toca `prevThemeRef`, y el primer intento SI lo tocaba: adelantarlo
   * al tema del atributo parecia un ahorro (asi la correccion de
   * `ThemeProvider` se leeria como "sin cambio" y no relanzaria la carrera de
   * decode() que este efecto acaba de arrancar). Es un error, y lo cazo su
   * propio candado: el efecto de deteccion tambien corre en el MONTAJE, y con
   * `prevThemeRef` ya en "dark" mientras `themeName` sigue en "light" su
   * primera linea deja de cortar -- entra por el camino de hidratacion,
   * calcula `entering = "aura"` y pisa la siembra con un `setStacks` posterior
   * en el mismo lote. Resultado: se monta Aura igual, que es EXACTAMENTE el
   * defecto que este cambio existe para cerrar. Con `prevThemeRef` intacto, el
   * efecto de deteccion sale en el montaje (light === light) y la correccion
   * posterior de `ThemeProvider` entra por el camino de hidratacion de
   * siempre, que sustituye el pendiente por el MISMO stack: una carrera de
   * decode() de mas, ningun `<img>` de la rama equivocada.
   *
   * El fallback a `themeName` cubre el unico caso en el que el atributo no
   * existe: que el script de arranque haya lanzado (almacenamiento bloqueado)
   * y su try/catch lo haya absorbido. Ahi el HTML estatico ya es el claro por
   * definicion, asi que sembrar "light" es exactamente lo correcto -- y si el
   * storage decia otra cosa, la correccion de `ThemeProvider` SI se vera como
   * un cambio real y el camino de hidratacion de siempre se encarga.
   */
  useEffect(() => {
    const entering = stackFor(readResolvedTheme() ?? themeName);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- siembra de montaje: corre UNA vez, no en cada render
    setStacks({ [entering]: "pending" });
    setPendingEntry({
      entering,
      leaving: otherStack(entering),
      needsHandoff: false,
    });
    // Deps vacias a proposito: es la siembra del MONTAJE. `themeName` se lee
    // aqui solo como respaldo del atributo y no debe reprogramar el efecto --
    // los cambios posteriores de tema son trabajo del efecto de deteccion.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver arriba
  }, []);

  // Las dos condiciones del relevo secuencial de un cambio de tema (spec
  // S7.3): el reloj (HERO_HANDOFF_MS, temporizador propio) y el decode() del
  // stack entrante (efecto de la carrera, mas abajo). El entrante solo pasa
  // a "active" cuando las DOS son ciertas -- el MAXIMO de los dos, nunca
  // antes. Se reinician a `false` al arrancar cada cruce nuevo (nunca en la
  // reversion ni en la carga, que no los usan).
  const clockReadyRef = useRef(false);
  const decodeReadyRef = useRef(false);

  // Los dos temporizadores propios del relevo secuencial. El antiguo
  // "settleTimeoutRef" (que desmontaba el saliente despues de la duracion
  // completa del escalonado de un stack, HERO_STACK_MS, tras activar el
  // entrante) ya no existe: en el diseño secuencial el saliente se desmonta
  // en el MISMO tick en que el entrante pasa a "active" (`finalizeHandoff`),
  // sin ningun temporizador de gracia adicional -- ver su docblock para el
  // porque.
  const holdTimeoutRef = useRef<number | null>(null);
  const handoffTimeoutRef = useRef<number | null>(null);

  /*
   * Cierra el tramo de la CARGA (montaje inicial o ajuste de hidratacion,
   * spec S7.2): pasa el stack ENTRANTE a "active" -- lo que dispara su
   * propio escalonado de entrada, por capa.
   *
   * Tolera que `leaving` no exista en `stacks` (`prev[leaving] !==
   * undefined`): en la carga nunca hay un segundo stack VISIBLE que apagar,
   * ni en el montaje inicial (el unico stack montado es el propio
   * `entering`) ni en el ajuste de hidratacion (el pending viejo ya se
   * sustituyo por completo antes de que este cierre llegue a ejecutarse, ver
   * la rama `changeSource !== "user"` del efecto de deteccion, mas abajo).
   * Se conserva la misma tolerancia que ya tenia el antiguo
   * `finishCrossfade` de esta funcion, por si un llamador futuro SI pasa un
   * `leaving` realmente montado.
   *
   * RETIRADO 2026-08-11 (Task 27, spec S5.6): hasta esta revision, tras
   * pasar el stack a "active" avisaba UNA vez a `markBackdropRevealed()`
   * (guardado con `revealedRef`, tambien retirado) para que el navbar y la
   * copia arrancaran su propia entrada. Ninguno de los dos leia ya ese
   * aviso desde la Task 10 (su entrada es CSS estatico), asi que la llamada
   * se retira sin efecto observable, junto con `useStage()`/
   * `StageProvider` enteros.
   *
   * `useCallback` con `[]`: sin la notificacion, esta funcion ya no cierra
   * sobre ningun valor reactivo (`tokenRef` es un ref, estable por garantia
   * de React) -- su identidad sigue siendo estable para siempre, igual que
   * antes, pero ya no hace falta declarar ninguna dependencia real.
   */
  const finishLoad = useCallback(
    (entering: StackName, leaving: StackName, myToken: number): void => {
      if (tokenRef.current !== myToken) return;
      setStacks((prev) => {
        const next: Stacks = { ...prev, [entering]: "active" };
        if (prev[leaving] !== undefined) next[leaving] = "leaving";
        return next;
      });
    },
    [],
  );

  /*
   * Cierra el relevo secuencial de un cambio de tema de usuario (spec S3,
   * S7.3): en el MISMO tick pasa el entrante a "active" -- dispara su
   * floracion -- y DESMONTA el saliente. Sin temporizador de gracia (a
   * diferencia del antiguo `finishCrossfade`): para cuando esto se llama, el
   * saliente ya lleva colapsando desde `HERO_BACKDROP_HOLD_MS` y su propio
   * escalonado de salida (por capa, con `fill: forwards`) ya termino de
   * asentarse -- el reloj que programa la llamada a esta funcion
   * (`HERO_HANDOFF_MS = HERO_BACKDROP_HOLD_MS + HERO_STACK_MS`) ES
   * exactamente la duracion de ese colapso, asi que no hay nada mas que
   * esperar.
   */
  const finalizeHandoff = (
    entering: StackName,
    leaving: StackName,
    myToken: number,
  ): void => {
    if (tokenRef.current !== myToken) return;
    setStacks((prev) => {
      const next: Stacks = { ...prev, [entering]: "active" };
      delete next[leaving];
      return next;
    });
  };

  // Detecta un cambio de tema real (nunca el mount) y decide como
  // reaccionar: ajuste de hidratacion, reversion a mitad de un relevo, o
  // relevo secuencial nuevo.
  useEffect(() => {
    if (prevThemeRef.current === themeName) return;
    prevThemeRef.current = themeName;

    const entering = stackFor(themeName);
    const leaving = otherStack(entering);

    /*
     * El ajuste de hidratacion que no ajusta nada (2026-08-17). Desde que el
     * efecto de siembra lee `data-theme`, el caso NORMAL de un visitante
     * oscuro es este: la siembra ya monto el ojo, y la correccion de
     * `ThemeProvider` llega despues diciendo lo mismo. Sin esta salida, el
     * camino de hidratacion de mas abajo re-sembraba el MISMO stack y lanzaba
     * una segunda carrera de decode() sobre las mismas cinco imagenes, para
     * terminar exactamente donde ya estaba.
     *
     * Va ANTES del incremento del token por prudencia, NO porque haga falta:
     * se probo moviendo la guarda debajo del incremento y el fondo llega a
     * "active" igual. El motivo, medido y no supuesto: el efecto de la carrera
     * esta declarado DESPUES de este, y adopta `tokenRef.current` en tiempo de
     * efecto (ver su comentario), asi que en el mismo lote lee el token YA
     * incrementado y los dos siguen coincidiendo. Se deja arriba porque salir
     * sin tocar nada describe mejor lo que esta rama hace -- nada -- y porque
     * esa coincidencia depende del orden de declaracion de dos efectos, que es
     * una propiedad fragil en la que no conviene apoyarse.
     *
     * Solo cubre "pending"/"active". Un stack en "leaving" esta a mitad de
     * apagarse y SI necesita el tratamiento completo -- aunque un ajuste de
     * hidratacion no puede encontrarse uno (llega antes de que ningun relevo
     * arranque), la guarda se escribe por lo que afirma, no por lo que hoy
     * puede ocurrir.
     */
    const enteringPhase = stacksRef.current[entering];
    if (
      changeSource !== "user" &&
      (enteringPhase === "pending" || enteringPhase === "active")
    ) {
      return;
    }

    // Cualquier tramo en marcha (carga, hidratacion o relevo) queda
    // invalidado por este cambio: se descarta cualquier decode() que
    // resuelva tarde (via el token) y se cancelan los DOS temporizadores del
    // relevo secuencial que pudieran estar en vuelo.
    tokenRef.current += 1;
    const myToken = tokenRef.current;
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (handoffTimeoutRef.current !== null) {
      window.clearTimeout(handoffTimeoutRef.current);
      handoffTimeoutRef.current = null;
    }

    // El ajuste de hidratacion NO es un relevo. `ThemeProvider` arranca en
    // "light" (no puede leer localStorage durante el render sin romper el
    // export estatico) y se corrige en su propio efecto justo despues de
    // montar: eso se observa desde aqui como un cambio de tema, pero es la
    // CARGA terminando de asentarse con el tema correcto.
    //
    // El discriminante lo da el PROVEEDOR (`changeSource`), no un contador
    // local de "primer cambio" (task/lessons.md 2026-07-26: quien no tiene
    // tema guardado no genera ningun ajuste de hidratacion, asi que su
    // PRIMER toggle real se comeria el comodin).
    if (changeSource !== "user") {
      if (stacksRef.current[leaving] === "active") {
        // El pending original YA broto (el stack que este ajuste sustituye
        // llego a "active"): la carga ya revelo el fondo y el navbar/copia
        // ya arrancaron su entrada. No hay nada que la coreografia de carga
        // deba proteger aqui -- se aplica de golpe, sin volver a pasar por
        // "pending", igual que hacia esta rama antes de esta revision.
        setStacks({ [entering]: "active" });
        return;
      }

      // Caso general (medido en este repo: SIEMPRE, porque el ajuste de
      // `ThemeProvider` llega en el MISMO flush de efectos sincronos que el
      // montaje de HeroBackdrop, antes de que el decode() asincrono del
      // pending original tenga ocasion de resolver -- ver el informe de la
      // tarea D). Sustituye el stack pendiente ENTERO -- el viejo nunca
      // llego a pintarse, asi que no hay nada que hacer fade-out -- y vuelve
      // a correr la MISMA carrera de decode() (efecto de mas abajo),
      // reutilizando `pendingEntry` en vez de anadir una maquina nueva
      // (spec S7.2). `needsHandoff: false`: sigue siendo la carga
      // asentandose, no un relevo.
      setStacks({ [entering]: "pending" });
      setPendingEntry({
        entering,
        leaving,
        needsHandoff: false,
      });
      return;
    }

    // A partir de aqui, SIEMPRE un cambio de tema de USUARIO.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      // Spec S6.5/S7.3: bajo reduced-motion el cambio de tema es
      // INSTANTANEO -- sin relevo, sin pending, sin ningun temporizador. Un
      // relevo de HERO_HANDOFF_MS (1070ms) por temporizador no lo colapsa
      // ningun media query: hay que leer la preferencia aqui, en JS,
      // exactamente igual que `useHeroCopySwap` (hero.transition.ts).
      //
      // POR QUE LLEVA SUPRESION (revision 2026-08-05). La llamada es la MISMA
      // que ya estaba aqui antes de esta revision, y este fichero pasaba
      // `pnpm lint` sin ninguna supresion. Lo MEDIDO, no deducido, es esto:
      //   - el fichero tal cual esta en HEAD lintea limpio (comprobado
      //     linteando una copia literal de `git show HEAD:` en el propio
      //     repo);
      //   - el fichero con esta revision aplicada y SIN esta linea falla con
      //     "Avoid calling setState() directly within an effect" apuntando a
      //     la linea de abajo.
      // Es decir: el cambio de esta tarea (retirar el campo `token` de
      // `pendingEntry`, ver el efecto de la carrera mas abajo) hace que el
      // analisis de `react-hooks/set-state-in-effect` -- basado en el React
      // Compiler -- empiece a emitir un diagnostico sobre codigo INTACTO.
      // NO se afirma aqui por que: el criterio interno de esa regla para
      // decidir cuando analiza y cuando abandona el analisis de un componente
      // no se ha verificado, y sin verificarlo llamarlo "falso positivo del
      // analizador" seria una suposicion presentada como hecho.
      //
      // Lo que SI sostiene la supresion es el mismo argumento, ya escrito y
      // aceptado, que llevan las dos supresiones hermanas del repo
      // (`ThemeProvider.tsx` y `hero.transition.ts`): esto no es un setState
      // que corra en cada render, es un guard por early-return sobre una
      // lectura fresca de `matchMedia` dentro de un efecto que ya sale antes
      // si el tema no cambio de verdad (`prevThemeRef.current === themeName`,
      // primera linea). El test "bajo reduced-motion..." de
      // `HeroBackdrop.test.tsx` sigue cubriendo esta rama en verde.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ver el comentario de arriba
      setStacks({ [entering]: "active" });
      return;
    }

    if (stacksRef.current[entering] !== undefined) {
      // Reversion a mitad de camino (spec S7.3): el usuario vuelve al tema
      // anterior antes de que el relevo (HERO_HANDOFF_MS) haya llegado. El
      // stack que entra ahora ya estaba montado -- "active" si la reversion
      // llega ANTES de HERO_BACKDROP_HOLD_MS (nunca llego a empezar a
      // colapsar) o "leaving" si llega DESPUES (a medio colapsar) -- en los
      // dos casos se reactiva DIRECTAMENTE a "active", sin pasar por
      // "pending": ya era visible (o lo seguia siendo un instante antes),
      // asi que forzarlo a invisible primero solo anadiria un parpadeo que
      // el usuario no pidio.
      //
      // El OTRO stack (el que iba a entrar y esta reversion cancela) nunca
      // llego a pasar de "pending" -- su decode() puede haber resuelto o no,
      // da igual, el token ya lo invalido arriba -- asi que se ELIMINA
      // directamente en vez de marcarlo "leaving": nunca estuvo a la vista,
      // y aplicarle la animacion de salida (que arranca desde su propio
      // `from: opacity 1`, spec S6.2) lo haria aparecer de golpe antes de
      // desvanecerse -- un defecto que no tiene delante de si.
      setStacks((prev) => {
        const next: Stacks = { ...prev, [entering]: "active" };
        delete next[leaving];
        return next;
      });
      return;
    }

    // Relevo secuencial nuevo (spec S3, S7.3): el entrante se monta en
    // "pending" YA -- su decode() arranca en paralelo con el colapso del
    // saliente (spec S7.3, paso 2) -- pero el saliente sigue "active" hasta
    // HERO_BACKDROP_HOLD_MS (cuando la copia, apagada desde t=0, ya no esta
    // en pantalla) y el entrante no puede pasar a "active" antes de
    // HERO_HANDOFF_MS, sea cual sea el resultado de decode().
    setStacks((prev) => ({ ...prev, [entering]: "pending" }));
    setPendingEntry({ entering, leaving, needsHandoff: true });

    // Reinicia las dos condiciones del relevo para ESTE cruce -- si
    // quedaran a `true` de un cruce anterior, el primero de los dos
    // temporizadores/promesas de este cruce nuevo daria por cumplida una
    // condicion que en realidad no se ha vuelto a comprobar.
    clockReadyRef.current = false;
    decodeReadyRef.current = false;

    holdTimeoutRef.current = window.setTimeout(() => {
      holdTimeoutRef.current = null;
      if (tokenRef.current !== myToken) return;
      setStacks((prev) => {
        if (prev[leaving] === undefined) return prev;
        return { ...prev, [leaving]: "leaving" };
      });
    }, HERO_BACKDROP_HOLD_MS);

    handoffTimeoutRef.current = window.setTimeout(() => {
      handoffTimeoutRef.current = null;
      if (tokenRef.current !== myToken) return;
      clockReadyRef.current = true;
      // El relevo lo manda el RELOJ, no el decode() -- pero tampoco puede
      // cerrarse si decode() TODAVIA no ha terminado (poco probable:
      // HERO_DECODE_TIMEOUT_MS mas el margen de un frame, ~650ms, siempre
      // cabe dentro de HERO_HANDOFF_MS, 1070ms -- pero la condicion se
      // comprueba explicitamente en vez de asumirlo). Si decode() ya
      // establecio su marca, este temporizador es el ULTIMO de los dos en
      // llegar: cierra el relevo. Si no, el efecto de la carrera de mas
      // abajo lo cerrara en cuanto decode() resuelva.
      if (decodeReadyRef.current) {
        finalizeHandoff(entering, leaving, myToken);
      }
    }, HERO_HANDOFF_MS);
    // `changeSource` va en las dependencias por exigencia del linter, no
    // porque pueda disparar el efecto por su cuenta: el proveedor lo cambia
    // SIEMPRE en el mismo lote que `themeName`, y si aun asi llegara solo, la
    // guarda `prevThemeRef.current === themeName` de la primera linea corta la
    // ejecucion antes de tocar nada.
  }, [themeName, changeSource]);

  // Arranca SOLO cuando hay un montaje "pending" genuinamente nuevo (carga o
  // relevo, spec S7.2/S7.3). Se dispara tras el commit que monta ese stack
  // -- por eso puede consultar el DOM real de sus <img>: el efecto anterior
  // ya dejo esas imagenes en el arbol antes de que este efecto llegue a
  // ejecutarse.
  useEffect(() => {
    if (!pendingEntry) return;
    const { entering, leaving, needsHandoff } = pendingEntry;
    // El token se adopta del REF en el instante en que este efecto arranca
    // -- ya no viaja como campo escrito a mano dentro de `pendingEntry`
    // (revision 2026-08-05). En el caso normal es EQUIVALENTE: este efecto
    // corre en el mismo lote de commit en el que la entrada se sembro (el
    // efecto de deteccion de arriba, o el inicializador de `useState`), con
    // `tokenRef` ya puesto a su valor nuevo -- leerlo aqui o llevarlo
    // congelado en el objeto da el mismo numero.
    //
    // Donde SI cambia: un remontaje (StrictMode, activo en next.config.ts,
    // simula desmontaje+montaje en cada montaje de cliente; tambien una
    // navegacion real que desmonta y vuelve a montar el arbol). La limpieza
    // de desmontaje (mas abajo) sube `tokenRef.current` ANTES de que este
    // efecto vuelva a ejecutarse en el montaje nuevo -- un campo `token`
    // fijado a mano en el inicializador de `useState` (siempre 0) quedaria
    // desincronizado con ese ref ya incrementado, y la guarda de abajo
    // descartaria esta carrera PARA SIEMPRE: el fondo se quedaria pegado en
    // "pending", las cuatro capas en opacity 0, sin ningun error que lo
    // delatara (medido: unmount sube tokenRef a 1, la carrera que sigue
    // sigue comparando contra el 0 de siempre y nunca vuelve a coincidir).
    // Adoptarlo del ref en tiempo de efecto hace que la comparacion viaje
    // SIEMPRE sincronizada con la ultima limpieza real -- es decir, hace al
    // componente resistente a su propio remontaje, que es exactamente el
    // contrato que StrictMode existe para verificar.
    const myToken = tokenRef.current;
    let cancelled = false;

    const run = async (): Promise<void> => {
      const root = rootRef.current;
      const imgs = root
        ? Array.from(
            root.querySelectorAll<HTMLImageElement>(
              `[data-stack="${entering}"] img`,
            ),
          )
        : [];

      // .catch() por si decode() rechaza a medias, Y una carrera contra
      // HERO_DECODE_TIMEOUT_MS por si no existe (jsdom) o no resuelve
      // NUNCA: sin la carrera, una sola promesa colgada dejaria el fondo
      // pegado en "pending" para siempre, sin lanzar ningun error que lo
      // delatara (spec S6.1).
      await Promise.race([
        Promise.all(
          imgs.map(
            (img) =>
              img.decode?.().catch(() => undefined) ??
              Promise.resolve(undefined),
          ),
        ),
        wait(HERO_DECODE_TIMEOUT_MS),
      ]);
      await nextFrame();

      if (cancelled || tokenRef.current !== myToken) return;

      if (!needsHandoff) {
        // Carga (montaje inicial o ajuste de hidratacion, spec S7.2):
        // decode() es la UNICA condicion, no hay ningun reloj de relevo que
        // esperar -- no hay ningun stack saliente VISIBLE del que
        // despedirse.
        finishLoad(entering, leaving, myToken);
        return;
      }

      // Relevo de un cambio de tema de usuario (spec S7.3): decode() es
      // SOLO una de las dos condiciones. Si el reloj (temporizador de
      // HERO_HANDOFF_MS, en el efecto de deteccion de mas arriba) ya marco
      // su llegada, este es el ULTIMO de los dos: cierra el relevo. Si no,
      // deja constancia y espera -- el temporizador del reloj lo cerrara el
      // cuando llegue.
      decodeReadyRef.current = true;
      if (clockReadyRef.current) {
        finalizeHandoff(entering, leaving, myToken);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // `finishLoad` entra en las dependencias por exigencia del linter: su
    // identidad es estable (`useCallback` con `[]`, retirado su unico valor
    // reactivo -- `markBackdropRevealed` -- junto con `useStage()` en la
    // Task 27), asi que incluirla aqui no reprograma este efecto en ningun
    // render. `finalizeHandoff` NO necesita la misma declaracion: su
    // clausura solo contiene refs y el setter de estado, ninguno de los dos
    // reactivo.
  }, [pendingEntry, finishLoad]);

  // Limpieza al desmontar: ningun temporizador del relevo debe sobrevivir a
  // HeroBackdrop, y cualquier decode() en curso queda invalidado por el
  // token para que su continuacion (si el navegador la resuelve tarde) no
  // toque un componente ya fuera del arbol.
  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
      }
      if (handoffTimeoutRef.current !== null) {
        window.clearTimeout(handoffTimeoutRef.current);
      }
      tokenRef.current += 1;
    };
  }, []);

  return (
    <ScBackdrop ref={rootRef}>
      {stacks.eye !== undefined && (
        <ScEyeStack
          data-stack="eye"
          data-state={stacks.eye}
          aria-hidden="true"
        >
          <Eye />
        </ScEyeStack>
      )}
      {stacks.aura !== undefined && (
        <ScAuraStack
          data-stack="aura"
          data-state={stacks.aura}
          aria-hidden="true"
        >
          <Aura />
        </ScAuraStack>
      )}
    </ScBackdrop>
  );
}
