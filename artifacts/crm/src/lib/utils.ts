import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date value defensively. Returns `fallback` for null/empty values
 * or unparseable/corrupted date strings instead of throwing, so a single bad
 * record can never crash the page that renders it.
 */
export function safeFormatDate(
  value: string | number | Date | null | undefined,
  fmt: string,
  fallback = "—",
): string {
  if (value === null || value === undefined || value === "") return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return fallback
  try {
    return format(date, fmt)
  } catch {
    return fallback
  }
}

/**
 * Returns the `YYYY-MM-DD` portion of a date value, or `fallback` (empty
 * string) when the value is missing or unparseable. Safe for prefilling
 * date inputs from possibly-corrupted persisted values without throwing.
 */
export function toDateInputValue(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  if (value === null || value === undefined || value === "") return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return fallback
  return date.toISOString().split("T")[0]
}

/**
 * Formats a possibly-null/undefined/non-numeric value as a fixed-decimal
 * string. Returns `fallback` when the value can't be parsed to a finite
 * number, so number formatting in render never throws or shows "NaN".
 */
export function safeToFixed(
  value: number | string | null | undefined,
  digits = 2,
  fallback = "0.00",
): string {
  if (value === null || value === undefined || value === "") return fallback
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return num.toFixed(digits)
}
