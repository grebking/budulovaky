import { getSupabase } from '../lib/supabase'
import { WIN_MULTIPLIER, STARTING_BALANCE } from '../constants/eventTypes'
import { sanitizeUsername } from '../utils/profileUtils'

export async function fetchProfileByUserId(userId) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchProfileByUsername(username) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (error) throw error
  return data
}

async function usernameExists(username) {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle()
  return Boolean(data)
}

export async function ensureProfile(userId, seedLabel) {
  const existing = await fetchProfileByUserId(userId)
  if (existing) return existing

  const base = sanitizeUsername(seedLabel.split('@')[0] || seedLabel || 'player')
  let username = base
  let suffix = 0

  while (await usernameExists(username)) {
    suffix += 1
    username = `${base}${suffix}`
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      username,
      bio: '',
      avatar_url: '',
      balance: STARTING_BALANCE,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function changeUsername(userId, newUsername) {
  const clean = sanitizeUsername(newUsername)
  if (clean.length < 3) {
    throw new Error('Username must be at least 3 characters.')
  }
  if (await usernameExists(clean)) {
    throw new Error('That username is already taken.')
  }

  return updateProfile(userId, {
    username: clean,
    name_changed_at: new Date().toISOString(),
  })
}

export async function adjustBalance(userId, delta) {
  const profile = await fetchProfileByUserId(userId)
  if (!profile) throw new Error('Profile not found.')

  const next = Number(profile.balance) + delta
  if (next < 0) throw new Error('Insufficient balance.')

  return updateProfile(userId, { balance: next })
}

export async function deductBalance(userId, amount) {
  return adjustBalance(userId, -amount)
}

export async function fetchBetResults(userId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('bet_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function recordBetResult(userId, betId, profit) {
  const supabase = getSupabase()
  const { error } = await supabase.from('bet_results').insert({
    user_id: userId,
    bet_id: betId,
    profit,
  })
  if (error) throw error
}

export async function settleBetBalances(bet, entries, winner) {
  const active = entries.filter((e) => e.status !== 'cancelled')
  const filled = (entry) => Number(entry.filled_stake ?? 0)

  if (winner === 'scratch') {
    for (const entry of active) {
      const amount = filled(entry)
      if (amount > 0) {
        await adjustBalance(entry.user_id, amount)
      }
      await recordBetResult(entry.user_id, bet.id, 0)
    }
    return
  }

  const winners = active.filter((e) =>
    winner === 'side1' ? e.side === 1 : e.side === 2,
  )
  const losers = active.filter((e) =>
    winner === 'side1' ? e.side === 2 : e.side === 1,
  )

  for (const entry of losers) {
    const amount = filled(entry)
    if (amount > 0) {
      await recordBetResult(entry.user_id, bet.id, -amount)
    }
  }

  for (const entry of winners) {
    const amount = filled(entry)
    if (amount <= 0) continue

    const payout = amount * WIN_MULTIPLIER
    const profit = payout - amount
    await adjustBalance(entry.user_id, payout)
    await recordBetResult(entry.user_id, bet.id, profit)
  }
}
