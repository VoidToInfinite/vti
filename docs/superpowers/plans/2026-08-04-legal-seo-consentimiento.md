# Plan — Páginas legales, SEO/sitemap y consentimiento configurable

**Spec:** `docs/superpowers/specs/2026-08-04-legal-seo-consentimiento-design.md` · **HEAD de partida:** `aec8c48` · **Rama:** `feature/gdpr-legal-terms-accessibility`

**Orquestación (encargo del usuario):** Opus planifica, revisa, integra y documenta; **Sonnet** ejecuta cada flujo como subagente. Un flujo = un subagente, foco único. La síntesis y la decisión se quedan en el hilo principal.

**Baseline medida en este HEAD:** 735 tests / 62 ficheros verdes · `typecheck` 0 · `lint` 0 · `check-format` señala solo `graphify-out/**`.

---

## Fases

### Fase 0 — reconocimiento (hecho, 3 subagentes en paralelo)

Tema y patrones del repo · capacidades reales de Next 16.2.11 en `output: "export"` · normativa española/europea con fuente oficial. Salidas incorporadas a la spec (§1.1 hallazgos H1-H5, §4 mapeo normativo).

### Fase 1 — flujos independientes (3 subagentes Sonnet en paralelo)

| Flujo | Alcance | Ficheros exclusivos |
| --- | --- | --- |
| **S1 · SEO** | `site.ts`, `buildMetadata()`, JSON-LD, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` (D3-D9) | `src/config/site*`, `src/seo/**`, `app/{sitemap,robots}.ts*`, `app/opengraph-image.tsx` |
| **S2 · Legal** | `legal.ts`, `cookies.ts`, `LegalHeader`, `LegalDocument`, 4 rutas, `legal.json` es/en (D1, D20-D23, §4) | `src/config/{legal,cookies}*`, `src/components/legal/**`, `src/i18n/locales/*/legal.json`, `app/{privacidad,terminos,accesibilidad,aviso-legal}/**`, `app/legal-pages.test.tsx` |
| **S3 · Consentimiento** | Almacenamiento versionado, contexto, banner, panel modal, `consent.json` es/en (D10-D17) | `src/consent/**`, `src/components/consent/**`, `src/i18n/locales/*/consent.json` |

Sin solapes de fichero entre los tres. **Puerta de fase:** los tres verdes + `pnpm typecheck` + `pnpm lint`.

**Dependencia declarada:** S2 necesita el tipo de `cookies.ts` para la tabla de la política de privacidad y S3 lo necesita para el panel. `cookies.ts` lo escribe **S2** y S3 lo consume como fichero ya existente — por eso S3 recibe en su instrucción el contrato literal del módulo, no una referencia a un fichero que aún no existe cuando arranca. Si S3 llega antes, trabaja contra el contrato escrito.

### Fase 2 — integración (hilo principal, Opus)

Todos los ficheros compartidos, en un solo autor para que no haya escrituras cruzadas: `app/layout.tsx` · `app/providers.tsx` · `src/i18n/config.ts` · `src/i18n/I18nProvider.tsx` (+ su test, D18) · `src/i18n/locales.test.ts` · `src/config/links.ts` + `links.test.ts` (§7.5) · `Footer.tsx` + `Footer.test.tsx` (D19) · `common.json` es/en.

### Fase 3 — revisión, verificación y cierre (hilo principal, Opus)

1. Revisión de código de los tres flujos, diff completo línea a línea.
2. Auditoría adversarial en subagente independiente: inyectar a mano el bug que cada test nuevo dice proteger y comprobar que se pone rojo; barrer prosa obsoleta y referencias huérfanas; recalcular las afirmaciones normativas contra las fuentes citadas.
3. **`pnpm build` real** + inspección del `out/` (§8.1, §8.2) — única forma de verificar H1 y H4.
4. Navegador real: 4 rutas, banner, panel solo con teclado, 375 px, dos temas (§8.3).
5. Gate completo con salida literal.
6. `graphify update .`
7. Registro: `task/todo.md`, `task/lessons.md`, vault (`01-Projects/vti.md` + copia de spec y plan).

---

## Contratos comunes a todos los subagentes

Los de §6 de la spec, sin excepción. Y tres recordatorios que este repo ha pagado caro:

- Un **backtick** en un comentario `/* */` dentro de un template de styled-components cierra el template y rompe el build. Comentarios sin comillas de ningún tipo.
- **Nada de `localStorage` en render.** Solo en `useEffect`, o se rompe la hidratación del export estático.
- Un test que pasa en verde **con y sin** el arreglo no ata nada. Todo test nuevo que afirme proteger algo se ejecuta una vez con el bug inyectado a mano.
