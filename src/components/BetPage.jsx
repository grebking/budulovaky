import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import { WIN_MULTIPLIER, PLATFORM_FEE_PERCENT } from '../constants/eventTypes'
import {
  cancelBetEntry,
  estimateFill,
  fetchBet,
  formatMoney,
  getBetShareUrl,
  isBetJoinable,
  joinBet,
  sellBetEntry,
} from '../services/betsService'

function quickAdd(current, amount) {
  const base = Number(current) || 0
  return String(Math.round((base + amount) * 100) / 100)
}

export default function BetPage({ userId, authenticated, onLogin, onBalanceChange }) {
  const { betId } = useParams()
  const { user } = usePrivy()
  const [bet, setBet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [joinSide, setJoinSide] = useState(1)
  const [joinStake, setJoinStake] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [cancelLoadingId, setCancelLoadingId] = useState(null)
  const [sellLoadingId, setSellLoadingId] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchBet(betId)
      setBet(data)
      setError(null)
    } catch (err) {
      setError(err.message ?? 'Bet not found.')
      setBet(null)
    } finally {
      setLoading(false)
    }
  }, [betId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [load])

  const myEntries = useMemo(
    () => bet?.entries.filter((e) => e.user_id === userId && e.status !== 'cancelled') ?? [],
    [bet, userId],
  )

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getBetShareUrl(betId))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleJoin = async () => {
    if (!authenticated) {
      setError('Login to place a bet.')
      return
    }

    const stake = Number(joinStake)
    const side = Number(joinSide)

    if (!Number.isFinite(stake) || stake <= 0) {
      setError('Enter a valid amount.')
      return
    }

    setJoinLoading(true)
    setError(null)
    try {
      await joinBet({ betId, userId, side, stake })
      await load()
      onBalanceChange?.()
      setJoinStake('')
    } catch (err) {
      setError(err.message ?? 'Could not place bet.')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleCancel = async (entryId) => {
    setCancelLoadingId(entryId)
    setError(null)
    try {
      await cancelBetEntry({ entryId, userId })
      await load()
      onBalanceChange?.()
    } catch (err) {
      setError(err.message ?? 'Could not cancel order.')
    } finally {
      setCancelLoadingId(null)
    }
  }

  const handleSell = async (entryId) => {
    setSellLoadingId(entryId)
    setError(null)
    try {
      await sellBetEntry({ entryId, userId })
      await load()
      onBalanceChange?.()
    } catch (err) {
      setError(err.message ?? 'Could not sell position.')
    } finally {
      setSellLoadingId(null)
    }
  }

  const canSellPosition = (entry, bet) => {
    if (entry.status !== 'active') return false
    if (entry.is_sell_position) return false
    const eventDate = new Date(bet.event_date)
    const now = new Date()
    const minutesUntilClose = (eventDate - now) / (1000 * 60)
    return minutesUntilClose >= 15
  }

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Loading market…</p>
  }

  if (!bet) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? 'Market not found.'}</p>
        <Link to="/" className="text-sm text-gray-600 underline mt-4 inline-block">
          Back home
        </Link>
      </div>
    )
  }

  const canJoin = isBetJoinable(bet)
  const creatorName = bet.creator_username ?? bet.created_by_label
  const matchedPool = Math.min(bet.side1Total, bet.side2Total)
  const side1Pct = bet.totalPool > 0 ? Math.round((bet.side1Total / bet.totalPool) * 100) : 50
  const side2Pct = 100 - side1Pct

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block">
          ← Markets
        </Link>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Main column */}
          <div className="space-y-6 min-w-0">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                {bet.event_type} · Closes {new Date(bet.event_date).toLocaleString()}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">
                {bet.title}
              </h1>
              <Link
                to={accountPath(creatorName)}
                className="text-sm text-gray-500 hover:text-gray-900 mt-2 inline-block"
              >
                Created by @{creatorName}
              </Link>
            </div>

            {/* Probability bar */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-emerald-700">
                  {bet.side1_label} {side1Pct}%
                </span>
                <span className="font-medium text-gray-600">
                  {bet.side2_label} {side2Pct}%
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
                <div className="bg-emerald-500 transition-all" style={{ width: `${side1Pct}%` }} />
                <div className="bg-gray-300 transition-all" style={{ width: `${side2Pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {formatMoney(bet.totalPool)} total orders · {formatMoney(matchedPool)} matched at
                close · {bet.totalPeople} participants
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Win is {WIN_MULTIPLIER}× - platform fees ({PLATFORM_FEE_PERCENT}%)
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900">Outcomes</h2>
                <span className="text-xs text-gray-400 uppercase">{bet.status}</span>
              </div>

              <div className="divide-y divide-gray-100">
                {[
                  { side: 1, label: bet.side1_label, total: bet.side1Total, list: bet.side1, pct: side1Pct },
                  { side: 2, label: bet.side2_label, total: bet.side2Total, list: bet.side2, pct: side2Pct },
                ].map(({ side, label, total, list, pct }) => (
                  <div key={side} className="px-4 py-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatMoney(total)} · {list.length} orders
                      </p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900 w-16 text-right">{pct}%</p>
                    {canJoin && authenticated && (
                      <button
                        type="button"
                        onClick={() => setJoinSide(side)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg ${
                          joinSide === side
                            ? 'bg-emerald-600 text-white'
                            : side === 1
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Buy {label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-medium text-gray-900 mb-2">Rules</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{bet.rules}</p>
              <button
                type="button"
                onClick={copyLink}
                className="mt-4 text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {copied ? 'Link copied!' : 'Copy share link'}
              </button>
            </div>

            {myEntries.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-medium text-gray-900">Your orders</h2>
                </div>
                <ul className="divide-y divide-gray-100">
                  {myEntries.map((entry) => {
                    const estFill = estimateFill(entry, bet.entries)
                    const isSettled = bet.status !== 'open'
                    const filled = isSettled ? Number(entry.filled_stake) : estFill
                    const sideLabel = entry.side === 1 ? bet.side1_label : bet.side2_label

                    return (
                      <li
                        key={entry.id}
                        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{sideLabel}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Ordered {formatMoney(entry.stake)}
                            {' · '}
                            {isSettled ? 'Filled' : 'Est. fill'} {formatMoney(filled)}
                            {!isSettled && filled < Number(entry.stake) && (
                              <span className="text-amber-600">
                                {' '}
                                ({formatMoney(Number(entry.stake) - filled)} may refund)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {canSellPosition(entry, bet) && (
                            <button
                              type="button"
                              disabled={sellLoadingId === entry.id}
                              onClick={() => handleSell(entry.id)}
                              className="text-sm px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            >
                              {sellLoadingId === entry.id ? 'Selling…' : 'Sell'}
                            </button>
                          )}
                          {canJoin && (
                            <button
                              type="button"
                              disabled={cancelLoadingId === entry.id}
                              onClick={() => handleCancel(entry.id)}
                              className="text-sm px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            >
                              {cancelLoadingId === entry.id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {bet.status !== 'open' && (
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                Settled:{' '}
                {bet.winner === 'side1'
                  ? bet.side1_label
                  : bet.winner === 'side2'
                    ? bet.side2_label
                    : 'Scratch — refunds issued'}
                {' · '}
                Winners paid {WIN_MULTIPLIER}× on filled amount
              </p>
            )}
          </div>

          {/* Trading panel */}
          <div className="lg:sticky lg:top-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">Trade</p>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {bet.status === 'open' && !canJoin && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Betting closed — event already started.
                  </p>
                )}

                {canJoin && (
                  <>
                    {!authenticated ? (
                      <div>
                        <p className="text-sm text-gray-500 mb-3">Login to trade on this market.</p>
                        <button
                          type="button"
                          onClick={onLogin}
                          className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                          Login to trade
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setJoinSide(1)}
                            className={`py-3 rounded-lg text-sm font-medium ${
                              joinSide === 1
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {bet.side1_label}
                          </button>
                          <button
                            type="button"
                            onClick={() => setJoinSide(2)}
                            className={`py-3 rounded-lg text-sm font-medium ${
                              joinSide === 2
                                ? 'bg-gray-700 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {bet.side2_label}
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Amount</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                              $
                            </span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0"
                              value={joinStake}
                              onChange={(e) => setJoinStake(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 pl-8 pr-3 py-3 text-2xl font-semibold text-gray-900"
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            {[1, 5, 10, 100].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setJoinStake(quickAdd(joinStake, n))}
                                className="flex-1 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                              >
                                +${n}
                              </button>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-gray-400">
                          Unfilled amount is refunded when the market closes. Winners receive{' '}
                          {WIN_MULTIPLIER}× on filled stake (0.2× fee per matched dollar).
                        </p>

                        <button
                          type="button"
                          disabled={joinLoading}
                          onClick={handleJoin}
                          className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {joinLoading ? 'Placing…' : 'Trade'}
                        </button>
                      </>
                    )}
                  </>
                )}

                {bet.status !== 'open' && (
                  <p className="text-sm text-gray-500 text-center py-4">This market is settled.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
