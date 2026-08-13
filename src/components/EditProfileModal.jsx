import React from 'react'
import { createPortal } from 'react-dom'
import { canChangeUsername, daysUntilNameChange, sanitizeUsername } from '../utils/profileUtils'

export default function EditProfileModal({
  open,
  onClose,
  editUsername,
  setEditUsername,
  editBio,
  setEditBio,
  avatarUrl,
  setAvatarUrl,
  onAvatarFile,
  profile,
  onSave,
  saveMsg,
  saveError,
  saving,
}) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}

        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl font-semibold text-white">
              {editUsername.slice(0, 1).toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Profile picture</label>
            <input type="file" accept="image/*" onChange={onAvatarFile} className="text-sm w-full" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Display name</label>
          <input
            value={editUsername}
            onChange={(e) => setEditUsername(sanitizeUsername(e.target.value))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <p className="text-xs text-gray-400 mt-1">
            {canChangeUsername(profile)
              ? 'You can change your name once per month.'
              : `Next change in ${daysUntilNameChange(profile)} days.`}
          </p>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Bio</label>
          <textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            rows={4}
            maxLength={280}
            placeholder="Tell others about yourself…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{editBio.length}/280</p>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Or paste image URL</label>
          <input
            value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        {saveMsg && <p className="text-sm text-green-700 text-center">{saveMsg}</p>}
      </div>
    </div>,
    document.body,
  )
}
