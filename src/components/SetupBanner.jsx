import React from 'react'
import { isSupabaseConfigured } from '../config'

export default function SetupBanner() {
  if (isSupabaseConfigured()) return null

  return (
    <div className="mx-6 mt-4 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Setup required:</strong> Add Supabase keys so bets are shared for everyone.
      See <code className="text-xs bg-amber-100 px-1 rounded">SETUP.md</code> in the project.
    </div>
  )
}
