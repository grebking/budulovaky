import { getSupabase } from '../lib/supabase'

export async function fetchBetComments(betId) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  const { data, error } = await supabase
    .from('bet_comments')
    .select('*')
    .eq('bet_id', betId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function addBetComment({ betId, userId, userLabel, content, side, stake }) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Database not configured')

  // Check rate limit (1 message per minute)
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const { data: recentComments, error: rateLimitError } = await supabase
    .from('bet_comments')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo)
    .limit(1)

  if (rateLimitError) throw rateLimitError
  if (recentComments && recentComments.length > 0) {
    throw new Error('You can only send one message per minute. Please wait.')
  }

  const { data, error } = await supabase
    .from('bet_comments')
    .insert({
      bet_id: betId,
      user_id: userId,
      user_label: userLabel,
      content: content.trim(),
      side,
      stake,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
