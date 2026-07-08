import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchExchangeRate } from './exchangeRate'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchExchangeRate', () => {
  it('returns 1 without making a request when both currencies match', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchExchangeRate('brl', 'BRL')).resolves.toBe(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches the rate from the API for the target currency', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { BRL: 5.12 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const rate = await fetchExchangeRate('usd', 'brl')
    expect(rate).toBe(5.12)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://open.er-api.com/v6/latest/USD',
    )
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(fetchExchangeRate('usd', 'brl')).rejects.toThrow(
      'Não foi possível obter a cotação agora.',
    )
  })

  it('throws when the target currency is missing from the response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: {} }) }),
    )
    await expect(fetchExchangeRate('usd', 'xyz')).rejects.toThrow(
      'Cotação de USD para XYZ indisponível.',
    )
  })

  it('throws a friendly error when the network request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    )
    await expect(fetchExchangeRate('usd', 'brl')).rejects.toThrow(
      'Sem conexão para buscar a cotação.',
    )
  })
})
