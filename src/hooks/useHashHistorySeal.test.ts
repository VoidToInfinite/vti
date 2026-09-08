import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHashHistorySeal } from "./useHashHistorySeal";

/*
 * LO QUE ESTE FICHERO PUEDE PROBAR Y LO QUE NO, escrito antes que los tests
 * para que nadie lea de más en un verde.
 *
 * jsdom NO monta el App Router de Next, así que aquí no existen ni el parche de
 * `replaceState` ni el manejador de `popstate` que causan el defecto. Es decir:
 * el defecto de la crítica #21 —«atrás» cambia la URL y deja el documento
 * anterior en pantalla— NO se puede ver desde este fichero, ni con este hook ni
 * con ningún otro. Su candado real es de navegador y vive en
 * `scripts/check-site-surfaces.mjs`, familia
 * `atras-restituye-el-documento-de-la-url`, que ejecuta el gesto completo con
 * clics reales sobre el `out/` construido.
 *
 * Lo que SÍ se ata aquí es el MECANISMO, que es todo lo que este módulo aporta:
 * a qué evento reacciona, qué llama exactamente y con qué argumentos (los tres
 * importan: el estado que se pasa decide qué rama del parche de Next se toma),
 * que no navega, que no se repite sin motivo y que se desmonta limpio.
 *
 * VALIDADO CON BUG INYECTADO (2026-09-08, regla 34 de RULES.md): comentando la
 * línea `window.addEventListener("hashchange", sellarLaEntrada)` de
 * `useHashHistorySeal.ts`, caen los cuatro casos que dependen del sello —
 * «Tests 4 failed | 3 passed (7)»— con estas líneas literales:
 *
 *   AssertionError: la entrada de fragmento tiene que volver a escribirse en
 *   cuanto nace, o el enrutador no sabrá restaurarla al volver: expected
 *   "replaceState" to be called 1 times, but got 0 times
 *   AssertionError: expected "replaceState" to be called with arguments: [ …(3) ]
 *   AssertionError: expected "replaceState" to be called 1 times, but got 0 times
 *   AssertionError: expected "replaceState" to be called 2 times, but got 0 times
 *
 * Los tres que siguen verdes con el bug puesto lo hacen por construcción y
 * conviene saberlo: dos afirman que NO se llama a `replaceState` (montar y
 * desmontar) y el tercero que la URL no cambia. Ninguno de los tres puede ver
 * este defecto, y por eso hay cuatro más.
 */

describe("useHashHistorySeal", () => {
  let replaceState: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    replaceState = vi.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no toca el historial hasta que nace una entrada de fragmento", () => {
    renderHook(() => useHashHistorySeal());

    expect(
      replaceState,
      "montar el hook no puede reescribir la entrada actual: lo único que este módulo hace es esperar",
    ).not.toHaveBeenCalled();
  });

  it("reescribe la entrada en cuanto el navegador crea una de fragmento", () => {
    renderHook(() => useHashHistorySeal());

    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(
      replaceState,
      "la entrada de fragmento tiene que volver a escribirse en cuanto nace, o el enrutador no sabrá restaurarla al volver",
    ).toHaveBeenCalledTimes(1);
  });

  /*
   * LOS TRES ARGUMENTOS, uno a uno, porque cada uno decide una cosa distinta en
   * el parche de `replaceState` de Next (`app-router.js:268`):
   *
   * - el ESTADO: si ya lleva `__NA`, Next sale por su atajo sin despachar nada
   *   (sellar lo ya sellado es un no-op); si es `null`, entra por el camino que
   *   acaba estampando el árbol en la entrada. Pasar `null` a ciegas rompería
   *   la primera mitad de esa propiedad.
   * - la URL: sin ella (`undefined`) Next NO despacha `ACTION_RESTORE`, y sin
   *   ese despacho no hay `HistoryUpdater` que selle nada. Es el argumento del
   *   que depende TODO el arreglo.
   */
  it("pasa el estado actual y la URL actual, que es lo que decide la rama del parche de Next", () => {
    const estado = { __NA: true, marca: "prueba" };
    window.history.replaceState(estado, "", "/#contact");
    replaceState.mockClear();
    renderHook(() => useHashHistorySeal());

    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(replaceState).toHaveBeenCalledWith(
      window.history.state,
      "",
      window.location.href,
    );
    expect(
      window.history.state,
      "el estado de la entrada se conserva tal cual: este hook sella, no inventa estado",
    ).toMatchObject(estado);
  });

  it("no navega ni cambia la URL: la entrada se reescribe donde está", () => {
    window.history.replaceState(null, "", "/#contact");
    renderHook(() => useHashHistorySeal());
    const antes = window.location.href;

    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(window.location.href).toBe(antes);
  });

  /*
   * NO HAY BUCLE, y esta es la comprobación que lo ata: `replaceState` no
   * dispara `hashchange` (ni en la plataforma ni en jsdom), así que sellar no
   * puede volver a llamarse a sí mismo. Sin esta condición el hook sería una
   * bomba de relojería silenciosa.
   */
  it("sellar no vuelve a dispararse a sí mismo", () => {
    renderHook(() => useHashHistorySeal());

    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(replaceState).toHaveBeenCalledTimes(1);
  });

  it("un fragmento nuevo vuelve a sellar: no es una sola vez y ya", () => {
    renderHook(() => useHashHistorySeal());

    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(replaceState).toHaveBeenCalledTimes(2);
  });

  it("al desmontar retira su escucha", () => {
    const { unmount } = renderHook(() => useHashHistorySeal());

    unmount();
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(
      replaceState,
      "un listener que sobrevive al desmontaje sella entradas de un árbol que ya no existe",
    ).not.toHaveBeenCalled();
  });
});
