export const BUILTIN_CURRENCIES = ["NZD", "AUD", "USD", "EUR", "GBP", "SGD", "JPY", "CAD"];

export function parseCurrencies(extraJson: string): string[] {
  try {
    const parsed = JSON.parse(extraJson);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function allCurrencies(extraJson: string): string[] {
  const extras = parseCurrencies(extraJson);
  return [...new Set([...BUILTIN_CURRENCIES, ...extras])];
}

export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}
