"use client";

import { Fragment, type ReactElement, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LEGAL_ENTITY, LEGAL_VERSIONS, PLACEHOLDER } from "@/config/legal";
import { navLocale } from "@/config/navigation";
import { routePath } from "@/config/site";
import { focusNavAnchorTarget } from "@/components/layout/Navbar/navAnchorFocus";
import { useDocumentMeta } from "@/seo/useDocumentMeta";
import { STORAGE_REGISTRY } from "@/config/storage";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import i18n, { initI18n } from "@/i18n/config";
import esLegal from "@/i18n/locales/es/legal.json";
import enLegal from "@/i18n/locales/en/legal.json";
import { splitAutoLinks, type LegalAutoLink } from "./legalAutoLinks";
import {
  ScBackLink,
  ScCaption,
  ScDd,
  ScDl,
  ScDlRow,
  ScDt,
  ScInlineLink,
  ScList,
  ScListItem,
  ScMain,
  ScMark,
  ScNote,
  ScParagraph,
  ScSection,
  ScSectionHeading,
  ScTable,
  ScTableWrap,
  ScTd,
  ScTh,
  ScTitle,
  ScToc,
  ScTocHeading,
  ScTocItem,
  ScTocLink,
  ScTocList,
  ScVersionMeta,
  ScStorageKind,
} from "./legalPage.parts";

/**
 * Renderer único de las páginas legales (D21 de la spec
 * 2026-08-04-legal-seo-consentimiento-design.md): cada documento es un árbol
 * de datos en `src/i18n/locales/{es,en}/legal.json` (`Legal.<docKey>`), y
 * este componente es el ÚNICO lugar que sabe pintarlo. Cada documento ×
 * dos idiomas como JSX serían ficheros que divergen a la primera corrección;
 * con un solo renderer, el candado de paridad de `locales.test.ts` (rutas
 * recursivas, incluidos índices de array) compara la ESTRUCTURA del
 * documento, no solo sus títulos.
 */

/*
 * Registro del namespace `legal` A NIVEL DE MÓDULO (auditoría de rendimiento
 * 2026-08-08), NUNCA dentro de un `useEffect` ni del cuerpo del componente.
 *
 * `src/i18n/config.ts` ya no incluye `legal` en `resources`: su JSON pesa
 * ~72 KB (16,8 KB gzip) y hasta esta revisión viajaba en el chunk COMÚN de
 * la home, que lo descargaba aunque el visitante nunca abriera
 * `/privacidad` ni `/aviso-legal`. Este componente es el ÚNICO consumidor de
 * `useTranslation("legal")` en todo el repo, así que es también el único
 * sitio que tiene que cargarlo -- y el peso viaja entonces en el chunk del
 * segmento legal (`app/privacidad`, `app/aviso-legal`), que Next ya separa
 * del de la home.
 *
 * Por qué a nivel de módulo y no en un `useEffect`: el contenido legal TIENE
 * que estar en el HTML PRERENDERIZADO de esas rutas (para que Google lo
 * indexe sin ejecutar JS) -- un `useEffect` corre DESPUÉS de la primera
 * pintura y del prerenderizado estático, así que el HTML servido llegaría
 * sin texto. Next.js evalúa el módulo de un Client Component TAMBIÉN durante
 * el prerenderizado estático (así genera el HTML inicial que después
 * hidrata): el código a nivel de módulo corre antes de que React invoque la
 * función del componente, en las DOS fases (servidor y cliente). Para cuando
 * `LegalDocument()` llama a `useTranslation("legal")`, el namespace ya está
 * poblado, sea cual sea la fase.
 *
 * `initI18n()` ANTES de `addResourceBundle` -- no al revés, y no omitido --
 * por una razón verificada leyendo la fuente de `i18next`
 * (`node_modules/i18next/dist/cjs/i18next.js`, método `init()`):
 * `this.store = new ResourceStore(this.options.resources, this.options)`
 * CONSTRUYE UN ALMACÉN NUEVO a partir de la opción `resources`, descartando
 * cualquier bundle añadido antes de que `init()` corriera. Si este módulo se
 * evaluara ANTES que `I18nProvider.tsx` (el orden real entre el árbol de
 * `layout.tsx` y el de una página concreta lo decide el bundler de Next, no
 * algo que este archivo pueda asumir) y llamara a `addResourceBundle` sin
 * pasar antes por `initI18n()`, el `init()` posterior de `I18nProvider`
 * BORRARÍA el bundle de `legal` recién añadido. Llamar aquí a `initI18n()`
 * -- idempotente, con guarda propia en `config.ts` -- garantiza que
 * `init()` YA ha corrido (lo ejecuta esta misma llamada si nadie lo hizo
 * antes, o es un no-op si `I18nProvider.tsx` ya lo hizo) antes de añadir
 * `legal`, sin importar qué módulo se evalúe primero.
 */
