/* eslint-disable no-plusplus */
import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Box from "@/components/containers/Box/Box";
import {
  areDateEquals,
  getDaysOfDate,
  getMonthsName,
  getWeekDays,
} from "@/utils/calendarIntl";
import ICalendar from "./Calendar.types";
import ScCalendar, {
  ScCalendarContent,
  ScCalendarHeader,
  ScCalendarWeekdays,
} from "./Calendar.sc";
import Button from "../Button/Button";
import Typography from "../Typography/Typography";

// eslint-disable-next-line max-lines-per-function
const Calendar: React.FC<ICalendar> = () => {
  const [calendarID] = useState<string>(
    uuidv4().replace(/(-|undefined)+/g, "")
  );
  const [calendarHeaderID] = useState<string>(
    uuidv4().replace(/(-|undefined)+/g, "")
  );
  const [calendarWeekdaysID] = useState<string>(
    uuidv4().replace(/(-|undefined)+/g, "")
  );
  const [calendarContentID] = useState<string>(
    uuidv4().replace(/(-|undefined)+/g, "")
  );
  const [calendarInfoMonthID] = useState<string>(
    uuidv4().replace(/(-|undefined)+/g, "")
  );
  const [calendarHeaderLeftButtonID] = useState<string>(
    uuidv4().replace(/(-|undefined)+/g, "")
  );
  const [calendarHeaderRightButtonID] = useState<string>(
    uuidv4().replace(/(-|undefined)+/g, "")
  );
  const [calendarContent, setCalendarContent] = useState<string[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [months] = useState<string[]>(getMonthsName("en-us"));
  const [weekDays] = useState<string[]>(getWeekDays("en-us"));

  const reset = (action: string) => {
    setMonth(action === "previous" ? month - 1 : month + 1);
    if (action === "previous") {
      if (month < 1) {
        setMonth(12);
        setYear(year - 1);
      }
    } else if (action === "next") {
      if (month > 11) {
        setMonth(1);
        setYear(year + 1);
      }
    }
  };
  //
  const handlePreviusMonth = () => {
    reset("previous");
  };
  const handleNextMonth = () => {
    reset("next");
  };

  useEffect(() => {
    const updatedMonthDayList = getDaysOfDate(year, month, weekDays);

    // eslint-disable-next-line max-statements
    const createCells = (): string[] => {
      const content: string[] = [];
      let r = 0; // date value: 0 = en, 1 = es
      let update = false;
      while (!update) {
        if (weekDays[r] === updatedMonthDayList[0]?.weekDay) {
          update = true;
        } else {
          content.push("");
          r++;
        }
      }
      for (let columnIndex = 0; columnIndex < 42 - r; columnIndex++) {
        if (columnIndex >= updatedMonthDayList.length) {
          content.push("");
        } else {
          const { day } = updatedMonthDayList[columnIndex];
          content.push(`${day}`);
        }
      }
      return content;
    };

    const updatedCells = createCells();
    setCalendarContent(updatedCells);
  }, [month, year, weekDays]);

  return (
    <ScCalendar id={calendarID}>
      <ScCalendarHeader id={calendarHeaderID}>
        <Button
          id={calendarHeaderLeftButtonID}
          type="button"
          size="sm"
          typeStyle="ghost"
          text=""
          iconSize={24}
          showLeftIcon
          leftIcon={{
            name: "chevron-right",
            src: "chevronLeft",
            title: "Previus month",
          }}
          onClick={handlePreviusMonth}
        />
        <Typography
          id={calendarInfoMonthID}
          type="p1"
          value={`${months[month - 1]} ${year}`}
        />
        <Button
          id={calendarHeaderRightButtonID}
          type="button"
          size="sm"
          typeStyle="ghost"
          text=""
          iconSize={24}
          showLeftIcon
          leftIcon={{
            name: "chevron-right",
            src: "chevronRight",
            title: "Next month",
          }}
          onClick={handleNextMonth}
        />
      </ScCalendarHeader>
      <ScCalendarWeekdays id={calendarWeekdaysID}>
        {React.Children.toArray(
          weekDays.map((day) => (
            <Box height="40px">
              <Typography
                type="p1"
                value={day}
              />
            </Box>
          ))
        )}
      </ScCalendarWeekdays>
      <ScCalendarContent id={calendarContentID}>
        {React.Children.toArray(
          calendarContent.map((day) =>
            day === "" ? (
              <Box
                height="40px"
                className="blank"
              />
            ) : (
              <Box
                height="40px"
                className={
                  areDateEquals(new Date(year, month - 1, parseInt(day, 10)))
                    ? "today"
                    : ""
                }
              >
                <Typography
                  type="p1"
                  value={day}
                />
              </Box>
            )
          )
        )}
      </ScCalendarContent>
    </ScCalendar>
  );
};

export default Calendar;
