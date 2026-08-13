import { getSupabase } from '../lib/supabase'
import { isBetJoinable, isValidNewEventDate } from '../utils/profileUtils'
import {
  adjustBalance,
  deductBalance,
  fetchProfileByUserId,
  settleBetBalances,
} from './profileService'

function sumStake(list) {
  return list.reduce((total, entry) => total + Number(entry.stake), 0)
}

function sumFilled(list) {
  return list.reduce((total, entry) => total + Number(entry.filled_stake ?? 0), 0)
}

function groupEntries(entries = []) {
  const active = entries.filter((entry) => entry.status !== 'cancelled')
  const side1 = active.filter((entry) => entry.side === 1)
  const side2 = active.filter((entry) => entry.side === 2)

  return {
    side1,
    side2,
    side1Total: sumStake(side1),
    side2Total: sumStake(side2),
    side1Filled: sumFilled(side1),
    side2Filled: sumFilled(side2),
    totalPool: sumStake(active),
    totalFilled: sumFilled(active),
    totalPeople: active.length,
  }
}

/** Estimate how much of an open order would fill if the bet closed now. */
export function estimateFill(entry, entries) {
  if (entry.status === 'cancelled') return 0
  if (Number(entry.filled_stake) > 0) return Number(entry.filled_stake)

  const active = entries.filter((e) => e.status !== 'cancelled')
  const side1Total = sumStake(active.filter((e) => e.side === 1))
  const side2Total = sumStake(active.filter((e) => e.side === 2))
  const matchable = Math.min(side1Total, side2Total)
  if (matchable <= 0) return 0

  const mySideTotal = entry.side === 1 ? side1Total : side2Total
  if (mySideTotal <= 0) return 0

  return Number(entry.stake) * (matchable / mySideTotal)
}

export function computeEntryFills(entries) {
  const active = entries.filter((entry) => entry.status !== 'cancelled')
  const side1 = active.filter((entry) => entry.side === 1)
  const side2 = active.filter((entry) => entry.side === 2)
  const side1Total = sumStake(side1)
  const side2Total = sumStake(side2)
  const matchable = Math.min(side1Total, side2Total)

  return active.map((entry) => {
    const requested = Number(entry.stake)
    if (matchable <= 0) {
      return { ...entry, filled_stake: 0, refund: requested }
    }

    const mySideTotal = entry.side === 1 ? side1Total : side2Total
    const filled = requested * (matchable / mySideTotal)
    return { ...entry, filled_stake: filled, refund: requested - filled }
  })
}

function attachGrouped(bet, allEntries) {
  const entries = allEntries.filter((entry) => entry.bet_id === bet.id)
  return {
    ...bet,
    entries,
    ...groupEntries(entries),
  }
}

export async function fetchAllBets() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data: bets, error } = await supabase
    .from('bets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  const { data: entries, error: entriesError } = await supabase.from('bet_entries').select('*')
  if (entriesError) throw entriesError

  return bets.map((bet) => attachGrouped(bet, entries))
}

export async function fetchBet(betId) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data: bet, error } = await supabase.from('bets').select('*').eq('id', betId).single()
  if (error) throw error

  const { data: entries, error: entriesError } = await supabase
    .from('bet_entries')
    .select('*')
    .eq('bet_id', betId)

  if (entriesError) throw entriesError

  return {
    ...bet,
    entries,
    ...groupEntries(entries),
  }
}

