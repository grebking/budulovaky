import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllBets, formatMoney } from '../services/betsService'

export default function PublicBetsList({ refreshKey }) {
  const [bets, setBets] = useState([])
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

  const openBets = bets.filter((bet) => bet.status === 'open')

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-medium text-gray-900 mb-1">All open bets</h2>
      <p className="text-sm text-gray-500 mb-4">Everyone sees the same list — join any side.</p>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {openBets.length === 0 && !loading && (
        <p className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl">
          No open bets yet. Create one above.
        </p>
      )}

      <ul className="space-y-3">
        {openBets.map((bet) => (
          <li key={bet.id}>
            <Link
              to={`/bet/${bet.id}`}
              className="block rounded-xl border border-gray-200 p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-colors"
            >
              <p className="font-medium text-gray-900">{bet.title}</p>
              <p className="text-xs text-gray-500 mt-1">
                {bet.event_type} · {new Date(bet.event_date).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <span>
                  Side 1: {formatMoney(bet.side1Total)} ({bet.side1.length})
                </span>
                <span>
                  Side 2: {formatMoney(bet.side2Total)} ({bet.side2.length})
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
