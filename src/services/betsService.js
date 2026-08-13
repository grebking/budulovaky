import { getSupabase } from '../lib/supabase'

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

  return bets.map((bet) => ({
    ...bet,
    entries: entries.filter((entry) => entry.bet_id === bet.id),
    ...groupEntries(entries.filter((entry) => entry.bet_id === bet.id)),
  }))
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

export async function createBet(payload) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data, error } = await supabase.from('bets').insert(payload).select().single()

  if (error) throw error
  return data
}

export async function joinBet({ betId, userId, userLabel, side, stake }) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data, error } = await supabase
    .from('bet_entries')
    .insert({
      bet_id: betId,
      user_id: userId,
      user_label: userLabel,
      side,
      stake,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function resolveBet(betId, winner) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const status = winner === 'scratch' ? 'scratch' : 'resolved'

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
