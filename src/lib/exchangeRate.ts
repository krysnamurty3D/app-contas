/** Fetches the current exchange rate: how many units of `to` one unit of `from` is worth. */
export async function fetchExchangeRate(from: string, to: string): Promise<number> {
  const base = from.trim().toUpperCase()
  const target = to.trim().toUpperCase()
  if (!base || !target) throw new Error('Informe as moedas para buscar a cotação.')
  if (base === target) return 1

  let res: Response
  try {
    res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
  } catch {
    throw new Error('Sem conexão para buscar a cotação.')
  }
  if (!res.ok) throw new Error('Não foi possível obter a cotação agora.')

  const data = await res.json()
  const rate = data?.rates?.[target]
  if (typeof rate !== 'number') {
    throw new Error(`Cotação de ${base} para ${target} indisponível.`)
  }
  return rate
}
