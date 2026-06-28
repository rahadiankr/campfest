const millisecondsPerDay = 24 * 60 * 60 * 1000;

interface DateParts {
  readonly day: number;
  readonly monthIndex: number;
  readonly year: number;
}

const padDatePart = (value: number): string => value.toString().padStart(2, "0");

const parseDateParts = (dateValue: string): DateParts => {
  const parts = dateValue.split("-");

  if (parts.length !== 3) {
    throw new Error(`Invalid date value: ${dateValue}. Expected YYYY-MM-DD.`);
  }

  const [yearText, monthText, dayText] = parts;

  if (
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined
  ) {
    throw new Error(`Invalid date value: ${dateValue}. Expected YYYY-MM-DD.`);
  }

  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error(`Invalid date value: ${dateValue}. Expected YYYY-MM-DD.`);
  }

  return {
    day,
    monthIndex: month - 1,
    year,
  };
};

export const formatLocalDate = (date: Date): string =>
  [
    date.getFullYear().toString(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");

export const toLocalDateStart = (dateValue: string): Date => {
  const parts = parseDateParts(dateValue);

  return new Date(parts.year, parts.monthIndex, parts.day);
};

export const getDayDifference = (fromDate: Date, toDate: Date): number =>
  Math.round(
    (toDate.getTime() - fromDate.getTime()) / millisecondsPerDay,
  );
