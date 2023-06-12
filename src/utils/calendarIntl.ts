/* eslint-disable no-plusplus */

export const getRelativeTimeFormat = (locale: string) =>
  new Intl.RelativeTimeFormat(locale, {
    localeMatcher: "best fit",
    numeric: "always",
    style: "long",
  });

/**
 * Result example
 * ----------------------------------------------------------------
 * getDifferenceInDaysWithLocale(Date.getTime, new Date().getTime)
 * result: '5 days ago'
 *
 * @param fromDate
 * @param toDate
 * @returns
 */
export const getDifferenceInDays = (
  fromDate: number,
  toDate: number
): string => {
  const diff = Math.floor((fromDate - toDate) / (1000 * 60 * 60 * 24));
  return new Intl.RelativeTimeFormat("en", {
    localeMatcher: "best fit",
    numeric: "always",
    style: "long",
  }).format(diff, "day");
};

/**
 * Result example
 * ----------------------------------------------------------------
 * getDifferenceInDaysWithLocale(Date.getTime, new Date().getTime, 'en')
 * result: '5 days ago'
 *
 * @param fromDate
 * @param toDate
 * @param locale
 * @returns
 */
export const getDifferenceInDaysWithLocale = (
  fromDate: number,
  toDate: number,
  locale: string
): string => {
  const diff = Math.floor((fromDate - toDate) / (1000 * 60 * 60 * 24));
  return getRelativeTimeFormat(locale).format(diff, "day");
};

export const getWeekDays = (locale: string): string[] => {
  const baseDate: Date = new Date(Date.UTC(2022, 0, 2)); // date value: 2 = en, 3 = es
  const newWeekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    newWeekDays.push(baseDate.toLocaleDateString(locale, { weekday: "short" }));
    baseDate.setDate(baseDate.getDate() + 1);
  }
  return newWeekDays;
};

export const getMonthsName = (locale: string): string[] => {
  const baseDate: Date = new Date(Date.UTC(2021, 0, 10));
  const newMonths: string[] = [];
  for (let i = 0; i < 12; i++) {
    newMonths.push(baseDate.toLocaleDateString(locale, { month: "short" }));
    baseDate.setMonth(baseDate.getMonth() + 1);
  }
  return newMonths;
};

export function dateGetDate(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

export function dateGetDay(y: number, m: number, d: number): number {
  return new Date(y, m - 1, d).getDay();
}

export function getDateFormatString(y: Date): string {
  return `${y.getFullYear()}/${y.getMonth() + 1}/${y.getDate()}`;
}

export function areDateEquals(e: Date): boolean {
  return getDateFormatString(new Date()) === getDateFormatString(e);
}

export function emptyChild(element: HTMLElement) {
  const children = Array.prototype.slice.call(element.childNodes);
  children.forEach((child) => {
    element.removeChild(child);
  });
}

export function getDaysOfDate(year: number, month: number, weekDays: string[]) {
  const elements = [];
  const numDate = dateGetDate(year, month) + 1;
  for (let index = 1; index < numDate; index++) {
    elements.push({
      day: index,
      weekDay: weekDays[dateGetDay(year, month, index)],
    });
  }
  return elements;
}
