import { describe, expect, it } from 'vitest'
import {
  computeAccountBalances,
  computeBalances,
  equalSplit,
  simplifyDebts,
} from './balances'
import type { Account, Expense, Participant } from '../types'

function participant(id: string): Participant {
  return { id, name: id }
}

function expense(partial: Partial<Expense> & Pick<Expense, 'paidBy' | 'splits'>): Expense {
  return {
    id: crypto.randomUUID(),
    description: '',
    category: 'outros',
    amount: 0,
    currency: 'BRL',
    exchangeRate: 1,
    date: '2026-01-01',
    splitType: 'equal',
    ...partial,
  }
}

describe('computeBalances', () => {
  it('splits an expense equally between two participants', () => {
    const participants = [participant('a'), participant('b')]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 100,
        splits: [
          { participantId: 'a', amount: 50 },
          { participantId: 'b', amount: 50 },
        ],
      }),
    ]

    const balances = computeBalances(participants, expenses)
    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(50)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(-50)
  })

  it('converts amounts to the base currency via exchangeRate', () => {
    const participants = [participant('a'), participant('b')]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 10,
        currency: 'USD',
        exchangeRate: 5,
        splits: [
          { participantId: 'a', amount: 5 },
          { participantId: 'b', amount: 5 },
        ],
      }),
    ]

    const balances = computeBalances(participants, expenses)
    // 10 USD * 5 = 50 BRL paid; each owes 5 USD * 5 = 25 BRL
    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(25)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(-25)
  })

  it('handles custom (unequal) splits', () => {
    const participants = [participant('a'), participant('b')]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 100,
        splitType: 'custom',
        splits: [
          { participantId: 'a', amount: 0 },
          { participantId: 'b', amount: 100 },
        ],
      }),
    ]

    const balances = computeBalances(participants, expenses)
    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(100)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(-100)
  })

  it('removes a fully settled expense from balances entirely', () => {
    const participants = [participant('a'), participant('b')]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 100,
        splits: [
          { participantId: 'a', amount: 50, settledAmount: 50 },
          { participantId: 'b', amount: 50, settledAmount: 50 },
        ],
      }),
    ]

    const balances = computeBalances(participants, expenses)
    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(0)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(0)
  })

  it('scales down a partially settled expense proportionally', () => {
    const participants = [participant('a'), participant('b')]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 100,
        splits: [
          { participantId: 'a', amount: 50, settledAmount: 20 },
          { participantId: 'b', amount: 50, settledAmount: 20 },
        ],
      }),
    ]

    // 40% settled -> only 60% of the expense still counts.
    const balances = computeBalances(participants, expenses)
    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(30)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(-30)
  })

  it('distributes the remaining debt considering who already advanced part of their own share', () => {
    // A shared expense of 120 paid by 'a', split equally 4 ways (30 each).
    // 'b' already advanced 15 of their own share, 'c' already advanced 10.
    // 'a' and 'd' haven't advanced anything.
    const participants = [participant('a'), participant('b'), participant('c'), participant('d')]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 120,
        splits: [
          { participantId: 'a', amount: 30 },
          { participantId: 'b', amount: 30, settledAmount: 15 },
          { participantId: 'c', amount: 30, settledAmount: 10 },
          { participantId: 'd', amount: 30 },
        ],
      }),
    ]

    const balances = computeBalances(participants, expenses)
    // a fronted 120 but already got 15+10=25 back directly from b and c.
    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(65)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(-15)
    expect(balances.find((b) => b.participantId === 'c')?.net).toBe(-20)
    expect(balances.find((b) => b.participantId === 'd')?.net).toBe(-30)
  })

  it('ignores splits for participants that no longer exist', () => {
    const participants = [participant('a')]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 100,
        splits: [
          { participantId: 'a', amount: 50 },
          { participantId: 'ghost', amount: 50 },
        ],
      }),
    ]

    const balances = computeBalances(participants, expenses)
    expect(balances).toHaveLength(1)
    expect(balances[0].net).toBe(50)
  })
})

