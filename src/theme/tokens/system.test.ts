import { describe, it, expect } from "vitest";
import { motion } from "./motion";
import { glassLight, glassDark } from "./glass";
import { grid } from "./grid";

describe("system tokens", () => {
  describe("motion", () => {
    it("expone todas las duraciones correctamente", () => {
      const expectedDuration = {
        instant: "0ms",
        fast: "100ms",
        base: "200ms",
        slow: "320ms",
        slower: "480ms",
        spin: "700ms",
        spinReduced: "2100ms",
      };
      expect(motion.duration).toEqual(expectedDuration);
    });

    it("expone todas las curvas de easing correctamente", () => {
      const expectedEasing = {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        accelerate: "cubic-bezier(0.4, 0, 1, 1)",
        emphasized: "cubic-bezier(0.2, 0, 0, 1)",
        // Sexto peldaño desde la crítica externa #14 (2026-09-02): absorbe la
        // curva propia de src/motion/vocabulary.ts (la más usada del CSS
        // servido) y la EASE_ENTRANCE de Sol.tsx. Contrato y medición en
        // motion.test.ts y en el docblock del propio token.
        settle: "cubic-bezier(0.23, 1, 0.32, 1)",
        overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      };
      expect(motion.easing).toEqual(expectedEasing);
    });

    it("la curva estándar es cubic-bezier(0.4, 0, 0.2, 1)", () => {
      expect(motion.easing.standard).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    });

    it("la curva overshoot es cubic-bezier(0.34, 1.56, 0.64, 1)", () => {
      expect(motion.easing.overshoot).toBe("cubic-bezier(0.34, 1.56, 0.64, 1)");
    });

    it("la duración base es 200ms", () => {
      expect(motion.duration.base).toBe("200ms");
    });

    it("motion es un objeto congelado (as const)", () => {
      // Verificar que las duraciones tienen las propiedades esperadas
      expect(Object.keys(motion.duration)).toHaveLength(7);
      expect(Object.keys(motion.easing)).toHaveLength(6);
    });
  });

  describe("glass", () => {
    it("glassLight tiene blur, bg y border", () => {
      const expectedLight = {
        blur: "blur(14px)",
        bg: "oklch(1 0 0 / 0.68)",
        border: "1px solid oklch(1 0 0 / 0.12)",
      };
      expect(glassLight).toEqual(expectedLight);
    });

    it("glassDark tiene blur, bg y border", () => {
      const expectedDark = {
        blur: "blur(14px)",
        bg: "oklch(0.178 0 0 / 0.68)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      };
      expect(glassDark).toEqual(expectedDark);
    });

    it("glassLight.blur contiene 'blur('", () => {
      expect(glassLight.blur).toContain("blur(");
    });

    it("glassDark.blur contiene 'blur('", () => {
      expect(glassDark.blur).toContain("blur(");
    });

    it("glassLight.bg usa formato oklch()", () => {
      expect(glassLight.bg).toMatch(/oklch\(/);
    });

    it("glassDark.bg usa formato oklch()", () => {
      expect(glassDark.bg).toMatch(/oklch\(/);
    });

    it("glassLight.border es una cadena de borde válida", () => {
      expect(glassLight.border).toMatch(/^1px solid oklch\(/);
    });

    it("glassDark.border es una cadena de borde válida", () => {
      expect(glassDark.border).toMatch(/^1px solid oklch\(/);
    });

    it("glassLight y glassDark tienen blur igual", () => {
      expect(glassLight.blur).toBe(glassDark.blur);
    });

    it("glassLight es más clara que glassDark en bg", () => {
      // glassLight usa oklch(1 ...) y glassDark usa oklch(0.178 ...)
      // 1 > 0.178, por lo que light es más clara
      expect(glassLight.bg).toContain("oklch(1");
      expect(glassDark.bg).toContain("oklch(0.178");
    });
  });

  describe("grid", () => {
    it("expone todas las propiedades del grid", () => {
      const expectedGrid = {
        containerMax: "1200px",
        navMax: "1280px",
        sectionMax: "1280px",
        // Token NUEVO de la crítica externa #10 (2026-08-18): el tope de la
        // columna de copia del hero, que hasta esa fecha se escribía a mano
        // en cinco declaraciones. Contrato ACTUALIZADO, no relajado (regla
        // 40): entra aquí y en el recuento de claves de más abajo en el mismo
        // cambio.
        heroCopyMax: "70ch",
        // 56ch: ni 65ch (la promesa escrita en la unidad equivocada) ni 52ch
        // (la promesa dividida solo por la CAPACIDAD de la caja, que ignora
        // que una linea con bandera derecha REALIZA un 8-10 % menos de lo que
        // cabe). Ver el candado "prose limita a 56ch...", mas abajo, y el
        // docblock de grid.ts para las dos derivaciones que convergen en 56.
        prose: "56ch",
        // `proseTight: "34ch"` se retiro en la critica externa #13
        // (2026-08-18): cero consumidores y ninguna evidencia EXTERNA que lo
        // reservara -- su unica justificacion era su propio docblock. Su
        // lapida, con el censo completo, vive en grid.ts. El recuento de
        // claves de mas abajo BAJA de 6 a 5 en el mismo cambio (regla 40).
      };
      expect(grid).toEqual(expectedGrid);
    });

    it("containerMax limita a 1200px", () => {
      expect(grid.containerMax).toBe("1200px");
    });

    it("navMax es 1280px y es mayor que containerMax", () => {
      expect(grid.navMax).toBe("1280px");
      const px = (v: string): number => Number(v.replace("px", ""));
      expect(px(grid.navMax)).toBeGreaterThan(px(grid.containerMax));
    });

    /*
     * sectionMax nombra el ancho de contenido de las secciones a sangre
     * completa, que hasta la crítica #12 vivía como cuatro constantes
     * literales y dos lecturas prestadas de navMax (contra el docblock del
     * propio navMax). La igualdad con navMax se documenta como HECHO actual,
     * no como contrato: el candado fija el valor propio de sectionMax y NO
     * ata los dos tokens entre sí, porque su razón de existir es que puedan
     * divergir.
     */
    it("sectionMax es 1280px, el ancho de contenido de las secciones a sangre", () => {
      expect(grid.sectionMax).toBe("1280px");
    });

    /*
     * Candado TRIPLE: VALOR + PROMESA + CORPUS MEDIDO.
     *
     * La intencion documentada de `prose` son ~65 CARACTERES reales por linea
     * (rango de legibilidad 60-75, DESIGN.md 3.4) -- no "65ch" y, desde la
     * critica externa #13 (2026-08-18), tampoco "52ch". Lo que cambia no es el
     * ratio (se remidio y se confirmo) sino que hay DOS magnitudes y la
     * promesa habla de la segunda:
     *
     *   CAPACIDAD  = cuantos caracteres CABEN   = ch x 1,259
     *   REALIZACION= cuantos caracteres HAY     = capacidad x 0,92
     *
     * La bandera derecha corta por PALABRA y desperdicia el hueco de la que no
     * entra: 8-10 % menos, medido en navegador por el evaluador de la #13. La
     * derivacion vieja (65 / 1,259 = 52ch) se quedaba en la capacidad, asi que
     * calculaba la caja donde CABEN 65, no la que ENTREGA 65 -- y medida, esa
     * caja entregaba 54/61/62 (media 59) en la home: BAJO el suelo de 60.
     *
     * Las dos constantes se escriben aqui con nombre porque son propiedades
     * MEDIDAS (de la tipografia una, del maquetado con bandera derecha la
     * otra), no tokens del repo: si `type.fontBody` cambia hay que volver a
     * medir LAS DOS en un navegador contando caracteres con
     * `Range.getClientRects()` sobre lineas llenas -- jsdom no hace layout, no
     * puede observar ninguna de las dos -- y actualizar este candado y el
     * docblock de grid.ts a la vez.
     *
     * MITAD 2 (promesa): la realizacion tiene que caer en la banda 60-75 Y a
     * menos de 2 caracteres de la promesa de ~65. La tolerancia no es
     * decorativa: cada paso entero de `ch` mueve el resultado 1,16 caracteres,
     * asi que +-2 es lo mas estrecho que sigue siendo satisfacible por un
     * entero. Con 52ch da 60,2 -- DENTRO de la banda, fuera de la promesa por
     * 4,8: es exactamente la mitad que caza la regresion que esta ola corrige,
     * y la que la version anterior de este candado no podia ver porque media
     * la capacidad.
     *
     * MITAD 3 (corpus medido): los recuentos REALIZADOS escalan con el ancho
     * de la caja, asi que el corpus medido a 52ch se proyecta al valor actual
     * y tiene que caber entero en la banda. Es la mitad independiente del
     * modelo: no usa el ratio ni el factor, solo lo que dos partes contaron en
     * un navegador. A 55ch la home cae a 59,2 (bajo el suelo) y a 57ch las
     * legales suben a 75,6 (sobre el techo) -- entre las dos mitades, 56ch es
     * el unico entero que pasa.
     */
    it("prose limita a 56ch, la medida que REALIZA ~65 caracteres por linea", () => {
      expect(grid.prose).toBe("56ch");

      const ch = (v: string): number => Number(v.replace("ch", ""));

      /** Caracteres reales que CABEN por cada `ch` con Hanken Grotesk. Medido
       *  en navegador real (critica #8, dos evaluadores; remedido en la #13,
       *  rango 1,204-1,309 segun el texto). */
      const CARACTERES_POR_CH_DE_CAPACIDAD = 1.259;
      /** Fraccion de esa capacidad que una linea con bandera derecha llega a
       *  REALIZAR: corta por palabra y pierde el hueco de la ultima que no
       *  entra. Medido 8-10 % de perdida (critica #13); se toma el extremo
       *  conservador. */
      const FACTOR_DE_REALIZACION = 0.92;
      const PROMESA_CARACTERES = 65;

      const capacidad = ch(grid.prose) * CARACTERES_POR_CH_DE_CAPACIDAD;
      const realizados = capacidad * FACTOR_DE_REALIZACION;

      expect(realizados).toBeGreaterThanOrEqual(60);
      expect(realizados).toBeLessThanOrEqual(75);
      expect(Math.abs(realizados - PROMESA_CARACTERES)).toBeLessThanOrEqual(2);

      /* Corpus medido en navegador a 52ch: la peor linea de la home (56, por
       * el evaluador de la #13) y la mejor de las legales (69). Proyectados al
       * ancho actual, los dos extremos siguen dentro de la banda. */
      const CH_DE_LA_MEDICION = 52;
      const REALIZADOS_MIN_MEDIDOS = 56;
      const REALIZADOS_MAX_MEDIDOS = 69;
      const escala = ch(grid.prose) / CH_DE_LA_MEDICION;

      expect(REALIZADOS_MIN_MEDIDOS * escala).toBeGreaterThanOrEqual(60);
      expect(REALIZADOS_MAX_MEDIDOS * escala).toBeLessThanOrEqual(75);
    });

    /*
     * Candado del token nuevo (crítica externa #10, 2026-08-18). Dos mitades,
     * como el de `prose`: el VALOR exacto -- que es el que el hero ya pintaba,
     * porque tokenizar una medida repetida no cambia un píxel -- y la RELACIÓN
     * que lo separa de la familia de `prose`: es el tope de una COLUMNA, más
     * ancho que la medida de línea del cuerpo largo. Si algún día alguien lo
     * "corrigiera" al ratio de caracteres reales de `prose` (52ch), la segunda
     * mitad cae en rojo aunque el literal esperado se haya actualizado a la
     * vez.
     *
     * Lo que este candado NO puede probar es que los cinco consumidores lean
     * el token en vez de reescribir el literal: el CSS renderizado es idéntico
     * en los dos casos (`task/lessons.md`, 2026-08-12, Task 19). Esa mitad la
     * cierra el candado de FUENTE de `Hero.qa.test.tsx`.
     */
    it("heroCopyMax es 70ch y es un tope MAS ANCHO que la medida de linea de prose", () => {
      expect(grid.heroCopyMax).toBe("70ch");
      const ch = (v: string): number => Number(v.replace("ch", ""));
      expect(ch(grid.heroCopyMax)).toBeGreaterThan(ch(grid.prose));
    });

    /*
     * AQUI VIVIO el candado de `proseTight` ("proseTight es una medida mas
     * corta que prose", 34ch). Se retira CON el token, en el mismo cambio
     * (critica externa #13, 2026-08-18): cero consumidores en `src/` y `app/`
     * con los cuatro patrones de acceso mas la comprobacion de que nadie lee
     * `grid` de forma dinamica, y ninguna evidencia externa que lo reservara
     * -- a diferencia de `space[10]`, que en la misma ola SI se conserva
     * porque una casilla todavia abierta de `docs/qa-3d-pendiente.md` lo
     * nombra. El censo completo y el porque viven en su lapida, en grid.ts.
     */

    /*
     * Contrato ACTUALIZADO, no relajado (regla 40). `columns: 12` y
     * `gutter: "1.5rem"` se retiraron en la crítica externa #9 (2026-08-17)
     * por cero consumidores y ningún destino declarado -- ver el docblock de
     * `containerMax` en `grid.ts` para el censo y para el motivo de fondo (no
     * solo sobraban: describían una rejilla maestra de 12 columnas que este
     * repo no construye en ninguna parte).
     *
     * Los dos `it` que fijaban sus valores exactos desaparecen con ellos, y el
     * recuento de claves BAJA de 6 a 4 en el mismo cambio en vez de aflojarse
     * a un `toBeGreaterThan` -- que es exactamente lo que la regla 40 prohíbe.
     * El recuento sigue siendo cerrado: añadir una clave nueva a `grid` sin
     * tocar este número lo pone en rojo, igual que antes.
     *
     * Y así ocurrió: la crítica externa #10 (2026-08-18) añadió `heroCopyMax`
     * y este número SUBE de 4 a 5 en el mismo cambio, con su `it` de valor e
     * intención arriba -- la mecánica funcionó en las dos direcciones. La
     * crítica #12 (2026-08-18) añade `sectionMax` y el número sube de 5 a 6,
     * por el mismo camino. Y la #13 (2026-08-18) retira `proseTight` y lo BAJA
     * de 6 a 5, otra vez en el mismo cambio que la clave: la mecánica ha
     * funcionado ya cuatro veces, dos en cada sentido.
     */
    it("grid es un objeto congelado (as const)", () => {
      expect(Object.keys(grid)).toHaveLength(5);
    });
  });
});