initI18n();
i18n.addResourceBundle("es", "legal", esLegal);
i18n.addResourceBundle("en", "legal", enLegal);

export type LegalDocKey = "privacy" | "legalNotice";

interface LegalDocumentProps {
  docKey: LegalDocKey;
}

interface DlItemData {
  term: string;
  description: string;
}

type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "dl"; items: DlItemData[] }
  | { kind: "note"; text: string }
  | { kind: "entity" }
  | { kind: "storage" };

interface LegalSectionData {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

interface LegalDocData {
  title: string;
  description: string;
  intro: string;
  sections: LegalSectionData[];
}

interface EntityLabels {
  name: string;
  legalForm: string;
  taxId: string;
  address: string;
  registry: string;
  contactEmail: string;
  dpo: string;
}

interface StorageTableLabels {
  id: string;
  purpose: string;
  kind: string;
  duration: string;
  provider: string;
  persistent: string;
}

/** Un tramo de texto, marcado o no como dato pendiente (D23). Función pura y
 *  exportada a propósito: se testea aparte de cualquier render. */
export interface MarkerSegment {
  text: string;
  isPlaceholder: boolean;
}

/**
 * Parte un texto en tramos alrededor de las ocurrencias literales de
 * `PLACEHOLDER` (D23): cada ocurrencia queda marcada, el resto del texto no.
 * Soporta cero, una o varias ocurrencias en el mismo texto.
 */
export function splitPlaceholderMarkers(text: string): MarkerSegment[] {
  if (!text.includes(PLACEHOLDER)) {
    return [{ text, isPlaceholder: false }];
  }
  const parts = text.split(PLACEHOLDER);
  const segments: MarkerSegment[] = [];
  parts.forEach((part, index) => {
    if (part !== "") {
      segments.push({ text: part, isPlaceholder: false });
    }
    if (index < parts.length - 1) {
      segments.push({ text: PLACEHOLDER, isPlaceholder: true });
    }
  });
  return segments;
}

/**
 * Un destino de `legalAutoLinks.ts` pintado como enlace real dentro de la
 * prosa legal (crítica #13, T1).
 *
 * Lee `Common.Nav.newTab` del namespace `common` con una segunda llamada a
 * `useTranslation`, el mismo patrón que ya usan `Story.tsx` y `Contact.tsx`
 * (`tCommon`) — no una copia de esa frase dentro de `legal.json`, que sería
 * una segunda fuente de verdad para la misma cadena. Va aquí y no en
 * `MarkedText` porque `MarkedText` se pinta decenas de veces por documento y
 * este componente solo se monta en las apariciones reales de un destino
 * (tres en todo el sitio hoy).
 *
 * El aviso solo acompaña a los destinos EXTERNOS. Un `mailto:` no abre una
 * pestaña, delega en la aplicación de correo: mismo criterio ya razonado en
 * `Footer.tsx` para el correo del pie. No se anuncia un cambio de contexto
 * que no ocurre.
 */
function AutoLink({
  text,
  link,
}: {
  text: string;
  link: LegalAutoLink;
}): ReactElement {
  const { t: tCommon } = useTranslation("common");

  if (!link.external) {
    return <ScInlineLink href={link.href}>{text}</ScInlineLink>;
  }

  return (
    <ScInlineLink
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
      <VisuallyHidden> {tCommon("Common.Nav.newTab")}</VisuallyHidden>
    </ScInlineLink>
  );
}

/**
 * Pinta un texto legal con sus dos marcados posibles, en este orden:
 *
 *   1. cada ocurrencia de `PLACEHOLDER` envuelta en `<mark>` (D23): un dato
 *      pendiente se ve, no se disimula;
 *   2. dentro de lo que NO es marcador, cada destino declarado en
 *      `legalAutoLinks.ts` envuelto en un enlace real (crítica #13, T1).
 *
 * El orden importa y no es reversible: el marcador es un centinela de máquina
 * (regla 30 de `RULES.md`) y tiene que trocearse primero para que un destino
 * no pueda quedar a caballo entre un `<mark>` y el texto que lo rodea.
 *
 * Ningún paso añade, quita ni reordena una sola palabra: los dos parten el
 * MISMO string en tramos y lo vuelven a pintar completo.
 */
function MarkedText({
  text,
  placeholderTitle,
}: {
  text: string;
  placeholderTitle: string;
}): ReactElement {
  return (
    <>
      {splitPlaceholderMarkers(text).map((segment, index) =>
        segment.isPlaceholder ? (
          <ScMark
            key={index}
            title={placeholderTitle}
          >
            {segment.text}
          </ScMark>
        ) : (
          <Fragment key={index}>
            {splitAutoLinks(segment.text).map((piece, pieceIndex) =>
              piece.link === null ? (
                <Fragment key={pieceIndex}>{piece.text}</Fragment>
              ) : (
                <AutoLink
                  key={pieceIndex}
                  text={piece.text}
                  link={piece.link}
                />
              ),
            )}
          </Fragment>
        ),
      )}
    </>
  );
}

/**
 * Bloque `entity` (D21): ficha identificativa pintada desde `LEGAL_ENTITY`,
 * con las etiquetas del namespace `legal`.
 *
 * TRES CLASES DE VALOR, y la diferencia entre ellas es justo lo que este
 * bloque tiene que comunicar sin ambigüedad (ver `src/config/legal.ts`):
 *
 *   - Un string real: se pinta tal cual.
 *   - `null`: el dato NO PROCEDE (persona física sin actividad económica).
 *     Es una afirmación sobre el mundo, no un hueco, así que se pinta con
 *     texto localizado y SIN `<mark>`. Marcarlo diría lo contrario de lo que
 *     es cierto.
 *   - `PLACEHOLDER` dentro del string: dato desconocido, va marcado. Hoy no
 *     queda ninguno, pero el camino se conserva vivo a propósito.
 *
 * `dpo === null` conserva su propia rama y su propio texto porque declara
 * algo distinto («no se ha designado DPO», art. 13.1.b RGPD), no «no
 * procede».
 */
function EntityBlock({
  labels,
  dpoNotAppointed,
  notApplicable,
  legalFormText,
  placeholderTitle,
}: {
  labels: EntityLabels;
  dpoNotAppointed: string;
  notApplicable: string;
  legalFormText: string;
  placeholderTitle: string;
}): ReactElement {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: labels.name, value: LEGAL_ENTITY.name },
    /* Resuelto por i18n, no pintado tal cual: `legalForm` es un
       identificador desde que la verificación en navegador lo pilló
       pintando español dentro del documento inglés (ver `legal.ts`). */
    { label: labels.legalForm, value: legalFormText },
    { label: labels.taxId, value: LEGAL_ENTITY.taxId },
    { label: labels.address, value: LEGAL_ENTITY.address },
    { label: labels.registry, value: LEGAL_ENTITY.registry },
    { label: labels.contactEmail, value: LEGAL_ENTITY.contactEmail },
  ];

  return (
    <ScDl>
      {rows.map((row) => (
        <ScDlRow key={row.label}>
          <ScDt>{row.label}</ScDt>
          <ScDd>
            {row.value === null ? (
              notApplicable
            ) : (
              <MarkedText
                text={row.value}
                placeholderTitle={placeholderTitle}
              />
            )}
          </ScDd>
        </ScDlRow>
      ))}
      <ScDlRow>
        <ScDt>{labels.dpo}</ScDt>
        <ScDd>
          {LEGAL_ENTITY.dpo === null ? (
            dpoNotAppointed
          ) : (
            <MarkedText
              text={LEGAL_ENTITY.dpo}
              placeholderTitle={placeholderTitle}
            />
          )}
        </ScDd>
      </ScDlRow>
    </ScDl>
  );
}