export async function fetchUserBets(userId) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data: userEntries, error: userEntriesError } = await supabase
    .from('bet_entries')
    .select('bet_id')
    .eq('user_id', userId)
    .neq('status', 'cancelled')

  if (userEntriesError) throw userEntriesError

  const { data: createdBets, error: createdError } = await supabase
    .from('bets')
    .select('id')
    .eq('created_by_id', userId)

  if (createdError) throw createdError

  const betIds = [
    ...new Set([
      ...(userEntries ?? []).map((entry) => entry.bet_id),
      ...(createdBets ?? []).map((bet) => bet.id),
    ]),
  ]

  if (betIds.length === 0) return []

  const { data: bets, error: betsError } = await supabase.from('bets').select('*').in('id', betIds)
  if (betsError) throw betsError

  const { data: entries, error: entriesError } = await supabase
    .from('bet_entries')
    .select('*')
    .in('bet_id', betIds)

  if (entriesError) throw entriesError

  return (bets ?? [])
    .map((bet) => attachGrouped(bet, entries ?? []))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export async function createBet(payload) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const eventDate = new Date(payload.event_date)
  if (!isValidNewEventDate(eventDate)) {
    throw new Error('Event must be between now and 7 days ahead.')
  }

  const profile = await fetchProfileByUserId(payload.created_by_id)
  if (!profile) throw new Error('Profile not found.')

  const { data, error } = await supabase
    .from('bets')
    .insert({
      title: payload.title,
      event_type: payload.event_type,
      event_date: payload.event_date,
      side1_label: payload.side1_label,
      side2_label: payload.side2_label,
      rules: payload.rules,
      created_by_id: payload.created_by_id,
      created_by_label: profile.username,
      creator_username: profile.username,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function joinBet({ betId, userId, side, stake }) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const bet = await fetchBet(betId)
  if (!isBetJoinable(bet)) {
    throw new Error('This bet is closed — the event already started or bet is settled.')
  }

  const profile = await fetchProfileByUserId(userId)
  if (!profile) throw new Error('Profile not found.')
  if (Number(profile.balance) < stake) {
    throw new Error('Insufficient balance.')
  }

  await deductBalance(userId, stake)

  const { data, error } = await supabase
    .from('bet_entries')
    .insert({
      bet_id: betId,
      user_id: userId,
      user_label: profile.username,
      side,
      stake,
      filled_stake: 0,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    await adjustBalance(userId, stake)
    throw error
  }

  return data
}

export async function cancelBetEntry({ entryId, userId }) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data: entry, error } = await supabase
    .from('bet_entries')
    .select('*')
    .eq('id', entryId)
    .single()

  if (error) throw error
  if (entry.user_id !== userId) throw new Error('Not your order.')
  if (entry.status === 'cancelled') throw new Error('Order already cancelled.')

  const bet = await fetchBet(entry.bet_id)
  if (!isBetJoinable(bet)) {
    throw new Error('Cannot cancel — betting is closed for this event.')
  }

  const { error: updateError } = await supabase
    .from('bet_entries')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      filled_stake: 0,
    })
    .eq('id', entryId)

  if (updateError) throw updateError

  await adjustBalance(userId, Number(entry.stake))
  return entry
}

export async function finalizeBetMatching(betId) {
  const supabase = getSupabase()
  const bet = await fetchBet(betId)
  const fills = computeEntryFills(bet.entries)

  for (const entry of fills) {
    if (entry.status === 'cancelled') continue

    const { error } = await supabase
      .from('bet_entries')
      .update({ filled_stake: entry.filled_stake })
      .eq('id', entry.id)

    if (error) throw error

    if (entry.refund > 0) {
      await adjustBalance(entry.user_id, entry.refund)
    }
  }

  return fetchBet(betId)
}

export async function resolveBet(betId, winner) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const bet = await finalizeBetMatching(betId)
  const status = winner === 'scratch' ? 'scratch' : 'resolved'

  await settleBetBalances(bet, bet.entries, winner)

  const { data, error } = await supabase
    .from('bets')
    .update({ status, winner })
    .eq('id', betId)
    .select()
    .single()

  if (error) throw error
  return data
}

export function formatMoney(amount) {
  return `$${Number(amount).toFixed(2)}`
}

export function getBetShareUrl(betId) {
  return `${window.location.origin}/bet/${betId}`
}

export { isBetJoinable }
