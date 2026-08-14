import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateBetForm from './CreateBetForm'
import FindBetsPanel from './FindBetsPanel'

export default function HomePage({ userId }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('make')
  const [refreshKey, setRefreshKey] = useState(0)

  const onCreated = (betId) => {
    setRefreshKey((k) => k + 1)
    navigate(`/bet/${betId}`)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('make')}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg ${
                mode === 'make' ? 'bg-gray-900 text-white' : 'border border-gray-200'
              }`}
            >
              Make a bet
            </button>
            <button
              type="button"
              onClick={() => setMode('find')}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg ${
                mode === 'find' ? 'bg-gray-900 text-white' : 'border border-gray-200'
              }`}
            >
              Find a bet
            </button>
          </div>
          {mode === 'find' && (
            <button
              type="button"
              onClick={() => setMode('make')}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
            >
              + Create own bet
            </button>
          )}
        </div>

        {mode === 'make' ? (
          <CreateBetForm userId={userId} onCreated={onCreated} />
        ) : (
          <FindBetsPanel refreshKey={refreshKey} />
        )}
      </div>
    </div>
  )
}
