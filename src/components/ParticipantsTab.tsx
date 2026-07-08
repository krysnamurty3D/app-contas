import { useState } from 'react'
import { Mail, Plus, Trash2, Users, UsersRound } from 'lucide-react'
import { useTrips } from '../context/TripsContext'
import type { Trip } from '../types'

export function ParticipantsTab({ trip }: { trip: Trip }) {
  const {
    addParticipant,
    removeParticipant,
    inviteMember,
    addGroup,
    removeGroup,
    setParticipantGroup,
  } = useTrips()
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    addParticipant(trip.id, trimmed)
    setName('')
  }

  const handleAddGroup = () => {
    const trimmed = groupName.trim()
    if (!trimmed) return
    addGroup(trip.id, trimmed)
    setGroupName('')
  }

  const handleRemoveGroup = (id: string, groupLabel: string) => {
    if (confirm(`Remover o subgrupo "${groupLabel}"? As pessoas continuam no grupo, só deixam de pertencer a esse subgrupo.`)) {
      removeGroup(trip.id, id)
    }
  }

  const handleInvite = async () => {
    const trimmed = inviteEmail.trim()
    if (!trimmed || !inviteMember) return
    setInviteStatus('')
    try {
      await inviteMember(trip.id, trimmed)
      setInviteStatus(`${trimmed} agora tem acesso a esta viagem.`)
      setInviteEmail('')
    } catch {
      setInviteStatus('Não foi possível convidar agora. Tente novamente.')
    }
  }

  const handleRemove = (id: string, participantName: string) => {
    const involved = trip.expenses.some(
      (e) => e.paidBy === id || e.splits.some((s) => s.participantId === id),
    )
    const msg = involved
      ? `${participantName} está envolvido(a) em uma ou mais despesas. Removê-lo(a) também removerá essas despesas. Continuar?`
      : `Remover ${participantName} do grupo?`
    if (confirm(msg)) removeParticipant(trip.id, id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-500">
        <Users size={18} />
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Participantes do grupo
        </h2>
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome da pessoa"
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={18} />
        </button>
      </div>

      {trip.participants.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-6">
          Adicione as pessoas que vão dividir as despesas da viagem.
        </p>
      ) : (
        <ul className="space-y-2">
          {trip.participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-neutral-900 dark:text-neutral-100">
                  {p.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {trip.groups.length > 0 && (
                  <select
                    value={p.groupId ?? ''}
                    onChange={(e) =>
                      setParticipantGroup(
                        trip.id,
                        p.id,
                        e.target.value || null,
                      )
                    }
                    className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem subgrupo</option>
                    {trip.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => handleRemove(p.id, p.name)}
                  className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  aria-label={`Remover ${p.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <div className="flex items-center gap-2 text-neutral-500">
          <UsersRound size={16} />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Subgrupos
          </h3>
        </div>
        <p className="text-xs text-neutral-500">
          Crie subgrupos (ex: "Família 1", "Família 2") para selecionar todo mundo de uma vez ao dividir uma despesa.
        </p>
        <div className="flex gap-2">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
            placeholder="Ex: Família 1"
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddGroup}
            disabled={!groupName.trim()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>
        {trip.groups.length > 0 && (
          <ul className="space-y-1.5">
            {trip.groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5"
              >
                <span className="text-sm text-neutral-800 dark:text-neutral-200">
                  {g.name}
                </span>
                <button
                  onClick={() => handleRemoveGroup(g.id, g.name)}
                  className="rounded-full p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  aria-label={`Remover subgrupo ${g.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inviteMember && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-neutral-500">
            <Mail size={16} />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Compartilhar viagem
            </h3>
          </div>
          <p className="text-xs text-neutral-500">
            Convide alguém pelo e-mail que ela usa (ou vai usar) para entrar no app. Ela verá e poderá editar esta viagem.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              placeholder="pessoa@exemplo.com"
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Convidar
            </button>
          </div>
          {inviteStatus && (
            <p className="text-xs text-neutral-500">{inviteStatus}</p>
          )}
          {trip.memberEmails && trip.memberEmails.length > 0 && (
            <ul className="text-xs text-neutral-500 space-y-1">
              {trip.memberEmails.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
