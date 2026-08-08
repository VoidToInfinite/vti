"use client";

import { Fragment, type ReactElement, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LEGAL_ENTITY, LEGAL_VERSIONS, PLACEHOLDER } from "@/config/legal";
import { STORAGE_REGISTRY } from "@/config/storage";
import {
  ScBackLink,
  ScCaption,
  ScDd,
  ScDl,
  ScDlRow,
  ScDt,
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

/** Pinta un texto envolviendo cada ocurrencia de `PLACEHOLDER` en `<mark>`
 *  (D23): un dato pendiente se ve, no se disimula. */
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
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Bloque `entity` (D21): ficha identificativa pintada desde `LEGAL_ENTITY`,
 *  con las etiquetas del namespace `legal`. `dpo === null` no es un dato
 *  pendiente (ver `src/config/legal.ts`): se pinta con su propio texto
 *  explicativo, sin marcador. */
function EntityBlock({
  labels,
  dpoNotAppointed,
  placeholderTitle,
}: {
  labels: EntityLabels;
  dpoNotAppointed: string;
  placeholderTitle: string;
}): ReactElement {
  const rows: Array<{ label: string; value: string }> = [
    { label: labels.name, value: LEGAL_ENTITY.name },
    { label: labels.legalForm, value: LEGAL_ENTITY.legalForm },
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
            <MarkedText
              text={row.value}
              placeholderTitle={placeholderTitle}
            />
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
  durationLabelFor,
  storageCopy,
}: {
  labels: StorageTableLabels;
  captionText: string;
  durationLabelFor: (durationDays: number | null) => string;
  storageCopy: (key: string) => string;
}): ReactElement {
  return (
    <ScTableWrap>
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
              <ScTd>{entry.kind}</ScTd>
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
    storageLabels: StorageTableLabels;
    storageCaption: string;
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
          placeholderTitle={ctx.placeholderTitle}
        />
      );
    case "storage":
      return (
        <StorageBlock
          key={index}
          labels={ctx.storageLabels}
          captionText={ctx.storageCaption}
          durationLabelFor={ctx.durationLabelFor}
          storageCopy={ctx.storageCopy}
        />
      );
    default:
      return null;
  }
}

export function LegalDocument({ docKey }: LegalDocumentProps): ReactElement {
  const { t } = useTranslation("legal");

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

  const placeholderTitle = t("Legal.common.placeholderTitle");
  const dpoNotAppointed = t("Legal.common.dpoNotAppointed");
  const tocLabel = t("Legal.common.tocLabel");
  const backToHome = t("Legal.common.backToHome");
  const versionLabel = t("Legal.common.versionLabel");
  const updatedLabel = t("Legal.common.updatedLabel");
  const { version, updated } = LEGAL_VERSIONS[docKey];

  const durationLabelFor = (durationDays: number | null): string =>
    durationDays === null
      ? storageLabels.persistent
      : t("Legal.common.storageTable.days", { count: durationDays });

  return (
    <ScMain>
      <ScBackLink href="/">{backToHome}</ScBackLink>
      <ScTitle>{doc.title}</ScTitle>
      <ScVersionMeta>
        {versionLabel} {version} · {updatedLabel}: {updated}
      </ScVersionMeta>
      <ScToc aria-label={tocLabel}>
        <ScTocHeading>{tocLabel}</ScTocHeading>
        <ScTocList>
          {doc.sections.map((section) => (
            <ScTocItem key={section.id}>
              <ScTocLink href={`#${section.id}`}>{section.heading}</ScTocLink>
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
              storageLabels,
              storageCaption: section.heading,
              durationLabelFor,
              storageCopy: t,
            }),
          )}
        </ScSection>
      ))}
    </ScMain>
  );
}
