"use client";
import { useEffect, useRef, useState, type ReactElement } from "react";
import styled from "styled-components";
import { Aura } from "@/components/aura/Aura";
import { Eye } from "@/components/eye/Eye";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeName } from "@/theme/themes";
import {
  HERO_DECODE_TIMEOUT_MS,
  HERO_FADE_MS,
  HERO_TRANSITION_MS,
} from "./hero.transition";

type StackName = "eye" | "aura";
type StackPhase = "pending" | "active" | "leaving";
type Stacks = Partial<Record<StackName, StackPhase>>;

interface PendingEntry {
  readonly entering: StackName;
  readonly leaving: StackName;
  readonly token: number;
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

// Un frame de margen tras decodificar, para que el navegador ya haya pintado
// el frame 0 del stack entrante antes de arrancar el stagger (spec S6.1).
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
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
 * Envoltorio del ojo: SOLO el, entre las piezas de este archivo, anima su
 * propia opacidad, y lo hace de forma UNIFORME, sin retardo por capa. No es
 * una simplificacion: es la unica opcion que funciona. ScLayer (eye.parts.tsx)
 * ya anima opacity con @keyframes (glowStrong/glowSoft, la respiracion de la
 * corona), y una animacion CSS y una transicion CSS sobre la MISMA propiedad
 * del MISMO elemento no conviven -- la animacion gana y la transicion NO
 * LLEGA A CREARSE (medido en navegador real: getAnimations() devuelve solo
 * la CSSAnimation, spec S6.2). Un transition-delay por capa en el ojo seria
 * codigo muerto sin ningun error que lo delatara. Por eso el fundido del ojo
 * vive aqui, en el UNICO elemento de ese stack que no compite con ninguna
 * animacion propia.
 *
 * El atributo data-state vive en ESTE MISMO elemento (lo escribe
 * HeroBackdrop mas abajo), asi que el selector es CALIFICADO
 * (&[data-state="..."]), no descendiente -- lo contrario que en
 * aura.parts.tsx, donde data-state vive en un ancestro de las piezas que lo
 * leen.
 *
 * will-change: opacity SOLO durante "pending"/"leaving" (los dos extremos en
 * los que el fundido esta genuinamente en marcha o a punto de arrancar),
 * nunca en "active": ese estado puede durar indefinidamente -- todo el
 * tiempo que el usuario se quede en un tema -- y una capa de compositor
 * permanente sobre un elemento a pantalla completa es coste que nadie
 * libera (spec S6.2.1). La contrapartida, documentada con honestidad: la
 * transicion de fundido-ENTRADA se ejecuta mientras data-state ya vale
 * "active" (es el cambio a "active" lo que la dispara), asi que esta regla
 * no cubre el instante exacto de ESE fundido de entrada -- solo el de
 * salida y el instante de montaje. Cubrir tambien el tramo activo exigiria
 * un estado intermedio que este componente no modela.
 */
const ScEyeStack = styled.div`
  position: absolute;
  inset: 0;
  opacity: 1;

  &[data-state="pending"] {
    opacity: 0;
    transition: none;
    will-change: opacity;
  }

  &[data-state="active"] {
    opacity: 1;
    transition: opacity ${HERO_FADE_MS}ms
      ${({ theme }) => theme.data.motion.easing.decelerate};
  }

  &[data-state="leaving"] {
    opacity: 0;
    transition: opacity ${HERO_FADE_MS}ms
      ${({ theme }) => theme.data.motion.easing.decelerate};
    will-change: opacity;
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-state="active"],
    &[data-state="leaving"] {
      transition: none;
    }
  }

  /* Mismo tratamiento que Hero.tsx (ScEye) le da hoy al ojo: este
     envoltorio asume ese rol, asi que hereda tambien esta regla. */
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
 * razonamiento que ScAuraSubject en aura.parts.tsx).
 */
const ScAuraStack = styled.div`
  position: absolute;
  inset: 0;

