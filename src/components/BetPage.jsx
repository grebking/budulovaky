import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchBet,
  formatMoney,
  getBetShareUrl,
  joinBet,
} from '../services/betsService'

export default function BetPage({ userId, userLabel, authenticated, onLogin }) {
  const { betId } = useParams()
  const [bet, setBet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [joinSide, setJoinSide] = useState('1')
  const [joinStake, setJoinStake] = useState('1')
  const [joinLoading, setJoinLoading] = useState(false)
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
      setError('Login to join this bet.')
      return
    }

    const stake = Number(joinStake)
    const side = Number(joinSide)

    if (!Number.isFinite(stake) || stake <= 0) {
      setError('Enter a valid virtual stake.')
      return
    }

    setJoinLoading(true)
    setError(null)
    try {
      await joinBet({ betId, userId, userLabel, side, stake })
      await load()
      setJoinStake('1')
    } catch (err) {
      setError(err.message ?? 'Could not join bet.')
    } finally {
      setJoinLoading(false)
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Loading bet…</p>
  }

  if (!bet) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? 'Bet not found.'}</p>
        <Link to="/" className="text-sm text-gray-600 underline mt-4 inline-block">
          Back home
        </Link>
      </div>
    )
  }

  const isOpen = bet.status === 'open'

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block">
        ← All bets
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{bet.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {bet.event_type} · {new Date(bet.event_date).toLocaleString()}
            </p>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full border border-gray-200">
            {bet.status}
          </span>
        </div>

        <p className="text-sm text-gray-600 whitespace-pre-wrap mb-4">{bet.rules}</p>

        <button
          type="button"
          onClick={copyLink}
          className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {copied ? 'Link copied!' : 'Copy share link'}
        </button>
        <p className="text-xs text-gray-400 mt-2 break-all">{getBetShareUrl(betId)}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-xs uppercase text-gray-400">Side 1 — {bet.side1_label}</p>
          <p className="text-lg font-semibold mt-1">
            {formatMoney(bet.side1Total)} · {bet.side1.length} people
          </p>
          <ul className="mt-3 text-sm text-gray-600 space-y-1">
            {bet.side1.map((entry) => (
              <li key={entry.id}>{entry.user_label} — {formatMoney(entry.stake)}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-xs uppercase text-gray-400">Side 2 — {bet.side2_label}</p>
          <p className="text-lg font-semibold mt-1">
            {formatMoney(bet.side2Total)} · {bet.side2.length} people
          </p>
          <ul className="mt-3 text-sm text-gray-600 space-y-1">
            {bet.side2.map((entry) => (
              <li key={entry.id}>{entry.user_label} — {formatMoney(entry.stake)}</li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {isOpen && (
        <section className="rounded-2xl border border-gray-900/20 bg-white p-5">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Join this bet</h2>
          {!authenticated ? (
            <div>
              <p className="text-sm text-gray-500 mb-3">Login to join either side.</p>
              <button
                type="button"
                onClick={onLogin}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
              >
                Login to join
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Side</label>
                <select
                  value={joinSide}
                  onChange={(e) => setJoinSide(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="1">Side 1 — {bet.side1_label}</option>
                  <option value="2">Side 2 — {bet.side2_label}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Virtual stake ($)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={joinStake}
                  onChange={(e) => setJoinStake(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm w-28"
                />
              </div>
              <button
                type="button"
                disabled={joinLoading}
                onClick={handleJoin}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {joinLoading ? 'Joining…' : 'Join bet'}
              </button>
            </div>
          )}
        </section>
      )}

      {!isOpen && (
        <p className="text-sm text-gray-600">
          Settled:{' '}
          {bet.winner === 'side1'
            ? bet.side1_label
            : bet.winner === 'side2'
              ? bet.side2_label
              : 'Scratch — virtual refund'}
        </p>
      )}
    </div>
  )
}
