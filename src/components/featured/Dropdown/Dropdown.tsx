/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@/components/containers/Box/Box";
import Flex from "@/components/containers/Flex/Flex";
import useOnClickOutside from "@/hooks/useOnClickOutside";
import Button from "../Button/Button";
import ScDropdown, { ScDropdownHeader, ScDropdownMenu } from "./Dropdown.sc";
import Typography from "../Typography/Typography";
import Icon from "../Icon/Icon";

const Dropdown = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <ScDropdown
      ref={ref}
      className={`${isOpen ? "openDropdown" : ""}`}
    >
      <ScDropdownHeader onClick={() => setIsOpen(!isOpen)}>
        <Flex
          container
          height="100%"
          width="100%"
          alignItems="center"
          justifyContent="flex-start"
          flexDirection="row"
          gap="8px"
        >
          <Icon
            name="Language selector"
            src="globe"
            size={24}
            title={t("Common.Lang.title")}
          />
          <Box flexGrow={2}>
            <Typography
              type="p"
              value={t("Common.Lang.title")}
            />
          </Box>
          <Icon
            name="Language selector"
            src="chevronRight"
            size={24}
            title={t("Common.Lang.title")}
          />
        </Flex>
      </ScDropdownHeader>
      <ScDropdownMenu
        id="menu"
        className={`${isOpen ? "openDropdownMenu" : ""}`}
      >
        <Button
          iconSize={20}
          size="xl"
          text={t("Common.Lang.es.name")}
          type="button"
          typeStyle="ghost"
          onClick={() => i18n.changeLanguage("es").then(() => {})}
        />
        <Button
          iconSize={20}
          size="xl"
          text={t("Common.Lang.en.name")}
          type="button"
          typeStyle="ghost"
          onClick={() => i18n.changeLanguage("en").then(() => {})}
        />
      </ScDropdownMenu>
    </ScDropdown>
  );
};

export default Dropdown;
