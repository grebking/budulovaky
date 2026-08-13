import { getSupabase } from '../lib/supabase'
import { PLATFORM_FEE_PERCENT, STARTING_BALANCE } from '../constants/eventTypes'
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
  const side1 = entries.filter((e) => e.side === 1)
  const side2 = entries.filter((e) => e.side === 2)
  const sum = (list) => list.reduce((t, e) => t + Number(e.stake), 0)
  const s1 = sum(side1)
  const s2 = sum(side2)

  if (winner === 'scratch') {
    for (const entry of entries) {
      await adjustBalance(entry.user_id, Number(entry.stake))
      await recordBetResult(entry.user_id, bet.id, 0)
    }
    return
  }

  const winners = winner === 'side1' ? side1 : side2
  const losers = winner === 'side1' ? side2 : side1
  const loserPool = sum(losers)
  const winnerPool = sum(winners)

  for (const entry of losers) {
    await recordBetResult(entry.user_id, bet.id, -Number(entry.stake))
  }

  if (winnerPool === 0) return

  for (const entry of winners) {
    const share = loserPool * (Number(entry.stake) / winnerPool)
    const fee = share * (PLATFORM_FEE_PERCENT / 100)
    const netWin = share - fee
    await adjustBalance(entry.user_id, Number(entry.stake) + netWin)
    await recordBetResult(entry.user_id, bet.id, netWin)
  }
}
