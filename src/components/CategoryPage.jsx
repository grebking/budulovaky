import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAllBets, formatMoney } from '../services/betsService'

export default function CategoryPage() {
  const { category } = useParams()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const allBets = await fetchAllBets()
        const filtered = allBets.filter(bet => 
          bet.event_type === category && bet.status === 'open'
        )
        setBets(filtered)
      } catch (error) {
        console.error('Failed to load bets:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [category])

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Loading {category} bets…</p>
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">{category} Bets</h1>
        
        {bets.length === 0 ? (
          <p className="text-sm text-gray-500">No active bets in {category}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bets.map((bet) => {
              const side1Pct = bet.totalPool > 0 ? Math.round((bet.side1Total / bet.totalPool) * 100) : 50
              const side2Pct = 100 - side1Pct
              
              return (
                <Link
                  key={bet.id}
                  to={`/bet/${bet.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
                >
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{bet.event_type}</p>
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{bet.title}</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Closes {new Date(bet.event_date).toLocaleString()}
                  </p>
                  
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-emerald-700">{bet.side1_label} {side1Pct}%</span>
                    <span className="font-medium text-gray-600">{bet.side2_label} {side2Pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex bg-gray-100 mb-2">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${side1Pct}%` }} />
                    <div className="bg-gray-300 transition-all" style={{ width: `${side2Pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatMoney(bet.totalPool)} total · {bet.totalPeople} participants
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
