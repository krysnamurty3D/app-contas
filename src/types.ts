import {
  Bed,
  Banknote,
  Car,
  CreditCard,
  MoreHorizontal,
  ShoppingBag,
  Ticket,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type Category =
  | 'transporte'
  | 'hospedagem'
  | 'alimentacao'
  | 'passeios'
  | 'compras'
  | 'outros'

export const CATEGORIES: { id: Category; label: string; icon: LucideIcon }[] = [
  { id: 'transporte', label: 'Transporte', icon: Car },
  { id: 'hospedagem', label: 'Hospedagem', icon: Bed },
  { id: 'alimentacao', label: 'Alimentação', icon: Utensils },
  { id: 'passeios', label: 'Passeios', icon: Ticket },
  { id: 'compras', label: 'Compras', icon: ShoppingBag },
  { id: 'outros', label: 'Outros', icon: MoreHorizontal },
]

export interface Participant {
  id: string
  name: string
  /** Subgroup this participant belongs to (e.g. "Família 1"), if any. */
  groupId?: string
}

export interface Group {
  id: string
  name: string
}

export type AccountType = 'dinheiro' | 'cartao' | 'outro'

export const ACCOUNT_TYPES: { id: AccountType; label: string; icon: LucideIcon }[] = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'cartao', label: 'Cartão', icon: CreditCard },
  { id: 'outro', label: 'Outro', icon: Wallet },
]

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: string
  /** How many units of the trip's base currency 1 unit of this account's currency is worth */
  exchangeRate: number
  initialBalance: number
}

export interface ExpenseSplit {
  participantId: string
  /** Amount owed by this participant, in the expense's original currency */
  amount: number
}

export interface Expense {
  id: string
  description: string
  category: Category
  amount: number
  currency: string
  /** How many units of the trip's base currency 1 unit of this expense's currency is worth */
  exchangeRate: number
  date: string
  paidBy: string
  /** Account (cash/card) the money came from, if tracked */
  paymentMethodId?: string
  splitType: 'equal' | 'custom' | 'group'
  splits: ExpenseSplit[]
  /** Amount already settled/paid back outside the app, in the expense's own currency. Reduces its weight in balances proportionally. */
  settledAmount?: number
}

export interface Trip {
  id: string
  name: string
  baseCurrency: string
  participants: Participant[]
  groups: Group[]
  accounts: Account[]
  expenses: Expense[]
  createdAt: string
  /** Lowercased e-mails of everyone with access to this trip. Only set for trips synced via Firebase. */
  memberEmails?: string[]
}
