import React, { useEffect, useState } from 'react'
import { addBetComment, fetchBetComments } from '../services/commentsService'

export default function BetComments({ betId, userId, authenticated, userLabel, myEntries, bet }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadComments = async () => {
    try {
      const data = await fetchBetComments(betId)
      setComments(data)
    } catch (err) {
      console.error('Failed to load comments:', err)
    }
  }

  useEffect(() => {
    loadComments()
    const interval = setInterval(loadComments, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [betId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!authenticated) {
      setError('Login to comment.')
      return
    }
    if (!newComment.trim()) return

    setLoading(true)
    setError(null)
    try {
      // Find user's position in this bet
      const myEntry = myEntries?.find(e => e.user_id === userId)
      const side = myEntry?.side || null
      const stake = myEntry?.stake || 0

      await addBetComment({
        betId,
        userId,
        userLabel,
        content: newComment,
        side,
        stake,
      })
      setNewComment('')
      await loadComments()
    } catch (err) {
      setError(err.message ?? 'Could not post comment.')
    } finally {
      setLoading(false)
    }
  }

  const getSideLabel = (side, bet) => {
    if (side === 1) return bet.side1_label
    if (side === 2) return bet.side2_label
    return null
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Comments</h2>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => {
            const sideLabel = getSideLabel(comment.side, bet)
            
            return (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                  {comment.user_label.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{comment.user_label}</span>
                    {sideLabel && comment.stake > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        {sideLabel} · ${Number(comment.stake).toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100">
        {error && (
          <p className="text-sm text-red-600 mb-2">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={authenticated ? 'Add a comment...' : 'Login to comment...'}
            disabled={!authenticated || loading}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-50"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!authenticated || loading || !newComment.trim()}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">One message per minute</p>
      </form>
    </div>
  )
}