/**
 * Bloque `storage` (D21): tabla pintada desde `STORAGE_REGISTRY`
 * (`src/config/storage.ts`), fuente única de lo que este sitio escribe en el
 * equipo del visitante. El nombre y la finalidad de cada entrada viven en
 * `Legal.common.storage.<id>.name`/`.purpose` — desde el 2026-08-08, cuando
 * el namespace `consent` desapareció con el sistema de consentimiento y esas
 * dos cadenas se mudaron aquí, al único namespace que sigue teniéndolas como
 * consumidor.
 */
function StorageBlock({
  labels,
  captionText,
  regionLabel,
  durationLabelFor,
  storageCopy,
}: {
  labels: StorageTableLabels;
  captionText: string;
  regionLabel: string;
  durationLabelFor: (durationDays: number | null) => string;
  storageCopy: (key: string) => string;
}): ReactElement {
  return (
    /*
     * SCROLLER ANUNCIADO Y ALCANZABLE POR TECLADO (crítica #13, T2).
     *
     * El defecto medido: esta tabla mide ~476 px dentro de un contenedor con
     * overflow-x: auto de 342 px a móvil, así que su última columna solo se
     * alcanza desplazando. Con ratón y con gesto funcionaba; por teclado
     * dependía de que el navegador decidiera por su cuenta hacer focusables
     * los scrollers (Chrome moderno sí lo hace, pero no es una garantía del
     * lenguaje ni de las otras familias de motores), y para un lector de
     * pantalla no había nada que anunciara que ahí hay una región que se
     * desplaza.
     *
     * Los tres atributos son un solo patrón y van juntos: `tabIndex={0}` lo
     * mete en el orden de tabulación (WCAG 2.1.1: el contenido que se
     * desplaza tiene que poder operarse con teclado), y `role="region"` con
     * `aria-label` le da el nombre accesible sin el que ese punto de
     * tabulación sería mudo — un `role="region"` sin nombre ni siquiera se
     * expone como landmark. El nombre sale de una clave i18n propia
     * (`Legal.common.storageTable.regionLabel`, es y en) y no del `<caption>`
     * vía `aria-labelledby`: el caption repite el encabezado de la sección,
     * que no dice nada de que aquí haya desplazamiento.
     *
     * El anillo de foco no se declara aquí: `GlobalStyles` ya lo entrega a
     * todo `[tabindex]` con `:focus-visible`.
     */
    <ScTableWrap
      role="region"
      aria-label={regionLabel}
      tabIndex={0}
    >
      <ScTable>
        <ScCaption>{captionText}</ScCaption>
        <thead>
          <tr>
            <ScTh scope="col">{labels.id}</ScTh>
            <ScTh scope="col">{labels.purpose}</ScTh>
            <ScTh scope="col">{labels.kind}</ScTh>
            <ScTh scope="col">{labels.duration}</ScTh>
            <ScTh scope="col">{labels.provider}</ScTh>
          </tr>
        </thead>
        <tbody>
          {STORAGE_REGISTRY.map((entry) => (
            <tr key={entry.id}>
              <ScTd>
                {storageCopy(`Legal.common.storage.${entry.id}.name`)}
              </ScTd>
              <ScTd>
                {storageCopy(`Legal.common.storage.${entry.id}.purpose`)}
              </ScTd>
              <ScTd>
                <ScStorageKind>{entry.kind}</ScStorageKind>
              </ScTd>
              <ScTd>{durationLabelFor(entry.durationDays)}</ScTd>
              <ScTd>{entry.provider}</ScTd>
            </tr>
          ))}
        </tbody>
      </ScTable>
    </ScTableWrap>
  );
}

