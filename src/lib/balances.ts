import type { Account, Expense, Participant } from '../types'

export interface Balance {
  participantId: string
  /** Net balance in the trip's base currency. Positive = is owed money, negative = owes money. */
  net: number
  paid: number
  owes: number
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function computeBalances(
  participants: Participant[],
  expenses: Expense[],
): Balance[] {
  const paid: Record<string, number> = {}
  const owes: Record<string, number> = {}
  for (const p of participants) {
    paid[p.id] = 0
    owes[p.id] = 0
  }

  for (const e of expenses) {
    const rate = e.exchangeRate || 1
    // Each split can carry its own settledAmount: money a specific participant
    // already advanced toward their own share, outside the app. Whatever's
    // been advanced no longer counts as owed by them, nor as owed *to* the
    // payer (since that person already got it back).
    let totalSettled = 0
    for (const s of e.splits) {
      const settled = Math.max(0, Math.min(s.settledAmount ?? 0, s.amount))
      totalSettled += settled
      if (owes[s.participantId] !== undefined) {
        owes[s.participantId] += (s.amount - settled) * rate
      }
    }
    if (paid[e.paidBy] !== undefined) {
      paid[e.paidBy] += (e.amount - totalSettled) * rate
    }
  }

  return participants.map((p) => ({
    participantId: p.id,
    paid: round2(paid[p.id]),
    owes: round2(owes[p.id]),
    net: round2(paid[p.id] - owes[p.id]),
  }))
}

/** Greedy min-transaction settlement: match biggest creditor with biggest debtor repeatedly. */
export function simplifyDebts(balances: Balance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ id: b.participantId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount)
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ id: b.participantId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = round2(Math.min(debtor.amount, creditor.amount))

    if (amount > 0.005) {
      settlements.push({ from: debtor.id, to: creditor.id, amount })
    }

    debtor.amount = round2(debtor.amount - amount)
    creditor.amount = round2(creditor.amount - amount)

    if (debtor.amount <= 0.005) i++
    if (creditor.amount <= 0.005) j++
  }

  return settlements
}

export interface AccountBalance {
  accountId: string
  /** Total spent from this account, in the account's own currency */
  spent: number
  /** Remaining balance, in the account's own currency */
  remaining: number
  /** Remaining balance, converted to the trip's base currency */
  remainingBase: number
}

export function computeAccountBalances(
  accounts: Account[],
  expenses: Expense[],
): AccountBalance[] {
  return accounts.map((acc) => {
    const rate = acc.exchangeRate || 1
    const spentBase = expenses
      .filter((e) => e.paymentMethodId === acc.id)
      .reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0)
    const spent = round2(spentBase / rate)
    const remaining = round2(acc.initialBalance - spent)
    return {
      accountId: acc.id,
      spent,
      remaining,
      remainingBase: round2(remaining * rate),
    }
  })
}

/** Scales a set of splits proportionally from their original total down to a
 * smaller target amount (e.g. one installment of a parceled expense), keeping
 * the same remainder-distribution rounding used by equalSplit so the result
 * always sums to exactly targetAmount. */
export function scaleSplits(
  splits: { participantId: string; amount: number }[],
  totalAmount: number,
  targetAmount: number,
) {
  if (splits.length === 0 || totalAmount <= 0) {
    return splits.map((s) => ({ participantId: s.participantId, amount: 0 }))
  }
  const base = splits.map(
    (s) => Math.floor(((s.amount / totalAmount) * targetAmount) * 100) / 100,
  )
  const total = round2(base.reduce((sum, n) => sum + n, 0))
  const remainderCents = Math.round(round2(targetAmount - total) * 100)
  return splits.map((s, idx) => ({
    participantId: s.participantId,
    amount: round2(base[idx] + (idx < remainderCents ? 0.01 : 0)),
  }))
}

export function equalSplit(amount: number, participantIds: string[]) {
  if (participantIds.length === 0) return []
  const base = Math.floor((amount / participantIds.length) * 100) / 100
  const total = round2(base * participantIds.length)
  let remainder = round2(amount - total)

  return participantIds.map((id, idx) => {
    let share = base
    if (remainder > 0.001 && idx < participantIds.length) {
      const cents = Math.round(remainder * 100)
      if (idx < cents) {
        share = round2(share + 0.01)
      }
    }
    return { participantId: id, amount: share }
  })
}
