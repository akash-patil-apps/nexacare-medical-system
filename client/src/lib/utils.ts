import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

const DATE_LOCALE = "en-GB"

const DAY_MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: "long",
})

const TIME_FORMATTER = new Intl.DateTimeFormat(DATE_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const formatDisplayParts = (date: Date) => {
  const datePart = DAY_MONTH_YEAR_FORMATTER.format(date)
  const weekdayPart = WEEKDAY_FORMATTER.format(date)
  return { datePart, weekdayPart }
}

export function formatDate(date: Date | string | number): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable"
  }
  const { datePart, weekdayPart } = formatDisplayParts(parsed)
  return `${datePart}, ${weekdayPart}`
}

export function formatDateTime(date: Date | string | number): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable"
  }
  const { datePart, weekdayPart } = formatDisplayParts(parsed)
  const timePart = TIME_FORMATTER.format(parsed)
  return `${datePart}, ${weekdayPart} · ${timePart}`
}