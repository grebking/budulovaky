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

function groupEntries(entries = [], bet = {}) {
  const active = entries.filter((entry) => entry.status !== 'cancelled')
  const side1 = active.filter((entry) => entry.side === 1)
  const side2 = active.filter((entry) => entry.side === 2)

  const realSide1Total = sumStake(side1)
  const realSide2Total = sumStake(side2)
  
  // Add fake balance to totals for display (visual only)
  const fakeSide1 = Number(bet.fake_balance_side1) || 0
  const fakeSide2 = Number(bet.fake_balance_side2) || 0

  return {
    side1,
    side2,
    side1Total: realSide1Total + fakeSide1,
    side2Total: realSide2Total + fakeSide2,
    side1Filled: sumFilled(side1),
    side2Filled: sumFilled(side2),
    realSide1Total,
    realSide2Total,
    totalPool: sumStake(active) + fakeSide1 + fakeSide2,
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
    ...groupEntries(entries, bet),
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

  // Update fake balances for active bets
  const updatedBets = await Promise.all(
    bets.map(async (bet) => {
      if (bet.status === 'open') {
        return await updateFakeBalance(bet.id)
      }
      return bet
    })
  )

  return updatedBets.map((bet) => attachGrouped(bet, entries))
}

async function updateFakeBalance(betId) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data: bet, error } = await supabase
    .from('bets')
    .select('*')
    .eq('id', betId)
    .single()

  if (error || !bet) return bet

  const now = new Date()
  const lastUpdated = bet.fake_balance_last_updated ? new Date(bet.fake_balance_last_updated) : bet.created_at
  const minutesSinceUpdate = (now - lastUpdated) / (1000 * 60)

  if (minutesSinceUpdate < 1) return bet // Only update every minute

  const target = Number(bet.fake_balance_target) || 0
  const currentSide1 = Number(bet.fake_balance_side1) || 0
  const currentSide2 = Number(bet.fake_balance_side2) || 0
  const currentTotal = currentSide1 + currentSide2

  if (currentTotal >= target) return bet // Already reached target

  // Add $5 to each side per minute
  const increment = Math.floor(minutesSinceUpdate) * 5
  const newSide1 = Math.min(currentSide1 + increment, target / 2)
  const newSide2 = Math.min(currentSide2 + increment, target / 2)

  const { error: updateError } = await supabase
    .from('bets')
    .update({
      fake_balance_side1: newSide1,
      fake_balance_side2: newSide2,
      fake_balance_last_updated: now.toISOString(),
    })
    .eq('id', betId)

  if (updateError) return bet

  return { ...bet, fake_balance_side1: newSide1, fake_balance_side2: newSide2 }
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

  // Check if user has more than 2 active bets
  const { data: activeBets, error: countError } = await supabase
    .from('bets')
    .select('id')
    .eq('created_by_id', payload.created_by_id)
    .eq('status', 'open')

  if (countError) throw countError
  if (activeBets && activeBets.length >= 2) {
    throw new Error('You can only have 2 active bets at a time. Wait for some to finish or be resolved.')
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
      fake_balance_target: Math.floor(Math.random() * (3000 - 250 + 1)) + 250, // Random target between 250-3000
      fake_balance_last_updated: new Date().toISOString(),
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

export async function sellBetEntry({ entryId, userId }) {
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
  if (entry.is_sell_position) throw new Error('Already a sell position.')

  const bet = await fetchBet(entry.bet_id)
  const eventDate = new Date(bet.event_date)
  const now = new Date()
  const minutesUntilClose = (eventDate - now) / (1000 * 60)

  if (minutesUntilClose < 15) {
    throw new Error('Cannot sell within 15 minutes of event closing.')
  }

  const filledAmount = Number(entry.filled_stake) > 0 ? Number(entry.filled_stake) : estimateFill(entry, bet.entries)
  const sellPrice = filledAmount * 0.9 // Sell at 90% of current value

  const { error: updateError } = await supabase
    .from('bet_entries')
    .update({
      is_sell_position: true,
      sold_at: new Date().toISOString(),
      sell_price: sellPrice,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', entryId)

  if (updateError) throw updateError

  await adjustBalance(userId, sellPrice)
  return { ...entry, sell_price: sellPrice }
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

    // Automatic refund for unfilled orders after closing time
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
