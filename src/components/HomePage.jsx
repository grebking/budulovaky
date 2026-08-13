import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateBetForm from './CreateBetForm'
import PublicBetsList from './PublicBetsList'

export default function HomePage({ userId, userLabel }) {
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)

  const onCreated = (betId) => {
    setRefreshKey((k) => k + 1)
    navigate(`/bet/${betId}`)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
      <div className="max-w-5xl mx-auto space-y-8">
        <CreateBetForm userId={userId} userLabel={userLabel} onCreated={onCreated} />
        <PublicBetsList refreshKey={refreshKey} />
      </div>
    </div>
  )
}
