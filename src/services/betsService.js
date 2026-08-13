import { getSupabase } from '../lib/supabase'
import { isBetJoinable, isValidNewEventDate } from '../utils/profileUtils'
import {
  adjustBalance,
  deductBalance,
  fetchProfileByUserId,
  settleBetBalances,
} from './profileService'

function groupEntries(entries = []) {
  const side1 = entries.filter((entry) => entry.side === 1)
  const side2 = entries.filter((entry) => entry.side === 2)
  const sum = (list) => list.reduce((total, entry) => total + Number(entry.stake), 0)

  return {
    side1,
    side2,
    side1Total: sum(side1),
    side2Total: sum(side2),
    totalPool: sum(entries),
    totalPeople: entries.length,
  }
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
  const all = await fetchAllBets()
  return all.filter(
    (bet) =>
      bet.created_by_id === userId ||
      bet.entries.some((entry) => entry.user_id === userId),
  )
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
    })
    .select()
    .single()

  if (error) {
    await adjustBalance(userId, stake)
    throw error
  }

  return data
}

export async function resolveBet(betId, winner) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const bet = await fetchBet(betId)
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
