import React, { useMemo } from 'react'
import { formatMoney } from '../services/betsService'

export default function WinLossChart({ results }) {
  const points = useMemo(() => {
    if (!results?.length) return [{ x: 0, y: 0, cumulative: 0 }]

    let cumulative = 0
    return results.map((row, index) => {
      cumulative += Number(row.profit)
      return { x: index + 1, y: cumulative, cumulative, at: row.created_at }
    })
  }, [results])

  const values = points.map((p) => p.y)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values, 1)
  const range = max - min || 1
  const width = 320
  const height = 120
  const pad = 12

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (width - pad * 2)
    const y = pad + (1 - (p.y - min) / range) * (height - pad * 2)
    return `${x},${y}`
  })

  const last = points[points.length - 1]?.cumulative ?? 0
  const positive = last >= 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-900">Profit since signup</p>
        <p
          className={`text-sm font-semibold ${positive ? 'text-green-700' : 'text-red-600'}`}
        >
          {formatMoney(last)}
        </p>
      </div>
      {points.length <= 1 && results.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No settled bets yet.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md h-auto">
          <line
            x1={pad}
            y1={pad + (1 - (0 - min) / range) * (height - pad * 2)}
            x2={width - pad}
            y2={pad + (1 - (0 - min) / range) * (height - pad * 2)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <polyline
            fill="none"
            stroke={positive ? '#15803d' : '#dc2626'}
            strokeWidth="2"
            points={coords.join(' ')}
          />
        </svg>
      )}
    </div>
  )
}
