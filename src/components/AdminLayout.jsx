import React from 'react'
import { NavLink } from 'react-router-dom'

export default function AdminLayout({ children }) {
  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-4 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-gray-400 px-2 mb-2">Admin</p>
        <NavLink
          to="/"
          className="px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-white hover:text-gray-900"
        >
          ← Back to site
        </NavLink>
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `px-3 py-2 text-sm rounded-lg font-medium ${
              isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-white'
            }`
          }
        >
          Bets
        </NavLink>
        <NavLink
          to="/admin/archive"
          className={({ isActive }) =>
            `px-3 py-2 text-sm rounded-lg font-medium ${
              isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-white'
            }`
          }
        >
          Archive
        </NavLink>
      </aside>
      <div className="flex-1 overflow-y-auto p-6 min-h-0">{children}</div>
    </div>
  )
}
