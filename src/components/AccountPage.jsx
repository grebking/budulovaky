import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUserBets, formatMoney } from '../services/betsService'

export default function AccountPage({ userId }) {
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const userBets = await fetchUserBets(userId)
        setBets(userBets)
      } catch (err) {
        setError(err.message || 'Failed to load bets')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId])

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-500">Loading bets...</p></div>
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">My Bets</h1>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {bets.length === 0 ? (
          <p className="text-sm text-gray-500">No bets yet</p>
        ) : (
          <div className="space-y-3">
            {bets.map((bet) => {
              const myEntries = bet.entries.filter(e => e.user_id === userId && e.status !== 'cancelled')
              if (myEntries.length === 0) return null

              return (
                <div key={bet.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <Link to={`/bet/${bet.id}`} className="block">
                    <p className="font-medium text-gray-900">{bet.title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {bet.event_type} · {new Date(bet.event_date).toLocaleString()}
                    </p>
                  </Link>
                  <div className="mt-3 space-y-2">
                    {myEntries.map((entry) => {
                      const side = entry.side === 1 ? bet.side1_label : bet.side2_label
                      return (
                        <div key={entry.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{side}</span>
                          <span className="font-medium">{formatMoney(entry.stake)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
