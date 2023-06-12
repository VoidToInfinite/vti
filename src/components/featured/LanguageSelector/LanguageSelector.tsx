/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Image from "next/image";
import React, { useContext, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useOnClickOutside from "@/hooks/useOnClickOutside";
import Box from "@/components/containers/Box/Box";
import useWindowSize from "@/hooks/useWindowSize";
import generateUUID from "@/utils/generateUUID";
import esES from "@/assets/images/lang/esES.svg";
import enUS from "@/assets/images/lang/enUS.svg";
import {
  AppNotificationContext,
  IAppNotificationContext,
} from "@/providers/AppNotificationProvider";
import ILanguageSelector from "./LanguageSelector.types";
import ScLanguageSelector, {
  ScLanguageSelectorHeader,
  ScLanguageSelectorItem,
  ScLanguageSelectorMenu,
} from "./LanguageSelector.sc";
import { INotification } from "../PopupNotification/PopupNotification.types";

const LANGS = [
  {
    code: "es",
  },
  {
    code: "en",
  },
];

// eslint-disable-next-line max-lines-per-function
const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const windowSize = useWindowSize();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);
  const { addNotification } = useContext<IAppNotificationContext>(
    AppNotificationContext
  );
  //
  useOnClickOutside([ref], () => setIsOpen(false));

  const LANGUAGES: Record<string, ILanguageSelector> = {
    es: {
      banner: esES,
      code: t("Common.Lang.es.label"),
      label: t("Common.Lang.es.label"),
      name: t("Common.Lang.es.name"),
      title: t("Common.Lang.es.title"),
    },
    en: {
      banner: enUS,
      code: t("Common.Lang.en.label"),
      label: t("Common.Lang.en.label"),
      name: t("Common.Lang.en.name"),
      title: t("Common.Lang.en.title"),
    },
  };

  const onChangeLang = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    const LANG_CODE = e.currentTarget.title;
    i18n
      .changeLanguage(LANG_CODE)
      .then(() => {
        const successNotify: INotification = {
          id: generateUUID(false),
          type: "success",
          title: "Seleccion de idioma",
          description: "Idioma cambiado correctamene.",
        };
        // dispatch(setNotifications([...notifys, successNotify]));
        addNotification(successNotify);
      })
      .catch(() => {
        const errorNotify: INotification = {
          id: generateUUID(false),
          type: "error",
          title: "Seleccion de idioma",
          description: "Error al intentar cambiar de idioma.",
        };
        // dispatch(setNotifications([...notifys, errorNotify]));
        addNotification(errorNotify);
      });
  };

  return (
    <ScLanguageSelector
      ref={ref}
      className={`${isOpen ? "openLanguageSelector" : ""}`}
    >
      <ScLanguageSelectorHeader onClick={() => setIsOpen(!isOpen)}>
        <Box
          height="24px"
          width="36px"
        >
          <Image
            alt={LANGUAGES[i18n.language].name}
            src={LANGUAGES[i18n.language].banner}
            title={LANGUAGES[i18n.language].title}
          />
        </Box>
        <p>
          {windowSize.width < 768
            ? LANGUAGES[i18n.language].name
            : LANGUAGES[i18n.language].code.toUpperCase()}
        </p>
      </ScLanguageSelectorHeader>
      <ScLanguageSelectorMenu
        id="menu"
        className={`${isOpen ? "openLanguageSelectorMenu" : ""}`}
      >
        {React.Children.toArray(
          LANGS.map(({ code }) => (
            <ScLanguageSelectorItem
              title={code}
              onClick={onChangeLang}
            >
              <Box
                height="24px"
                width="38px"
              >
                <Image
                  alt={LANGUAGES[code].name}
                  src={LANGUAGES[code].banner}
                  title={LANGUAGES[code].title}
                />
              </Box>
              <p>
                {windowSize.width < 768
                  ? LANGUAGES[code].name
                  : LANGUAGES[code].code.toUpperCase()}
              </p>
            </ScLanguageSelectorItem>
          ))
        )}
      </ScLanguageSelectorMenu>
    </ScLanguageSelector>
  );
};

export default LanguageSelector;
