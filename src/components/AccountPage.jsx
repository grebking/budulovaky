import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchUserBets, formatMoney } from '../services/betsService'
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

function BetRow({ bet, userId }) {
  const myEntry = bet.entries.find((e) => e.user_id === userId)
  const isCreator = bet.created_by_id === userId

  return (
    <Link
      to={`/bet/${bet.id}`}
      className="block rounded-xl border border-gray-200 p-4 hover:border-gray-400 hover:bg-gray-50/50"
    >
      <p className="font-medium text-gray-900">{bet.title}</p>
      <p className="text-xs text-gray-500 mt-1">
        {bet.event_type} · {new Date(bet.event_date).toLocaleString()} · {bet.status}
      </p>
      {myEntry && (
        <p className="text-sm text-gray-600 mt-2">
          Your stake: {formatMoney(myEntry.stake)} on side {myEntry.side}
        </p>
      )}
      {isCreator && !myEntry && (
        <p className="text-sm text-gray-600 mt-2">You created this bet</p>
      )}
    </Link>
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
  const [editBio, setEditBio] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saveMsg, setSaveMsg] = useState(null)

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

  const activeBets = useMemo(
    () => bets.filter((b) => b.status === 'open'),
    [bets],
  )

  const historyBets = useMemo(
    () => bets.filter((b) => b.status === 'resolved' || b.status === 'scratch'),
    [bets],
  )

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
        navigate(accountPath(updated.username))
        return
      }
      await updateProfile(profile.user_id, {
        bio: editBio.slice(0, 280),
        avatar_url: avatarUrl.slice(0, 500000),
      })
      setSaveMsg('Profile updated.')
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

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Loading account…</p>
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Account @{username} not found.</p>
        <Link to="/" className="text-sm underline mt-4 inline-block">Home</Link>
      </div>
    )
  }

  const ownerId = profile.user_id
  const list = tab === 'active' ? activeBets : historyBets

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex gap-4 items-start">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl text-gray-400">
                @
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">@{profile.username}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Balance: <span className="font-medium text-gray-900">{formatMoney(profile.balance)}</span>
                <span className="text-gray-400"> (virtual)</span>
              </p>
              {profile.bio && !isOwner && (
                <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{profile.bio}</p>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="mt-6 border-t border-gray-100 pt-6 space-y-4">
              <p className="text-sm font-medium text-gray-900">Edit your public profile</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Username (URL)</label>
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
              <button
                type="button"
                onClick={saveProfile}
                className="px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700"
              >
                Save profile
              </button>
              {saveMsg && <p className="text-sm text-green-700">{saveMsg}</p>}
            </div>
          )}
        </div>

        <WinLossChart results={results} />

        <div>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setTab('active')}
              className={`px-4 py-2 text-sm rounded-lg font-medium ${
                tab === 'active' ? 'bg-gray-900 text-white' : 'border border-gray-200'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`px-4 py-2 text-sm rounded-lg font-medium ${
                tab === 'history' ? 'bg-gray-900 text-white' : 'border border-gray-200'
              }`}
            >
              History
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              {error}
            </p>
          )}

          {list.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded-xl">
              {tab === 'active' ? 'No open bets.' : 'No settled bets yet.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {list.map((bet) => (
                <li key={bet.id}>
                  <BetRow bet={bet} userId={ownerId} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Public profile: {window.location.origin}{accountPath(profile.username)}
        </p>
      </div>
    </div>
  )
}
