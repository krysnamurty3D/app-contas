export const COMMON_CURRENCIES = ['BRL', 'ARS', 'CLP', 'USD', 'EUR', 'GBP', 'JPY']

/** Currencies most likely to matter on a given trip: the trip's base currency plus common travel currencies. */
export function quickCurrencies(baseCurrency: string) {
  const base = baseCurrency.trim().toUpperCase()
  return Array.from(new Set([base, 'ARS', 'CLP', 'USD']))
}
