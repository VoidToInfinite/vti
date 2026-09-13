import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, fireEvent, act } from "@/test/test-utils";
import { Aura } from "./Aura";
import { AURA_LAYERS, AURA_PRELOADS } from "./aura.layers";
import { AURA_LAYER_BLEND_MODE } from "./aura.parts";

/**
 * Mock minimo de `matchMedia`. `usePointer` (consumido por `Aura`) y los
 * hooks de `Sol` (`useSolTiltSpin`) llaman a `window.matchMedia` de verdad;
 * jsdom no lo implementa, asi que sin este stub cualquier render lanza
 * "matchMedia is not a function". `fineMatches` controla si el puntero
 * queda habilitado (arranca su propio rAF interno); `reducedMatches` siempre
 * es `false` salvo que se pida.
 */
function stubMatchMedia(fineMatches: boolean, reducedMatches = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : fineMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * Mock de `IntersectionObserver` para la guarda de visibilidad que
 * `useParallaxLayers` gana con el tercer argumento `sceneRef` (D3, spec
 * 2026-08-04): jsdom no lo implementa, y `Aura` ahora SIEMPRE pasa su raiz
 * (`ScAuraSocket`) como esa ref, asi que cualquier test de aqui que habilite
 * el puntero fino (`stubMatchMedia(true)`) hace que el efecto llegue a
 * `new IntersectionObserver(...)` -- sin este stub esos montajes lanzarian
 * "IntersectionObserver is not defined". Mismo patron exacto que
 * `useParallaxLayers.test.tsx`: `observe`/`disconnect` quedan espiados y el
 * callback capturado en `ioTrigger` para que cada test decida cuando simular
 * que el hero entra o sale del viewport; `ioObserveSpy` se reasigna dentro
 * de la funcion (no una unica instancia module-level) para que "se llamo una
 * vez" en un test no arrastre llamadas de montajes anteriores.
 */
let ioTrigger: (isIntersecting: boolean) => void;
let ioObserveSpy: ReturnType<typeof vi.fn>;
function stubIntersectionObserver(): void {
  ioObserveSpy = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = ioObserveSpy;
      disconnect = vi.fn();
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        ioTrigger = (v: boolean) => cb([{ isIntersecting: v }]);
      }
    },
  );
}

beforeEach(() => {
  // Por defecto sin puntero fino: la mayoria de estos tests solo verifican
  // estructura/accesibilidad, no el seguimiento del cursor.
  stubMatchMedia(false);
  // Inerte en los tests con el puntero deshabilitado (el efecto de
  // useParallaxLayers corta en `if (!enabled) return` antes de tocar el
  // observer), pero obligatorio para los que si lo habilitan mas abajo.
  stubIntersectionObserver();
});
afterEach(() => vi.unstubAllGlobals());