describe('simplifyDebts', () => {
  it('produces zero settlements when everyone is even', () => {
    const balances = [
      { participantId: 'a', net: 0, paid: 0, owes: 0 },
      { participantId: 'b', net: 0, paid: 0, owes: 0 },
    ]
    expect(simplifyDebts(balances)).toEqual([])
  })

  it('settles a simple two-person debt directly', () => {
    const balances = [
      { participantId: 'a', net: 50, paid: 50, owes: 0 },
      { participantId: 'b', net: -50, paid: 0, owes: 50 },
    ]
    const settlements = simplifyDebts(balances)
    expect(settlements).toEqual([{ from: 'b', to: 'a', amount: 50 }])
  })

  it('minimizes transactions across three participants', () => {
    // a paid 90, split equally three ways (30 each): a is owed 60, b and c owe 30 each.
    const balances = [
      { participantId: 'a', net: 60, paid: 90, owes: 30 },
      { participantId: 'b', net: -30, paid: 0, owes: 30 },
      { participantId: 'c', net: -30, paid: 0, owes: 30 },
    ]
    const settlements = simplifyDebts(balances)
    expect(settlements).toHaveLength(2)
    expect(settlements.every((s) => s.to === 'a')).toBe(true)
    expect(settlements.reduce((sum, s) => sum + s.amount, 0)).toBe(60)
  })

  it('ignores balances within the rounding tolerance', () => {
    const balances = [
      { participantId: 'a', net: 0.001, paid: 0, owes: 0 },
      { participantId: 'b', net: -0.001, paid: 0, owes: 0 },
    ]
    expect(simplifyDebts(balances)).toEqual([])
  })
})

describe('computeAccountBalances', () => {
  it('tracks spent and remaining balance in the account currency', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        name: 'Carteira',
        type: 'dinheiro',
        currency: 'BRL',
        exchangeRate: 1,
        initialBalance: 100,
      },
    ]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 30,
        paymentMethodId: 'acc1',
        exchangeRate: 1,
        splits: [{ participantId: 'a', amount: 30 }],
      }),
    ]

    const [balance] = computeAccountBalances(accounts, expenses)
    expect(balance.spent).toBe(30)
    expect(balance.remaining).toBe(70)
    expect(balance.remainingBase).toBe(70)
  })

  it('converts remaining balance to the base currency using the account exchange rate', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        name: 'Cartão USD',
        type: 'cartao',
        currency: 'USD',
        exchangeRate: 5,
        initialBalance: 100,
      },
    ]

    const [balance] = computeAccountBalances(accounts, [])
    expect(balance.remaining).toBe(100)
    expect(balance.remainingBase).toBe(500)
  })

  it('only counts expenses paid from that specific account', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        name: 'Carteira',
        type: 'dinheiro',
        currency: 'BRL',
        exchangeRate: 1,
        initialBalance: 100,
      },
    ]
    const expenses = [
      expense({
        paidBy: 'a',
        amount: 30,
        paymentMethodId: 'other-account',
        splits: [{ participantId: 'a', amount: 30 }],
      }),
    ]

    const [balance] = computeAccountBalances(accounts, expenses)
    expect(balance.spent).toBe(0)
    expect(balance.remaining).toBe(100)
  })
})

describe('equalSplit', () => {
  it('splits evenly when the amount divides cleanly', () => {
    const result = equalSplit(100, ['a', 'b'])
    expect(result).toEqual([
      { participantId: 'a', amount: 50 },
      { participantId: 'b', amount: 50 },
    ])
  })

  it('distributes remainder cents so the total matches exactly', () => {
    const result = equalSplit(100, ['a', 'b', 'c'])
    const total = result.reduce((sum, s) => sum + s.amount, 0)
    expect(total).toBeCloseTo(100, 2)
    // 100 / 3 = 33.33, remainder distributed as extra cents to the first participants
    expect(result[0].amount).toBe(33.34)
    expect(result[1].amount).toBe(33.33)
    expect(result[2].amount).toBe(33.33)
  })

  it('returns an empty array when there are no participants', () => {
    expect(equalSplit(100, [])).toEqual([])
  })
})
