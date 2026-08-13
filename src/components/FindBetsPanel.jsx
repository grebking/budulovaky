import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EVENT_TYPES } from '../constants/eventTypes'
import { fetchAllBets, formatMoney, isBetJoinable } from '../services/betsService'

export default function FindBetsPanel({ refreshKey }) {
  const [bets, setBets] = useState([])
  const [flair, setFlair] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchAllBets()
      setBets(data)
      setError(null)
    } catch (err) {
      setError(err.message ?? 'Could not load bets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load, refreshKey])

  const openJoinable = bets.filter((bet) => isBetJoinable(bet))
  const filtered =
    flair === 'All'
      ? openJoinable
      : openJoinable.filter((bet) => bet.event_type === flair)

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-medium text-gray-900 mb-1">Find a bet</h2>
      <p className="text-sm text-gray-500 mb-4">
        Filter by flair — only bets before event start time.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFlair('All')}
          className={`px-3 py-1.5 text-sm rounded-full border ${
            flair === 'All' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'
          }`}
        >
          All
        </button>
        {EVENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFlair(type)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              flair === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {filtered.length === 0 && !loading && (
        <p className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl">
          No open bets in this category.
        </p>
      )}

      <ul className="space-y-3">
        {filtered.map((bet) => (
          <li key={bet.id}>
            <Link
              to={`/bet/${bet.id}`}
              className="block rounded-xl border border-gray-200 p-4 hover:border-gray-400 hover:bg-gray-50/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {bet.event_type}
                </span>
                <span className="text-xs text-gray-400">
                  by @{bet.creator_username ?? bet.created_by_label}
                </span>
              </div>
              <p className="font-medium text-gray-900">{bet.title}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(bet.event_date).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <span>Side 1: {formatMoney(bet.side1Total)} ({bet.side1.length})</span>
                <span>Side 2: {formatMoney(bet.side2Total)} ({bet.side2.length})</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
