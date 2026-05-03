import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Decimal from "decimal.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number, currency = "NZD", locale = "en-NZ"): string {
  const num = new Decimal(amount).toNumber();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | number, locale = "en-NZ"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof date === "number" ? new Date(date * 1000) : date);
}

export function addDecimals(...values: (string | number)[]): string {
  return values.reduce((acc, v) => new Decimal(acc).plus(new Decimal(v)), new Decimal(0)).toString();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
