import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

export default function AccountPage({ username }) {
  const [profile, setProfile] = useState(null)
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const supabase = getSupabase()
        if (!supabase) throw new Error('Database not configured')

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single()

        if (profileError) throw profileError
        if (!profileData) {
          setProfile(null)
          setLoading(false)
          return
        }

        setProfile(profileData)

        // Fetch user's bet entries directly
        const { data: entriesData, error: entriesError } = await supabase
          .from('bet_entries')
          .select('*, bets(*)')
          .eq('user_id', profileData.user_id)
          .neq('status', 'cancelled')

        if (entriesError) throw entriesError

        // Transform data
        const userBets = entriesData.map(entry => ({
          entry,
          bet: entry.bets
        }))
        setBets(userBets)
      } catch (err) {
        setError(err.message || 'Failed to load portfolio')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [username])

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-500">Loading portfolio...</p></div>
  }

  if (!profile) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-gray-600">Portfolio not found</p></div>
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold">
              {profile.username.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{profile.username}</h1>
              <p className="text-sm text-gray-500">Balance: ${Number(profile.balance).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Portfolio</h2>
          {bets.length === 0 ? (
            <p className="text-sm text-gray-500">No positions yet</p>
          ) : (
            <div className="space-y-2">
              {bets.map(({ entry, bet }) => (
                <Link
                  key={entry.id}
                  to={`/bet/${bet.id}`}
                  className="block p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                >
                  <p className="font-medium">{bet.title}</p>
                  <p className="text-sm text-gray-500">
                    {entry.side === 1 ? bet.side1_label : bet.side2_label} · ${Number(entry.stake).toFixed(2)}
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
