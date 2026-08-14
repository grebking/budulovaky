import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUserBets, formatMoney } from '../services/betsService'
import { fetchProfileByUsername, updateProfile } from '../services/profileService'
import { accountPath } from '../utils/profileUtils'

export default function AccountPage({ username, viewerUserId }) {
  const [profile, setProfile] = useState(null)
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwner = Boolean(viewerUserId && profile?.user_id === viewerUserId)

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
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await updateProfile(profile.user_id, {
        bio: editBio.slice(0, 280),
        avatar_url: avatarUrl.slice(0, 500000),
      })
      setEditOpen(false)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-500">Loading...</p></div>
  }

  if (!profile) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-gray-600">Profile not found</p></div>
  }

  const myBets = []
  for (const bet of bets) {
    for (const entry of bet.entries) {
      if (entry.user_id === profile.user_id && entry.status !== 'cancelled') {
        myBets.push({ bet, entry })
      }
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold">
                  {profile.username.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold">{profile.username}</h1>
                <p className="text-sm text-gray-500">{profile.bio || 'No bio'}</p>
              </div>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
              >
                Edit
              </button>
            )}
          </div>

          {editOpen && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Avatar URL</label>
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">My Bets</h2>
          {myBets.length === 0 ? (
            <p className="text-sm text-gray-500">No bets yet</p>
          ) : (
            <div className="space-y-2">
              {myBets.map(({ bet, entry }) => (
                <Link
                  key={entry.id}
                  to={`/bet/${bet.id}`}
                  className="block p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                >
                  <p className="font-medium">{bet.title}</p>
                  <p className="text-sm text-gray-500">
                    {entry.side === 1 ? bet.side1_label : bet.side2_label} · {formatMoney(entry.stake)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  )
}