  @media (forced-colors: active) {
    display: none;
  }
`;

/**
 * Orquesta el cruce entre las dos composiciones de fondo del hero (spec
 * S6.1): Aura (tema claro) y el ojo cosmico (tema oscuro). Monta el stack
 * que corresponde al tema activo y, cuando el tema cambia, monta el
 * entrante en "pending", espera a que sus imagenes decodifiquen (o al tope
 * HERO_DECODE_TIMEOUT_MS, lo que llegue antes) mas un frame de margen,
 * lo pasa a "active" -- momento en el que el saliente pasa a "leaving" -- y
 * programa por TEMPORIZADOR (nunca por transitionend, que bajo
 * reduced-motion no llega a dispararse) el desmontaje del saliente a los
 * HERO_TRANSITION_MS.
 *
 * Aura se monta SIEMPRE despues del ojo en el arbol: su capa `field` es
 * opaca, asi que es ella la que tiene que quedar encima para resolver el
 * cambio de lienzo sin animar background-color (spec S6.3), y eso vale en
 * los dos sentidos del cruce -- por eso el orden de montaje en el JSX no
 * depende de cual es el entrante.
 */
export function HeroBackdrop(): ReactElement {
  const { themeName, changeSource } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  const [stacks, setStacks] = useState<Stacks>(() => ({
    [stackFor(themeName)]: "active",
  }));
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
  const settleTimeoutRef = useRef<number | null>(null);

  // Comparte el cierre del cruce entre las dos rutas que lo alcanzan: la
  // reactivacion directa (el stack entrante ya estaba montado, viniendo de
  // un cruce en marcha) y el asentamiento tras decodificar (efecto de mas
  // abajo). Pasa "active" al entrante y, si el saliente sigue montado,
  // "leaving"; programa su desmontaje a los HERO_TRANSITION_MS.
  const finishCrossfade = (
    entering: StackName,
    leaving: StackName,
    myToken: number,
  ): void => {
    setStacks((prev) => {
      const next: Stacks = { ...prev, [entering]: "active" };
      if (prev[leaving] !== undefined) next[leaving] = "leaving";
      return next;
    });

    if (settleTimeoutRef.current !== null) {
      window.clearTimeout(settleTimeoutRef.current);
    }
    settleTimeoutRef.current = window.setTimeout(() => {
      settleTimeoutRef.current = null;
      // Token de ejecucion: si un cruce mas nuevo arranco mientras este
      // temporizador esperaba, este desmontaje ya no le corresponde --
      // dos toggles rapidos no pueden dejar un stack huerfano, pero
      // tampoco pueden pisarse el desmontaje el uno al otro.
      if (tokenRef.current !== myToken) return;
      setStacks((prev) => {
        if (prev[leaving] === undefined) return prev;
        const next = { ...prev };
        delete next[leaving];
        return next;
      });
    }, HERO_TRANSITION_MS);
  };

  // Detecta un cambio de tema real (nunca el mount) y decide como cruzar.
  useEffect(() => {
    if (prevThemeRef.current === themeName) return;
    prevThemeRef.current = themeName;

    const entering = stackFor(themeName);
    const leaving = otherStack(entering);

    // Cualquier cruce en marcha queda invalidado por este cambio de tema.
    tokenRef.current += 1;
    const myToken = tokenRef.current;
    if (settleTimeoutRef.current !== null) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }

    // El ajuste de hidratacion NO es un cruce. `ThemeProvider` arranca en
    // "light" (no puede leer localStorage durante el render sin romper el
    // export estatico) y se corrige en su propio efecto justo despues de
    // montar: eso se observa desde aqui como un cambio de tema, pero es la
    // carga terminando de asentarse. Se aplica de golpe, sin pending/leaving
    // (spec S6.1: en la primera carga no hay nada que cruzar y un fundido
    // inicial seria un flash injustificado).
    //
    // El discriminante lo da el PROVEEDOR (`changeSource`), no un contador
    // local de "primer cambio". Un contador falla justo en el caso mas comun:
    // quien no tiene tema guardado no genera ningun ajuste de hidratacion, asi
    // que su PRIMER toggle real se comeria el comodin y no animaria -- y ese
    // toggle es exactamente el momento que esta coreografia existe para lucir.
    if (changeSource !== "user") {
      // El linter avisa de un setState sincrono dentro de un efecto, y en el
      // caso general tiene razon: encadena renders. Aqui es justo lo que se
      // quiere -- el ajuste de hidratacion tiene que aplicarse ANTES de que el
      // navegador pinte, para que no se vea un frame con la composicion del
      // tema equivocado. Mismo motivo por el que ThemeProvider.tsx lleva la
      // misma excepcion, unas lineas mas arriba en el mismo flujo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStacks({ [entering]: "active" });
      return;
    }

    if (stacksRef.current[entering] !== undefined) {
      // Reversion de un cruce en marcha: el stack que entra ya estaba
      // montado (estaba "leaving") y ya paso su decodificacion la vez
      // anterior. Forzar "pending" aqui lo apagaria a negro un instante de
      // mas, un stack que seguia siendo visible -- se reactiva
      // DIRECTAMENTE a "active".
      finishCrossfade(entering, leaving, myToken);
      return;
    }

    setStacks((prev) => ({ ...prev, [entering]: "pending" }));
    setPendingEntry({ entering, leaving, token: myToken });
    // `changeSource` va en las dependencias por exigencia del linter, no
    // porque pueda disparar el efecto por su cuenta: el proveedor lo cambia
    // SIEMPRE en el mismo lote que `themeName`, y si aun asi llegara solo, la
    // guarda `prevThemeRef.current === themeName` de la primera linea corta la
    // ejecucion antes de tocar nada.
  }, [themeName, changeSource]);

  // Arranca SOLO cuando hay un montaje "pending" genuinamente nuevo (fija
  // la mecanica del paso 2 de la spec S6.1). Se dispara tras el commit que
  // monta ese stack -- por eso puede consultar el DOM real de sus <img>: el
  // efecto anterior ya dejo esas imagenes en el arbol antes de que este
  // efecto llegue a ejecutarse.
  useEffect(() => {
    if (!pendingEntry) return;
    const { entering, leaving, token: myToken } = pendingEntry;
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
      // NUNCA: sin la carrera, una sola promesa colgada dejaria el tema
      // anterior pegado en pantalla para siempre, sin lanzar ningun error
      // que lo delatara (spec S6.1).
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
      finishCrossfade(entering, leaving, myToken);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [pendingEntry]);

  // Limpieza al desmontar: el temporizador de desmontaje no debe sobrevivir
  // a HeroBackdrop, y cualquier decode() en curso queda invalidado por el
  // token para que su continuacion (si el navegador la resuelve tarde) no
  // toque un componente ya fuera del arbol.
  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
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
