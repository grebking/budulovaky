import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { WIN_MULTIPLIER } from '../constants/eventTypes'
import {
  cancelBetEntry,
  estimateFill,
  fetchUserBets,
  formatMoney,
  isBetJoinable,
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
import WinLossChart from './WinLossChart'

function formatJoined(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function PositionRow({ bet, entry, userId, onCancel, cancelLoadingId }) {
  const sideLabel = entry.side === 1 ? bet.side1_label : bet.side2_label
  const isSettled = bet.status !== 'open'
  const filled = isSettled ? Number(entry.filled_stake) : estimateFill(entry, bet.entries)
  const canCancel = isBetJoinable(bet) && entry.status === 'active'

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
      <td className="py-4 pr-4">
        <Link to={`/bet/${bet.id}`} className="group">
          <p className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
            {bet.title}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {sideLabel} · {bet.event_type}
          </p>
        </Link>
      </td>
      <td className="py-4 px-3 text-sm text-gray-600 whitespace-nowrap">
        {formatMoney(entry.stake)}
      </td>
      <td className="py-4 px-3 text-sm whitespace-nowrap">
        <span className="font-medium text-gray-900">{formatMoney(filled)}</span>
        {!isSettled && filled < Number(entry.stake) && (
          <p className="text-xs text-amber-600 mt-0.5">est. at close</p>
        )}
      </td>
      <td className="py-4 pl-3 text-right whitespace-nowrap">
        {canCancel ? (
          <button
            type="button"
            disabled={cancelLoadingId === entry.id}
            onClick={() => onCancel(entry.id)}
            className="text-sm px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            {cancelLoadingId === entry.id ? '…' : 'Cancel'}
          </button>
        ) : (
          <span className="text-xs text-gray-400 capitalize">{bet.status}</span>
        )}
      </td>
    </tr>
  )
}

export default function AccountPage({ username, viewerUserId, isOwner }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [results, setResults] = useState([])
  const [bets, setBets] = useState([])
  const [tab, setTab] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saveMsg, setSaveMsg] = useState(null)
  const [cancelLoadingId, setCancelLoadingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
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

      const userBets = await fetchUserBets(p.user_id)
      setBets(userBets)

      const r = await fetchBetResults(p.user_id)
      setResults(r)
    } catch (err) {
      setError(err.message ?? 'Could not load account.')
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  const positions = useMemo(() => {
    const rows = []
    for (const bet of bets) {
      for (const entry of bet.entries) {
        if (entry.user_id !== profile?.user_id || entry.status === 'cancelled') continue
        rows.push({ bet, entry })
      }
    }
    return rows.sort(
      (a, b) => new Date(b.bet.event_date) - new Date(a.bet.event_date),
    )
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

  const biggestWin = useMemo(() => {
    if (!results.length) return 0
    return Math.max(0, ...results.map((r) => Number(r.profit)))
  }, [results])

  const list = tab === 'active' ? activePositions : closedPositions

  const saveProfile = async () => {
    setSaveMsg(null)
    setError(null)
    try {
      if (editUsername !== profile.username) {
        if (!canChangeUsername(profile)) {
          throw new Error(
            `Username can only be changed once per month. Wait ${daysUntilNameChange(profile)} more days.`,
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
      setError(err.message ?? 'Could not save.')
    }
  }

  const onAvatarFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 200000) {
      setError('Image must be under 200KB.')
      return
    }
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

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Loading profile…</p>
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Account @{username} not found.</p>
        <Link to="/" className="text-sm underline mt-4 inline-block">
          Home
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 min-h-0 bg-gray-50/50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile header — Polymarket-style */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex gap-4 items-start">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border border-gray-200 flex items-center justify-center text-xl font-semibold text-white shrink-0">
                  {profile.username.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">{profile.username}</h1>
                    <p className="text-xs text-gray-400 mt-1">
                      Joined {formatJoined(profile.created_at)}
                    </p>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setEditOpen((v) => !v)}
                      className="shrink-0 text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                    >
                      {editOpen ? 'Close' : 'Edit account'}
                    </button>
                  )}
                </div>
                {(profile.bio || isOwner) && (
                  <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">
                    {profile.bio || (isOwner ? 'Add a bio in Edit account.' : '')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Positions value</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {formatMoney(positionsValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Biggest win</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {formatMoney(biggestWin)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Predictions</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">{positions.length}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Balance: {formatMoney(profile.balance)} · Winners paid {WIN_MULTIPLIER}× on filled
              stake
            </p>
          </div>

          <WinLossChart results={results} />
        </div>

        {/* Edit account panel */}
        {isOwner && editOpen && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <p className="text-sm font-medium text-gray-900">Edit account</p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Display name (URL)</label>
              <input
                value={editUsername}
                onChange={(e) => setEditUsername(sanitizeUsername(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                {canChangeUsername(profile)
                  ? 'You can change your name once per month.'
                  : `Next change in ${daysUntilNameChange(profile)} days.`}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                maxLength={280}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Profile picture</label>
              <input type="file" accept="image/*" onChange={onAvatarFile} className="text-sm" />
              <input
                value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Or paste image URL"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={saveProfile}
                className="px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
            {saveMsg && <p className="text-sm text-green-700">{saveMsg}</p>}
          </div>
        )}

        {/* Positions */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-gray-900">Positions</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('active')}
                className={`px-4 py-1.5 text-sm rounded-lg font-medium ${
                  tab === 'active' ? 'bg-gray-900 text-white' : 'border border-gray-200'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setTab('closed')}
                className={`px-4 py-1.5 text-sm rounded-lg font-medium ${
                  tab === 'closed' ? 'bg-gray-900 text-white' : 'border border-gray-200'
                }`}
              >
                Closed
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border-b border-red-200 px-4 py-3">
              {error}
            </p>
          )}

          {list.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">
              {tab === 'active' ? 'No active positions.' : 'No closed positions yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-3 px-4 sm:px-6 font-medium">Market</th>
                    <th className="py-3 px-3 font-medium">Ordered</th>
                    <th className="py-3 px-3 font-medium">Filled</th>
                    <th className="py-3 pl-3 pr-4 sm:pr-6 font-medium text-right">
                      {tab === 'active' ? 'Action' : 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody className="px-4">
                  {list.map(({ bet, entry }) => (
                    <PositionRow
                      key={entry.id}
                      bet={bet}
                      entry={entry}
                      userId={profile.user_id}
                      onCancel={handleCancel}
                      cancelLoadingId={cancelLoadingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center pb-4">
          {window.location.origin}{accountPath(profile.username)}
        </p>
      </div>
    </div>
  )
}
