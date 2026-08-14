import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAllBets,
  formatMoney,
  resolveBet,
} from '../services/betsService'

function BetAdminCard({ bet, onResolved }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const settle = async (winner) => {
    setLoading(true)
    setError(null)
    try {
      await resolveBet(bet.id, winner)
      onResolved()
    } catch (err) {
      setError(err.message ?? 'Could not settle bet.')
    } finally {
      setLoading(false)
    }
  }

  const isActive = bet.status === 'open'

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-gray-900">{bet.title}</p>
          <p className="text-xs text-gray-500 mt-1">
            {bet.event_type} · {new Date(bet.event_date).toLocaleString()}
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full border border-gray-200 bg-gray-50">
          {bet.status}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{bet.rules}</p>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-xs uppercase text-gray-400 mb-1">Side 1 — {bet.side1_label}</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatMoney(bet.realSide1Total || bet.side1Total)} ordered (real)
            {bet.side1Filled > 0 && (
              <span className="text-sm font-normal text-gray-500">
                {' '}
                · {formatMoney(bet.side1Filled)} filled
              </span>
            )}
            {' · '}
            {bet.side1.length} people
          </p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            {bet.side1.map((entry) => (
              <li key={entry.id}>
                {entry.user_label} — {formatMoney(entry.stake)} ordered
                {Number(entry.filled_stake) > 0 && ` (${formatMoney(entry.filled_stake)} filled)`}
              </li>
            ))}
            {bet.side1.length === 0 && <li className="text-gray-400">No entries</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-xs uppercase text-gray-400 mb-1">Side 2 — {bet.side2_label}</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatMoney(bet.realSide2Total || bet.side2Total)} ordered (real)
            {bet.side2Filled > 0 && (
              <span className="text-sm font-normal text-gray-500">
                {' '}
                · {formatMoney(bet.side2Filled)} filled
              </span>
            )}
            {' · '}
            {bet.side2.length} people
          </p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            {bet.side2.map((entry) => (
              <li key={entry.id}>
                {entry.user_label} — {formatMoney(entry.stake)} ordered
                {Number(entry.filled_stake) > 0 && ` (${formatMoney(entry.filled_stake)} filled)`}
              </li>
            ))}
            {bet.side2.length === 0 && <li className="text-gray-400">No entries</li>}
          </ul>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        Total pool (virtual): {formatMoney(bet.totalPool)} · {bet.totalPeople} people
      </p>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {isActive && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => settle('side1')}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Side 1 won
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => settle('side2')}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Side 2 won
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => settle('scratch')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Draw / scratch — refund all
          </button>
        </div>
      )}

      {!isActive && (
        <p className="text-sm text-gray-500">
          Result:{' '}
          {bet.winner === 'side1'
            ? bet.side1_label
            : bet.winner === 'side2'
              ? bet.side2_label
              : 'Scratch — nobody won'}
        </p>
      )}
    </li>
  )
}

export default function AdminBetsPanel() {
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('not_started')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllBets()
      setBets(data)
    } catch (err) {
      setError(err.message ?? 'Failed to load bets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [load])

  const visible = useMemo(() => {
    const now = new Date()
    return bets.filter((bet) => {
      const eventDate = new Date(bet.event_date)
      
      if (filter === 'not_started') {
        return bet.status === 'open' && eventDate > now
      }
      if (filter === 'in_play') {
        return bet.status === 'open' && eventDate <= now
      }
      if (filter === 'finished') {
        return bet.status !== 'open' && !bet.winner
      }
      if (filter === 'archive') {
        return bet.status !== 'open' && bet.winner && bet.is_archived
      }
      if (filter === 'all') {
        return bets
      }
      return true
    })
  }, [bets, filter])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All bets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Virtual money only — settle who won after the event.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('not_started')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'not_started' ? 'bg-gray-900 text-white' : 'border border-gray-200'
            }`}
          >
            Not Started
          </button>
          <button
            type="button"
            onClick={() => setFilter('in_play')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'in_play' ? 'bg-gray-900 text-white' : 'border border-gray-200'
            }`}
          >
            In Play
          </button>
          <button
            type="button"
            onClick={() => setFilter('finished')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'finished' ? 'bg-gray-900 text-white' : 'border border-gray-200'
            }`}
          >
            Finished
          </button>
          <button
            type="button"
            onClick={() => setFilter('archive')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'archive' ? 'bg-gray-900 text-white' : 'border border-gray-200'
            }`}
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'all' ? 'bg-gray-900 text-white' : 'border border-gray-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={load}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && bets.length === 0 && (
        <p className="text-sm text-gray-500">Loading bets…</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {visible.length === 0 && !loading && (
        <p className="text-sm text-gray-500">No bets in this view.</p>
      )}

      <ul className="space-y-4">
        {visible.map((bet) => (
          <BetAdminCard key={bet.id} bet={bet} onResolved={load} />
        ))}
      </ul>
    </div>
  )
}
