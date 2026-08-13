import React, { useMemo, useState } from 'react'
import { formatMoney } from '../services/betsService'

const RANGES = [
  { id: '1d', label: '1D', days: 1 },
  { id: '1w', label: '1W', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: 'all', label: 'ALL', days: null },
]

function filterByRange(results, days) {
  if (!days || !results.length) return results
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return results.filter((row) => new Date(row.created_at).getTime() >= cutoff)
}

function formatProfit(amount) {
  const value = Number(amount) || 0
  if (value >= 0) return formatMoney(value)
  return `-$${Math.abs(value).toFixed(2)}`
}

export default function WinLossChart({ results }) {
  const [range, setRange] = useState('all')

  const rangeDays = RANGES.find((r) => r.id === range)?.days ?? null
  const filtered = useMemo(
    () => filterByRange(results ?? [], rangeDays),
    [results, rangeDays],
  )

  const points = useMemo(() => {
    const start = [{ x: 0, y: 0, cumulative: 0 }]
    if (!filtered.length) return start

    let cumulative = 0
    const settled = filtered.map((row, index) => {
      cumulative += Number(row.profit)
      return { x: index + 1, y: cumulative, cumulative, at: row.created_at }
    })

    return [...start, ...settled]
  }, [filtered])

  const values = points.map((p) => p.y)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values, 1)
  const rangeSpan = max - min || 1
  const width = 480
  const height = 160
  const pad = 16

  const toCoord = (p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (width - pad * 2)
    const y = pad + (1 - (p.y - min) / rangeSpan) * (height - pad * 2)
    return { x, y }
  }

  const coords = points.map((p, i) => toCoord(p, i))
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const zeroY = pad + (1 - (0 - min) / rangeSpan) * (height - pad * 2)

  const areaPath =
    coords.length > 0
      ? [
          `M ${coords[0].x} ${zeroY}`,
          ...coords.map((c) => `L ${c.x} ${c.y}`),
          `L ${coords[coords.length - 1].x} ${zeroY}`,
          'Z',
        ].join(' ')
      : ''

  const last = points[points.length - 1]?.cumulative ?? 0
  const positive = last >= 0
  const stroke = positive ? '#2563eb' : '#dc2626'
  const fill = positive ? 'rgba(37, 99, 235, 0.12)' : 'rgba(220, 38, 38, 0.1)'

  const rangeLabel =
    range === 'all' ? 'All time' : RANGES.find((r) => r.id === range)?.label ?? ''

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 h-full flex flex-col shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Profit / Loss</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs ${
                positive ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {positive ? '▲' : '▼'}
            </span>
            <p
              className={`text-2xl font-semibold tracking-tight ${
                positive ? 'text-gray-900' : 'text-red-600'
              }`}
            >
              {formatProfit(last)}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-1">{rangeLabel} · since signup</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                range === r.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[140px]">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400">
              {results?.length ? 'No settled bets in this period.' : 'No settled bets yet.'}
            </p>
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
            <line
              x1={pad}
              y1={zeroY}
              x2={width - pad}
              y2={zeroY}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {areaPath && <path d={areaPath} fill={fill} stroke="none" />}
            <polyline fill="none" stroke={stroke} strokeWidth="2.5" points={linePoints} />
          </svg>
        )}
      </div>
    </div>
  )
}
