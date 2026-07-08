import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Modal } from './ui/Modal'
import { CATEGORIES, type Category, type Expense, type Trip } from '../types'
import { equalSplit, scaleSplits } from '../lib/balances'
import { quickCurrencies, formatCurrency } from '../lib/currencies'
import { fetchExchangeRate } from '../lib/exchangeRate'

const todayIso = () => new Date().toISOString().slice(0, 10)

function addMonthsIso(iso: string, months: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function ExpenseForm({
  trip,
  expense,
  onClose,
  onSave,
}: {
  trip: Trip
  expense?: Expense
  onClose: () => void
  onSave: (expenses: (Omit<Expense, 'id'> & { id?: string })[]) => void
}) {
  const isEdit = !!expense
  const [description, setDescription] = useState(expense?.description ?? '')
  const [category, setCategory] = useState<Category>(
    expense?.category ?? 'outros',
  )
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [currency, setCurrency] = useState(expense?.currency ?? trip.baseCurrency)
  const [exchangeRate, setExchangeRate] = useState(
    expense ? String(expense.exchangeRate) : '1',
  )
  const [date, setDate] = useState(expense?.date ?? todayIso())
  const [paidBy, setPaidBy] = useState(
    expense?.paidBy ?? trip.participants[0]?.id ?? '',
  )
  const [paymentMethodId, setPaymentMethodId] = useState(
    expense?.paymentMethodId ?? '',
  )
  const [participantIds, setParticipantIds] = useState<string[]>(
    expense?.splits.map((s) => s.participantId) ??
      trip.participants.map((p) => p.id),
  )
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'group'>(
    expense?.splitType ?? 'equal',
  )
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    () => {
      if (expense?.splitType === 'custom') {
        return Object.fromEntries(
          expense.splits.map((s) => [s.participantId, String(s.amount)]),
        )
      }
      return {}
    },
  )

  // "Units" for the subgroup split mode: each subgroup with members, plus each
  // ungrouped participant treated as their own unit (so nobody is left out).
  const units = useMemo(() => {
    const groupUnits = trip.groups
      .map((g) => ({
        id: g.id,
        label: g.name,
        memberIds: trip.participants
          .filter((p) => p.groupId === g.id)
          .map((p) => p.id),
      }))
      .filter((u) => u.memberIds.length > 0)
    const soloUnits = trip.participants
      .filter((p) => !p.groupId)
      .map((p) => ({ id: `solo:${p.id}`, label: p.name, memberIds: [p.id] }))
    return [...groupUnits, ...soloUnits]
  }, [trip.groups, trip.participants])

  const [unitIds, setUnitIds] = useState<string[]>(units.map((u) => u.id))
  const toggleUnit = (id: string) => {
    setUnitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  // Manual override for each subgroup's total in "Por subgrupo" mode. When a
  // unit has no entry here, its share falls back to the automatic equal
  // (per-person) calculation below.
  const [customUnitAmounts, setCustomUnitAmounts] = useState<Record<string, string>>(
    () => {
      if (expense?.splitType === 'group') {
        const map: Record<string, string> = {}
        for (const u of units) {
          const total = expense.splits
            .filter((s) => u.memberIds.includes(s.participantId))
            .reduce((sum, s) => sum + s.amount, 0)
          if (total > 0.005) map[u.id] = String(total)
        }
        return map
      }
      return {}
    },
  )
  const [fetchingRate, setFetchingRate] = useState(false)
  const [rateError, setRateError] = useState('')
  const [installmentsEnabled, setInstallmentsEnabled] = useState(false)
  const [installmentsCount, setInstallmentsCount] = useState('2')
  const installmentsNum = Math.max(2, parseInt(installmentsCount, 10) || 2)

  const handleFetchRate = async () => {
    setFetchingRate(true)
    setRateError('')
    try {
      const rate = await fetchExchangeRate(currency, trip.baseCurrency)
      setExchangeRate(String(rate))
    } catch (err) {
      setRateError(err instanceof Error ? err.message : 'Erro ao buscar cotação.')
    } finally {
      setFetchingRate(false)
    }
  }

  const amountNum = parseFloat(amount) || 0
  const isForeign = currency.trim().toUpperCase() !== trip.baseCurrency.toUpperCase()

  const customTotal = useMemo(
    () =>
      participantIds.reduce(
        (sum, id) => sum + (parseFloat(customAmounts[id]) || 0),
        0,
      ),
    [participantIds, customAmounts],
  )
  const customDiff = Math.round((amountNum - customTotal) * 100) / 100

  const isUnitEdited = (u: { id: string }) => {
    const raw = customUnitAmounts[u.id]
    return raw !== undefined && raw !== ''
  }

  // Manually edited subgroups keep whatever the user typed. The remaining
  // amount (total minus what's already spoken for) is spread equally per
  // person across the subgroups still on "auto", so editing one subgroup up
  // automatically shrinks the others instead of just flagging a mismatch.
  const selectedUnits = units.filter((u) => unitIds.includes(u.id))
  const editedUnits = selectedUnits.filter(isUnitEdited)
  const autoUnits = selectedUnits.filter((u) => !isUnitEdited(u))
  const editedTotal = editedUnits.reduce(
    (sum, u) => sum + (parseFloat(customUnitAmounts[u.id]) || 0),
    0,
  )
  const autoPeopleCount = autoUnits.reduce(
    (sum, u) => sum + u.memberIds.length,
    0,
  )
  const remainingForAuto = amountNum - editedTotal
  const autoPerPersonShare =
    autoPeopleCount > 0 ? remainingForAuto / autoPeopleCount : 0

  const unitAmount = (u: { id: string; memberIds: string[] }) => {
    if (!unitIds.includes(u.id)) return 0
    const raw = customUnitAmounts[u.id]
    if (raw !== undefined && raw !== '') return parseFloat(raw) || 0
    return autoPerPersonShare * u.memberIds.length
  }

  const groupTotal = selectedUnits.reduce((sum, u) => sum + unitAmount(u), 0)
  const groupDiff = Math.round((amountNum - groupTotal) * 100) / 100

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const canSave =
    description.trim() &&
    amountNum > 0 &&
    paidBy &&
    (splitType === 'group'
      ? unitIds.length > 0 && Math.abs(groupDiff) < 0.01
      : participantIds.length > 0 &&
        (splitType === 'equal' || Math.abs(customDiff) < 0.01))

  const handleSave = () => {
    if (!canSave) return
    let splits
    if (splitType === 'group') {
      // Cada subgrupo tem seu próprio total (automático ou editado
      // manualmente), dividido igualmente entre os membros daquele subgrupo.
      splits = selectedUnits.flatMap((u) => equalSplit(unitAmount(u), u.memberIds))
    } else if (splitType === 'equal') {
      splits = equalSplit(amountNum, participantIds)
    } else {
      splits = participantIds.map((id) => ({
        participantId: id,
        amount: parseFloat(customAmounts[id]) || 0,
      }))
    }

    const base = {
      description: description.trim(),
      category,
      currency: currency.trim().toUpperCase() || trip.baseCurrency,
      exchangeRate: isForeign ? parseFloat(exchangeRate) || 1 : 1,
      paidBy,
      paymentMethodId: paymentMethodId || undefined,
      splitType,
    }

    if (!isEdit && installmentsEnabled && installmentsNum > 1) {
      // Cria uma despesa separada por parcela, cada uma um mês depois da
      // anterior, com o valor e as divisões escaladas proporcionalmente.
      const installmentAmounts = equalSplit(
        amountNum,
        Array.from({ length: installmentsNum }, (_, i) => String(i)),
      ).map((s) => s.amount)

      onSave(
        installmentAmounts.map((instAmount, i) => ({
          ...base,
          description: `${base.description} (${i + 1}/${installmentsNum})`,
          amount: instAmount,
          date: addMonthsIso(date, i),
          splits: scaleSplits(splits, amountNum, instAmount),
        })),
      )
    } else {
      onSave([{ id: expense?.id, ...base, amount: amountNum, date, splits }])
    }
    onClose()
  }

  return (
    <Modal title={isEdit ? 'Editar despesa' : 'Nova despesa'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Descrição
          </label>
          <input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Jantar no restaurante"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Categoria
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
                  category === c.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <c.icon size={16} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Valor
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Moeda
            </label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder={trip.baseCurrency}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 -mt-2">
          {quickCurrencies(trip.baseCurrency).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                currency.toUpperCase() === c
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isForeign && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Câmbio (1 {currency.toUpperCase()} = ? {trip.baseCurrency})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.0001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleFetchRate}
                disabled={fetchingRate}
                title="Buscar cotação atual"
                aria-label="Buscar cotação atual"
                className="shrink-0 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 text-neutral-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-50"
              >
                <RefreshCw size={16} className={fetchingRate ? 'animate-spin' : ''} />
              </button>
            </div>
            {rateError && (
              <p className="text-xs text-red-600 mt-1">{rateError}</p>
            )}
            {amountNum > 0 && (
              <p className="text-xs text-neutral-500 mt-1">
                ≈ {formatCurrency(amountNum * (parseFloat(exchangeRate) || 0))}{' '}
                {trip.baseCurrency}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={installmentsEnabled}
                onChange={(e) => setInstallmentsEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
              Parcelar essa despesa
            </label>
            {installmentsEnabled && (
              <div className="mt-2">
                <label className="block text-xs text-neutral-500 mb-1">
                  Número de parcelas
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="2"
                  step="1"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(e.target.value)}
                  className="w-24 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Cria {installmentsNum} despesas separadas, uma por mês a
                  partir da data acima, cada uma dividida entre as mesmas
                  pessoas.
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Quem pagou
          </label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {trip.participants.length === 0 && <option value="">—</option>}
            {trip.participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {trip.accounts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Pago com
            </label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Não informado</option>
              {trip.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Dividir entre
            </label>
            <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-700 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`px-2.5 py-1 ${splitType === 'equal' ? 'bg-blue-600 text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Igual
              </button>
              <button
                type="button"
                onClick={() => setSplitType('custom')}
                className={`px-2.5 py-1 ${splitType === 'custom' ? 'bg-blue-600 text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Personalizado
              </button>
              {trip.groups.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSplitType('group')}
                  className={`px-2.5 py-1 ${splitType === 'group' ? 'bg-blue-600 text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                >
                  Por subgrupo
                </button>
              )}
            </div>
          </div>

          {splitType === 'group' ? (
            <div className="space-y-1.5">
              {units.map((u) => {
                const checked = unitIds.includes(u.id)
                const amountForUnit = unitAmount(u)
                return (
                  <div
                    key={u.id}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUnit(u.id)}
                        className="h-4 w-4 rounded accent-blue-600"
                      />
                      <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200">
                        {u.label}
                      </span>
                      {checked && (
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={
                            customUnitAmounts[u.id] ??
                            (amountForUnit > 0 ? amountForUnit.toFixed(2) : '')
                          }
                          onChange={(e) =>
                            setCustomUnitAmounts((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          placeholder="0,00"
                          className="w-24 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm text-right text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    {checked && u.memberIds.length > 1 && (
                      <p className="mt-1 pl-6 text-xs text-neutral-400">
                        {formatCurrency(amountForUnit / u.memberIds.length)} por
                        pessoa ({u.memberIds.length} pessoas)
                      </p>
                    )}
                  </div>
                )
              })}
              {Math.abs(groupDiff) >= 0.01 && (
                <p className="text-xs text-red-600 mt-1">
                  {groupDiff > 0
                    ? `Faltam ${formatCurrency(groupDiff)} para completar o valor total.`
                    : `Passou ${formatCurrency(Math.abs(groupDiff))} do valor total.`}
                </p>
              )}
            </div>
          ) : (
            <>
              {trip.groups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {trip.groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setParticipantIds(
                          trip.participants
                            .filter((p) => p.groupId === g.id)
                            .map((p) => p.id),
                        )
                      }
                      className="rounded-full border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:border-blue-300 hover:text-blue-600"
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-1.5">
                {trip.participants.map((p) => {
                  const checked = participantIds.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(p.id)}
                        className="h-4 w-4 rounded accent-blue-600"
                      />
                      <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200">
                        {p.name}
                      </span>
                      {splitType === 'custom' && checked && (
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={customAmounts[p.id] ?? ''}
                          onChange={(e) =>
                            setCustomAmounts((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder="0,00"
                          className="w-24 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm text-right text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                      {splitType === 'equal' && checked && participantIds.length > 0 && (
                        <span className="text-sm text-neutral-500">
                          {formatCurrency(amountNum / participantIds.length)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {splitType === 'custom' && Math.abs(customDiff) >= 0.01 && (
                <p className="text-xs text-red-600 mt-1">
                  {customDiff > 0
                    ? `Faltam ${formatCurrency(customDiff)} para completar o valor total.`
                    : `Passou ${formatCurrency(Math.abs(customDiff))} do valor total.`}
                </p>
              )}
            </>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isEdit ? 'Salvar alterações' : 'Adicionar despesa'}
        </button>
      </div>
    </Modal>
  )
}
