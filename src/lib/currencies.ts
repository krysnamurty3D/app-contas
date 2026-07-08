export const COMMON_CURRENCIES = ['BRL', 'ARS', 'CLP', 'USD', 'EUR', 'GBP', 'JPY']

/** Formats a number as pt-BR style money: "." for thousands, "," for decimals. */
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Currencies most likely to matter on a given trip: the trip's base currency plus common travel currencies. */
export function quickCurrencies(baseCurrency: string) {
  const base = baseCurrency.trim().toUpperCase()
  return Array.from(new Set([base, 'ARS', 'CLP', 'USD']))
}