function renderBlock(
  block: LegalBlock,
  index: number,
  ctx: {
    placeholderTitle: string;
    entityLabels: EntityLabels;
    dpoNotAppointed: string;
    notApplicable: string;
    legalFormText: string;
    storageLabels: StorageTableLabels;
    storageCaption: string;
    storageRegionLabel: string;
    durationLabelFor: (durationDays: number | null) => string;
    storageCopy: (key: string) => string;
  },
): ReactNode {
  switch (block.kind) {
    case "p":
      return (
        <ScParagraph key={index}>
          <MarkedText
            text={block.text}
            placeholderTitle={ctx.placeholderTitle}
          />
        </ScParagraph>
      );
    case "ul":
      return (
        <ScList key={index}>
          {block.items.map((item, itemIndex) => (
            <ScListItem key={itemIndex}>
              <MarkedText
                text={item}
                placeholderTitle={ctx.placeholderTitle}
              />
            </ScListItem>
          ))}
        </ScList>
      );
    case "dl":
      return (
        <ScDl key={index}>
          {block.items.map((item, itemIndex) => (
            <ScDlRow key={itemIndex}>
              <ScDt>
                <MarkedText
                  text={item.term}
                  placeholderTitle={ctx.placeholderTitle}
                />
              </ScDt>
              <ScDd>
                <MarkedText
                  text={item.description}
                  placeholderTitle={ctx.placeholderTitle}
                />
              </ScDd>
            </ScDlRow>
          ))}
        </ScDl>
      );
    case "note":
      return (
        <ScNote key={index}>
          <MarkedText
            text={block.text}
            placeholderTitle={ctx.placeholderTitle}
          />
        </ScNote>
      );
    case "entity":
      return (
        <EntityBlock
          key={index}
          labels={ctx.entityLabels}
          dpoNotAppointed={ctx.dpoNotAppointed}
          notApplicable={ctx.notApplicable}
          legalFormText={ctx.legalFormText}
          placeholderTitle={ctx.placeholderTitle}
        />
      );
    case "storage":
      return (
        <StorageBlock
          key={index}
          labels={ctx.storageLabels}
          captionText={ctx.storageCaption}
          regionLabel={ctx.storageRegionLabel}
          durationLabelFor={ctx.durationLabelFor}
          storageCopy={ctx.storageCopy}
        />
      );
    default:
      return null;
  }
}

