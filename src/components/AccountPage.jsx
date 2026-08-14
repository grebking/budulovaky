import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { WIN_MULTIPLIER } from '../constants/eventTypes'
import {
  cancelBetEntry,
  estimateFill,
  fetchUserBets,
  formatMoney,
  isBetJoinable,
  sellBetEntry,
} from '../services/betsService'
import {
  changeUsername,
  fetchBetResults,
  fetchProfileByUsername,
  updateProfile,
} from '../services/profileService'
import {
  accountPath,
  canChangeUsername,
  daysUntilNameChange,
  sanitizeUsername,
} from '../utils/profileUtils'
import EditProfileModal from './EditProfileModal'
import WinLossChart from './WinLossChart'

function friendlyDbError(err) {
  const msg = String(err?.message ?? err ?? '')
  if (msg.includes('profiles') && msg.includes('does not exist')) {
    return 'Profiles table missing — run supabase/schema-v2.sql in Supabase SQL Editor.'
  }
  if (msg.includes('bet_results') && msg.includes('does not exist')) {
    return 'Results table missing — run supabase/schema-v2.sql in Supabase SQL Editor.'
  }
  if (msg.includes('filled_stake') || msg.includes('bet_entries')) {
    return 'Database needs an update — run supabase/schema-v3.sql in Supabase SQL Editor.'
  }
  if (msg.includes('Database not configured')) {
    return 'Database not configured — add Supabase keys to your .env file.'
  }
  return msg || 'Something went wrong.'
}

