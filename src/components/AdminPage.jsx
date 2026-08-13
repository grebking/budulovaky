import React from 'react'
import { Navigate } from 'react-router-dom'
import AdminBetsPanel from './AdminBetsPanel'
import AdminLayout from './AdminLayout'

export default function AdminPage({ isAdmin }) {
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <AdminLayout>
      <AdminBetsPanel />
    </AdminLayout>
  )
}