export function LegalDocument({ docKey }: LegalDocumentProps): ReactElement {
  /* `activeI18n` (el del árbol, no la instancia de módulo importada arriba):
     en `/en/*` el provider monta un `cloneInstance` con `lng: "en"` y solo
     el hook lo ve — la instancia de módulo se queda en el idioma con que
     arrancó. Se usa para que la salida a la home conserve el idioma
     (crítica #12, P0: `href="/"` expulsaba al castellano). */
  const { t, i18n: activeI18n } = useTranslation("legal");

  // `returnObjects: true` es la única forma de leer un árbol JSON completo
  // (no una hoja de texto) con i18next; el tipado de `t` de este repo no
  // conoce la forma de `legal.json` (no hay augmentación de
  // `CustomTypeOptions`), así que el resultado llega como `unknown` y se
  // afirma su forma aquí, en el único punto que la conoce.
  const doc = t(`Legal.${docKey}`, {
    returnObjects: true,
  }) as unknown as LegalDocData;
  const entityLabels = t("Legal.common.entity", {
    returnObjects: true,
  }) as unknown as EntityLabels;
  const storageLabels = t("Legal.common.storageTable", {
    returnObjects: true,
  }) as unknown as StorageTableLabels;

  /* Nombre accesible del scroller de la tabla de almacenamiento (crítica
     #13, T2). Se lee con una llamada suelta, igual que
     `Legal.common.storageTable.days`, y no desde el objeto `storageLabels`:
     ese objeto tipa las CABECERAS de columna, y esto no es una cabecera. */
  const storageRegionLabel = t("Legal.common.storageTable.regionLabel");
  const placeholderTitle = t("Legal.common.placeholderTitle");
  const dpoNotAppointed = t("Legal.common.dpoNotAppointed");
  const notApplicable = t("Legal.common.notApplicable");
  const legalFormText = t(`Legal.common.legalForm.${LEGAL_ENTITY.legalForm}`);
  const tocLabel = t("Legal.common.tocLabel");
  const backToHome = t("Legal.common.backToHome");
  const versionLabel = t("Legal.common.versionLabel");
  const updatedLabel = t("Legal.common.updatedLabel");
  const { version, updated } = LEGAL_VERSIONS[docKey];

  /*
   * EL TÍTULO DE LA PESTAÑA SIGUE AL IDIOMA (Ola D, 2026-08-16).
   *
   * El defecto era visible dentro de una sola página: con el inglés activo en
   * `/privacidad`, el `<h1>` decía «Privacy policy» mientras `document.title`
   * seguía siendo «Política de privacidad · VoidToInfinite». La pestaña del
   * navegador y el encabezado del documento afirmaban idiomas distintos a la
   * vez, y el título es lo que acaba en el marcador, en el historial y en
   * cualquier cosa que se comparta.
   *
   * Se resuelve aquí y no en la `metadata` de la ruta porque bajo
   * `output: "export"` esa metadata se hornea UNA vez, en castellano, y el
   * idioma lo elige el visitante después. Este componente ya tiene el título
   * y la descripción traducidos en la mano (`doc.title`/`doc.description`,
   * del mismo árbol que pinta el `<h1>` y del mismo del que salió la
   * `metadata` horneada — `app/privacidad/page.tsx` lee esas dos claves del
   * locale español), así que no introduce ninguna fuente de verdad nueva.
   *
   * DESDE LA CRÍTICA EXTERNA #8 el efecto ya no vive aquí: es
   * `useDocumentMeta()` (`src/seo/useDocumentMeta.ts`), compartido con la
   * home y con la 404. La causa raíz de que aquellas dos se quedaran sin
   * título traducido era justamente que este efecto era LOCAL de las
   * legales; extraerlo es lo que impide que las tres rutas vuelvan a
   * divergir, en el comportamiento y en el formato del título.
   */
  useDocumentMeta({ title: doc.title, description: doc.description });

  const durationLabelFor = (durationDays: number | null): string =>
    durationDays === null
      ? storageLabels.persistent
      : t("Legal.common.storageTable.days", { count: durationDays });

  return (
    // id="main" + tabIndex={-1}: destino del SkipLink (Task 2), mismo
    // contrato que app/page.tsx/NotFoundContent.tsx -- ver el docblock de
    // SkipLink.tsx para el porque del -1.
    <ScMain
      id="main"
      tabIndex={-1}
    >
      <ScBackLink
        href={routePath("home", navLocale(activeI18n.language))}
        prefetch={false}
      >
        {backToHome}
      </ScBackLink>
      <ScTitle>{doc.title}</ScTitle>
      <ScVersionMeta>
        {versionLabel} {version} · {updatedLabel}: {updated}
      </ScVersionMeta>
      <ScToc aria-label={tocLabel}>
        <ScTocHeading>{tocLabel}</ScTocHeading>
        <ScTocList>
          {doc.sections.map((section) => (
            <ScTocItem key={section.id}>
              {/* El indice mueve el foco al destino real, igual que las
                  anclas de la nav y los CTAs de seccion (critica #11,
                  hallazgo B2; barrido de la ola F): mismo helper, cero
                  logica duplicada -- pone tabindex="-1" en la seccion si no
                  lo tiene y enfoca sin robar el scroll. El descriptor se
                  construye del propio section.id para que href y foco no
                  puedan divergir. */}
              <ScTocLink
                href={`#${section.id}`}
                onClick={() =>
                  focusNavAnchorTarget({
                    key: section.id,
                    href: `#${section.id}`,
                    kind: "section",
                  })
                }
              >
                {section.heading}
              </ScTocLink>
            </ScTocItem>
          ))}
        </ScTocList>
      </ScToc>
      <ScParagraph>{doc.intro}</ScParagraph>
      {doc.sections.map((section) => (
        <ScSection
          key={section.id}
          id={section.id}
        >
          <ScSectionHeading>{section.heading}</ScSectionHeading>
          {section.blocks.map((block, index) =>
            renderBlock(block, index, {
              placeholderTitle,
              entityLabels,
              dpoNotAppointed,
              notApplicable,
              legalFormText,
              storageLabels,
              storageCaption: section.heading,
              storageRegionLabel,
              durationLabelFor,
              storageCopy: t,
            }),
          )}
        </ScSection>
      ))}
    </ScMain>
  );
}