function formatJoined(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function FillBar({ filled, stake, isEstimate }) {
  const ordered = Number(stake) || 0
  const amount = Number(filled) || 0
  const pct = ordered > 0 ? Math.min(100, Math.round((amount / ordered) * 100)) : 0

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">
          {formatMoney(amount)} / {formatMoney(ordered)}
        </span>
        <span className={`font-medium ${pct >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
          {pct}%{isEstimate && pct < 100 ? ' est.' : ''}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 100 ? 'bg-green-500' : 'bg-amber-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PositionRow({ bet, entry, profit, isOwner, onCancel, onSell, cancelLoadingId, sellLoadingId, isClosed, canSellPosition }) {
  const sideLabel = entry.side === 1 ? bet.side1_label : bet.side2_label
  const isSettled = bet.status !== 'open'
  const filled = isSettled ? Number(entry.filled_stake) : estimateFill(entry, bet.entries)
  const canCancel = isOwner && isBetJoinable(bet) && entry.status === 'active'
  const canSell = isOwner && canSellPosition(entry, bet)
  const stake = Number(entry.stake)

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
      <td className="py-4 pr-4 pl-4 sm:pl-6">
        <Link to={`/bet/${bet.id}`} className="group flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 shrink-0 flex items-center justify-center text-xs font-semibold text-gray-500 uppercase">
            {bet.event_type?.slice(0, 2) ?? 'MK'}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2 leading-snug">
              {bet.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium text-gray-700">{sideLabel}</span>
              {' · '}
              {bet.event_type}
            </p>
          </div>
        </Link>
      </td>
      <td className="py-4 px-3 text-sm text-gray-600 whitespace-nowrap align-top">
        {formatMoney(stake)}
      </td>
      <td className="py-4 px-3 align-top min-w-[140px]">
        <FillBar filled={filled} stake={stake} isEstimate={!isSettled} />
      </td>
      <td className="py-4 px-3 text-sm whitespace-nowrap align-top">
        {isClosed ? (
          profit != null ? (
            <div>
              <p className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profit >= 0 ? '+' : '-'}
                {formatMoney(Math.abs(profit))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{bet.status}</p>
            </div>
          ) : (
            <span className="text-xs text-gray-400 capitalize">{bet.status}</span>
          )
        ) : (
          <p className="font-medium text-gray-900">{formatMoney(filled)}</p>
        )}
      </td>
      <td className="py-4 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap align-top">
        <div className="flex gap-2 justify-end">
          {canSell && (
            <button
              type="button"
              disabled={sellLoadingId === entry.id}
              onClick={() => onSell(entry.id)}
              className="text-sm px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {sellLoadingId === entry.id ? '…' : 'Sell'}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={cancelLoadingId === entry.id}
              onClick={() => onCancel(entry.id)}
              className="text-sm px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {cancelLoadingId === entry.id ? '…' : 'Cancel'}
            </button>
          )}
          {isClosed && (
            <Link
              to={`/bet/${bet.id}`}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              View
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function AccountPage({ username, viewerUserId }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [results, setResults] = useState([])
  const [bets, setBets] = useState([])
  const [tab, setTab] = useState('active')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [betsError, setBetsError] = useState(null)
  const [resultsError, setResultsError] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saveMsg, setSaveMsg] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [cancelLoadingId, setCancelLoadingId] = useState(null)
  const [sellLoadingId, setSellLoadingId] = useState(null)
  const [copied, setCopied] = useState(false)

  const isOwner = Boolean(viewerUserId && profile?.user_id === viewerUserId)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setBetsError(null)
    setResultsError(null)
    try {
      const p = await fetchProfileByUsername(username)
      if (!p) {
        setProfile(null)
        return
      }
      setProfile(p)
      setEditBio(p.bio ?? '')
      setEditUsername(p.username)
      setAvatarUrl(p.avatar_url ?? '')

      try {
        const userBets = await fetchUserBets(p.user_id)
        setBets(userBets)
      } catch (err) {
        setBets([])
        setBetsError(friendlyDbError(err))
      }

      try {
        const r = await fetchBetResults(p.user_id)
        setResults(r)
      } catch (err) {
        setResults([])
        setResultsError(friendlyDbError(err))
      }
    } catch (err) {
      setError(friendlyDbError(err))
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  const profitByBet = useMemo(() => {
    const map = {}
    for (const row of results) {
      map[row.bet_id] = (map[row.bet_id] ?? 0) + Number(row.profit)
    }
    return map
  }, [results])

  const positions = useMemo(() => {
    const rows = []
    for (const bet of bets) {
      for (const entry of bet.entries) {
        if (entry.user_id !== profile?.user_id || entry.status === 'cancelled') continue
        rows.push({ bet, entry })
      }
    }
    return rows.sort((a, b) => new Date(b.bet.event_date) - new Date(a.bet.event_date))
  }, [bets, profile?.user_id])

  const activePositions = useMemo(
    () => positions.filter(({ bet }) => bet.status === 'open'),
    [positions],
  )

  const closedPositions = useMemo(
    () => positions.filter(({ bet }) => bet.status !== 'open'),
    [positions],
  )

  const positionsValue = useMemo(() => {
    return activePositions.reduce((sum, { bet, entry }) => {
      return sum + estimateFill(entry, bet.entries)
    }, 0)
  }, [activePositions])

  const totalProfit = useMemo(
    () => results.reduce((sum, r) => sum + Number(r.profit), 0),
    [results],
  )

  const biggestWin = useMemo(() => {
    if (!results.length) return 0
    return Math.max(0, ...results.map((r) => Number(r.profit)))
  }, [results])

  const list = useMemo(() => {
    const base = tab === 'active' ? activePositions : closedPositions
    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter(({ bet, entry }) => {
      const side = entry.side === 1 ? bet.side1_label : bet.side2_label
      return (
        bet.title.toLowerCase().includes(q) ||
        side.toLowerCase().includes(q) ||
        bet.event_type?.toLowerCase().includes(q)
      )
    })
  }, [tab, activePositions, closedPositions, search])

  const saveProfile = async () => {
    setSaveMsg(null)
    setSaveError(null)
    setSaving(true)
    try {
      if (editUsername !== profile.username) {
        if (!canChangeUsername(profile)) {
          throw new Error(
            `Username can only be changed once per month. Wait ${daysUntilNameChange(profile)} more days.`
          )
        }
        const updated = await changeUsername(profile.user_id, editUsername)
        await updateProfile(profile.user_id, {
          bio: editBio.slice(0, 280),
          avatar_url: avatarUrl.slice(0, 500000),
        })
        setSaveMsg('Profile updated.')
        setEditOpen(false)
        navigate(accountPath(updated.username))
        return
      }
      await updateProfile(profile.user_id, {
        bio: editBio.slice(0, 280),
        avatar_url: avatarUrl.slice(0, 500000),
      })
      setSaveMsg('Profile updated.')
      setEditOpen(false)
      await load()
    } catch (err) {
      setSaveError(friendlyDbError(err))
    } finally {
      setSaving(false)
    }
  }

  const getBioChangesRemaining = () => {
    if (!profile) return 3
    const now = new Date()
    const lastChanged = profile.bio_last_changed_at ? new Date(profile.bio_last_changed_at) : null
    const hoursSinceLastChange = lastChanged ? (now - lastChanged) / (1000 * 60 * 60) : 25
    
    // Reset count if 24 hours have passed
    let count = profile.bio_change_count || 0
    if (hoursSinceLastChange >= 24) {
      count = 0
    }
    
    return 3 - count
  }

  const onAvatarFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 200000) {
      setSaveError('Image must be under 200KB.')
      return
    }
    setSaveError(null)
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  const handleCancel = async (entryId) => {
    if (!isOwner || !viewerUserId) return
    setCancelLoadingId(entryId)
    setError(null)
    try {
      await cancelBetEntry({ entryId, userId: viewerUserId })
      await load()
    } catch (err) {
      setError(err.message ?? 'Could not cancel order.')
    } finally {
      setCancelLoadingId(null)
    }
  }

  const handleSell = async (entryId) => {
    if (!isOwner || !viewerUserId) return
    setSellLoadingId(entryId)
    setError(null)
    try {
      await sellBetEntry({ entryId, userId: viewerUserId })
      await load()
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

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${accountPath(profile.username)}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy link.')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading profile…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600">Account @{username} not found.</p>
          <Link to="/" className="text-sm underline mt-4 inline-block text-blue-600">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const isClosedTab = tab === 'closed'

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 min-h-0 bg-[#f8f9fb]">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Profile + chart row — Polymarket-style */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex gap-4 items-start">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-[72px] h-[72px] rounded-full object-cover border-2 border-gray-100 shrink-0"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-gray-100 flex items-center justify-center text-2xl font-semibold text-white shrink-0">
                  {profile.username.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                      {profile.username}
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                      Joined {formatJoined(profile.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={copyProfileLink}
                      title="Share profile"
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200"
                    >
                      {copied ? (
                        <span className="text-xs text-green-600 font-medium">Copied!</span>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      )}
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setSaveMsg(null)
                          setSaveError(null)
                          setEditOpen(true)
                        }}
                        className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap leading-relaxed">
                  {profile.bio ||
                    (isOwner ? 'No bio yet — click Edit to add one.' : 'No bio yet.')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Positions value</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {formatMoney(positionsValue)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Biggest win</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {formatMoney(biggestWin)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Predictions</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{positions.length}</p>
              </div>
            </div>

            {isOwner && (
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                Balance: {formatMoney(profile.balance)} · Winners paid {WIN_MULTIPLIER}× on filled
                stake · Total P/L:{' '}
                <span className={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {totalProfit >= 0 ? '+' : '-'}
                  {formatMoney(Math.abs(totalProfit))}
                </span>
              </p>
            )}
          </div>

          <WinLossChart results={results} />
        </div>

        {/* Positions panel */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Positions</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <svg
                    className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search positions"
                    className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-44 sm:w-52 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setTab('active')}
                    className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      tab === 'active'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('closed')}
                    className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      tab === 'closed'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Closed
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border-b border-red-100 px-4 sm:px-6 py-3">
              {error}
            </p>
          )}

          {(betsError || resultsError) && (
            <p className="text-sm text-amber-800 bg-amber-50 border-b border-amber-100 px-4 sm:px-6 py-3">
              {betsError || resultsError}
            </p>
          )}

          {list.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">
                {search
                  ? 'No positions match your search.'
                  : tab === 'active'
                    ? 'No active positions.'
                    : 'No closed positions yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3 pl-4 sm:pl-6 pr-4 font-medium">Market</th>
                    <th className="py-3 px-3 font-medium">Ordered</th>
                    <th className="py-3 px-3 font-medium">Filled</th>
                    <th className="py-3 px-3 font-medium">{isClosedTab ? 'P / L' : 'Value'}</th>
                    <th className="py-3 pl-3 pr-4 sm:pr-6 font-medium text-right">
                      {tab === 'active' && isOwner ? 'Action' : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ bet, entry }) => (
                    <PositionRow
                      key={entry.id}
                      bet={bet}
                      entry={entry}
                      profit={profitByBet[bet.id]}
                      isOwner={isOwner}
                      onCancel={handleCancel}
                      onSell={handleSell}
                      cancelLoadingId={cancelLoadingId}
                      sellLoadingId={sellLoadingId}
                      isClosed={isClosedTab}
                      canSellPosition={canSellPosition}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          Public profile · {window.location.origin}
          {accountPath(profile.username)}
        </p>
      </div>

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editUsername={editUsername}
        setEditUsername={setEditUsername}
        editBio={editBio}
        setEditBio={setEditBio}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        onAvatarFile={onAvatarFile}
        profile={profile}
        onSave={saveProfile}
        saveMsg={saveMsg}
        saveError={saveError}
        saving={saving}
        getBioChangesRemaining={getBioChangesRemaining}
      />
    </div>
  )
}