describe("Aura", () => {
  it("es decoracion: todo el fondo queda fuera del arbol de accesibilidad", () => {
    const { container } = renderWithProviders(<Aura />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("no expone ninguna capa como imagen accesible (el nombre lo da el DOM real)", () => {
    const { container } = renderWithProviders(<Aura />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // El corolario estructural: toda capa es decorativa, `alt` vacio.
    for (const img of container.querySelectorAll("img")) {
      expect(img).toHaveAttribute("alt", "");
    }
  });

  it("monta las cuatro capas publicadas, en el orden del stagger campo -> manos -> energia", () => {
    const { container } = renderWithProviders(<Aura />);
    const parts = [...container.querySelectorAll("img[data-part]")].map((img) =>
      img.getAttribute("data-part"),
    );
    expect(parts).toEqual(AURA_LAYERS.map((layer) => layer.part));
  });

  it("ofrece la variante estrecha de cada capa para no servir 1672px a un movil", () => {
    const { container } = renderWithProviders(<Aura />);
    for (const layer of AURA_LAYERS) {
      const img = container.querySelector(`img[data-part="${layer.part}"]`);
      expect(img).toHaveAttribute("src", layer.src);
      expect(img?.getAttribute("srcset")).toContain(layer.srcSmall);
      expect(img).toHaveAttribute("sizes");
    }
  });

  it("solo el campo (candidata a LCP, a sangre sobre el socket) pide prioridad alta; las otras tres capas no compiten por ancho de banda (auditoria 2026-08-08)", () => {
    const { container } = renderWithProviders(<Aura />);
    const field = container.querySelector('img[data-part="field"]');
    expect(field).toHaveAttribute("loading", "eager");
    expect(field).toHaveAttribute("fetchpriority", "high");

    for (const layer of AURA_LAYERS.filter((l) => !l.fullBleed)) {
      const img = container.querySelector(`img[data-part="${layer.part}"]`);
      expect(img).not.toHaveAttribute("loading");
      expect(img).not.toHaveAttribute("fetchpriority");
    }
  });

  it("el campo va a sangre directamente en el socket; las manos y la energia dentro del marco del sujeto", () => {
    const { container } = renderWithProviders(<Aura />);
    const socket = container.firstElementChild as HTMLElement;
    const field = socket.querySelector('img[data-part="field"]');
    // Desde el AVIF (2026-08-18) cada capa vive envuelta en <picture>; la
    // intencion del candado no cambia: el CAMPO (via su picture) es hijo
    // DIRECTO del socket, no del marco del sujeto -- es lo que le permite
    // cubrir sin recorte cualquier relacion de aspecto (spec §5.2).
    const fieldPicture = field?.closest("picture");
    const subject = fieldPicture?.nextElementSibling;
    expect(fieldPicture?.parentElement).toBe(socket);
    for (const layer of AURA_LAYERS.filter((l) => !l.fullBleed)) {
      const img = socket.querySelector(`img[data-part="${layer.part}"]`);
      expect(img?.closest("picture")?.parentElement).toBe(subject);
    }
  });

  it("monta Sol en el orbe y no el Wormhole: Aura es la composicion clara", () => {
    const { container } = renderWithProviders(<Aura />);
    const orbSlot = container.querySelector('[data-part="orb"]');
    expect(orbSlot?.querySelector('[data-face="sol"]')).toBeInTheDocument();
    // El Wormhole es exclusivo de la composicion oscura (Eye): si alguien lo
    // montara aqui por error, este selector lo detecta de inmediato.
    expect(
      container.querySelector('[data-part="ring1"]'),
    ).not.toBeInTheDocument();
  });

  it("ninguna capa computa mix-blend-mode distinto de normal (el aditivo del ojo aqui seria un bug)", () => {
    const { container } = renderWithProviders(<Aura />);
    const images = container.querySelectorAll("img[data-part]");
    expect(images.length).toBe(AURA_LAYERS.length);
    for (const img of images) {
      // jsdom no sintetiza el valor inicial de una propiedad nunca
      // declarada y devuelve cadena vacia en vez de "normal" (medido en
      // este repo, ver AURA_LAYER_BLEND_MODE); el `||` compensa esa
      // diferencia de entorno sin escribir el string a mano. No es
      // tautologico: si una capa declarara mix-blend-mode: screen,
      // getComputedStyle devolveria "screen" (no vacio, el `||` no lo
      // pisa) y la comparacion de abajo fallaria.
      const computed =
        getComputedStyle(img).mixBlendMode || AURA_LAYER_BLEND_MODE;
      expect(computed).toBe(AURA_LAYER_BLEND_MODE);
    }
  });

  it("aplica className en el elemento raiz (styled(Aura) lo necesita para el hero)", () => {
    const { container } = renderWithProviders(<Aura className="custom" />);
    expect(container.firstElementChild).toHaveClass("custom");
  });

  it("no arranca el rAF de seguimiento cuando el puntero esta deshabilitado (tactil o reduced-motion)", () => {
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    renderWithProviders(<Aura />); // matchMedia deshabilitado por el beforeEach
    expect(raf).not.toHaveBeenCalled();
  });

  it("cancela el rAF de seguimiento en curso al desmontar", () => {
    stubMatchMedia(true); // puntero fino habilitado
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const { unmount } = renderWithProviders(<Aura />);
    // El hero esta en pantalla al montar (escenario real): sin disparar la
    // interseccion el bucle propio de useParallaxLayers se queda en
    // `running = false` a la espera del primer cruce y este test dejaria de
    // ejercitar su rAF, no el de usePointer.
    act(() => ioTrigger(true));
    expect(raf).toHaveBeenCalled();
    unmount();
    expect(caf).toHaveBeenCalledWith(7);
  });

  it("el parallax desplaza cada capa segun su profundidad, y deja el campo quieto", () => {
    stubMatchMedia(true); // puntero fino habilitado
    // rAF controlado a mano: se guardan los callbacks pendientes y se
    // ejecutan en tandas, la unica forma de avanzar el lerp de `usePointer`
    // (y con el, el rAF de Aura) de manera determinista dentro de jsdom.
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const { container } = renderWithProviders(<Aura />);
    // El hero esta en pantalla al montar: sin disparar la interseccion el
    // bucle de useParallaxLayers nunca arranca (D3, guarda de visibilidad) y
    // ninguna capa llegaria a recibir transform.
    act(() => ioTrigger(true));

    // Cursor en la esquina inferior derecha del viewport => x, y -> +1.
    window.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth,
        clientY: window.innerHeight,
      }),
    );
    // Varias tandas: el lerp (0.085/frame) necesita tiempo para acercarse al
    // objetivo, y Aura lee el valor ya suavizado.
    for (let frame = 0; frame < 40; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }

    const transformOf = (part: string): string =>
      container.querySelector<HTMLElement>(`[data-part="${part}"]`)?.style
        .transform ?? "";
    const xOf = (part: string): number =>
      Number(/translate3d\((-?[\d.]+)px/.exec(transformOf(part))?.[1] ?? "0");

    // El campo (depth 0) no recibe transform nunca: es el plano de referencia.
    expect(transformOf("field")).toBe("");
    // El resto se ordena por profundidad: orbe > manos > energia (revision
    // 2026-07-27, spec S15.4: con la energia pintando ahora detras de las
    // manos, su profundidad de parallax (0.15) es MENOR que la de las manos
    // (0.30), no mayor como asumia el primer lote -- lo que esta detras se
    // mueve MENOS con el cursor).
    expect(xOf("orb")).toBeGreaterThan(xOf("handLeft"));
    expect(xOf("handLeft")).toBeGreaterThan(xOf("energy"));
    expect(xOf("energy")).toBeGreaterThan(0);
    // Las dos manos comparten profundidad: se mueven exactamente igual.
    expect(xOf("handRight")).toBe(xOf("handLeft"));
  });

  it("con reduced-motion el pointerdown no marca el pulso (no habria animacion que lo apagara)", () => {
    stubMatchMedia(false, true);
    const { container } = renderWithProviders(<Aura />);
    const socket = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(socket);
    expect(socket).not.toHaveAttribute("data-pulsing");
  });

  it("un pointerdown sobre Aura marca el pulso, y el fin de su animacion lo limpia para que pueda repetirse", () => {
    const { container } = renderWithProviders(<Aura />);
    const socket = container.firstElementChild as HTMLElement;
    const shock = container.querySelector('[data-part="shock"]') as HTMLElement;

    expect(socket).not.toHaveAttribute("data-pulsing");

    fireEvent.pointerDown(socket);
    expect(socket).toHaveAttribute("data-pulsing", "true");

    fireEvent.animationEnd(shock);
    expect(socket).not.toHaveAttribute("data-pulsing");

    // Se puede repetir: un segundo click vuelve a marcar el pulso.
    fireEvent.pointerDown(socket);
    expect(socket).toHaveAttribute("data-pulsing", "true");
  });

  it("D3 (spec 2026-08-04): al montar, useParallaxLayers observa la raiz de Aura (ScAuraSocket) -- antes no se instanciaba ningun IntersectionObserver", () => {
    // Solo con el puntero habilitado el efecto de useParallaxLayers llega a
    // leer sceneRef: con el puntero deshabilitado (el defecto del
    // beforeEach) corta antes en `if (!enabled) return` y nunca toca el
    // observer, asi que esta comprobacion necesita su propio
    // stubMatchMedia(true).
    stubMatchMedia(true);
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    renderWithProviders(<Aura />);

    expect(ioObserveSpy).toHaveBeenCalledTimes(1);
  });
});

/*
 * Candado de `AURA_PRELOADS` (2026-08-17), hermano exacto del de
 * `EYE_PRELOADS` en `Eye.test.tsx` y por el mismo motivo: el navegador solo
 * trata una precarga y la peticion del `<img>` como la MISMA cosa si
 * `imagesrcset`/`imagesizes` coinciden con `srcSet`/`sizes` caracter a
 * caracter. Si divergen, cada capa se descarga DOS veces y el arreglo de
 * rendimiento se convierte en un defecto de rendimiento.
 *
 * Desde esta revision el candado importa mas que antes: el HTML estatico ya
 * no trae los `<img>` de Aura (ver el docblock de `HeroBackdrop.tsx`), asi
 * que la UNICA precarga del arte claro es la que inyecta el script de
 * arranque a partir de esta lista. Si diverge, el visitante claro pierde la
 * precarga entera en vez de duplicarla -- un fallo mas silencioso todavia.
 *
 * NO es tautologico aunque las dos partes salgan de `AURA_LAYERS`: `Aura.tsx`
 * construye su `srcSet` con su propia plantilla literal (y ademas en DOS
 * ramas distintas del JSX, la capa a sangre y las del marco del sujeto), y
 * `AURA_PRELOADS` construye la suya.
 */
describe("Aura: las precargas del arranque coinciden con lo que se renderiza", () => {
  /*
   * Desde el 2026-08-18 el registro es MIXTO: las capas con avif: true
   * precargan su pista AVIF (con type) y tienen que coincidir con el
   * <source>; "energy" -- excluida por la guarda de la codificacion --
   * precarga su WebP sin type y coincide con el <img> de siempre.
   */
  it("cada capa renderizada tiene una precarga que coincide con la pista que el navegador elegira", () => {
    const { container } = renderWithProviders(<Aura />);
    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs).toHaveLength(AURA_LAYERS.length);
    expect(AURA_PRELOADS).toHaveLength(AURA_LAYERS.length);

    imgs.forEach((img, i) => {
      const layer = AURA_LAYERS[i];
      const source = img
        .closest("picture")
        ?.querySelector('source[type="image/avif"]');
      if (layer.avif) {
        expect(
          source,
          `la capa ${layer.part} declara avif y no monta <source>`,
        ).not.toBeNull();
        expect(
          source?.getAttribute("srcset"),
          `la capa ${layer.part} renderiza un srcSet AVIF que la precarga no reproduce: doble descarga`,
        ).toBe(AURA_PRELOADS[i].srcSet);
        expect(AURA_PRELOADS[i].type).toBe("image/avif");
        expect(source?.getAttribute("sizes")).toBe(AURA_PRELOADS[i].sizes);
      } else {
        expect(
          source,
          `la capa ${layer.part} NO declara avif y monta <source>`,
        ).toBeNull();
        expect(
          img.getAttribute("srcset"),
          `la capa ${layer.part} (WebP) renderiza un srcSet que la precarga no reproduce`,
        ).toBe(AURA_PRELOADS[i].srcSet);
        expect(AURA_PRELOADS[i].type).toBeUndefined();
      }
      expect(img.getAttribute("sizes")).toBe(AURA_PRELOADS[i].sizes);
    });
  });

  it("la primera precarga es la capa a sangre: es la unica candidata real a LCP y la que recibe fetchpriority alto", () => {
    // El script de arranque pone `fetchpriority="high"` al indice 0 y solo a
    // ese. Si alguien reordena AURA_LAYERS y `field` deja de ir primero, la
    // prioridad alta viajaria a una capa que vive dentro del marco del
    // sujeto -- mas pequena, nunca el elemento mas grande pintado.
    expect(AURA_LAYERS[0].fullBleed).toBe(true);
    expect(AURA_PRELOADS[0].srcSet).toContain(
      AURA_LAYERS[0].src.replace(".webp", ".avif"),
    );
  });
});
