import React, { useMemo, useState } from 'react'
import { getSelectableDates } from '../utils/profileUtils'

function formatDayLabel(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

export default function EventDateTimePicker({ value, onChange }) {
  const dates = useMemo(() => getSelectableDates(), [])
  const [pickedDate, setPickedDate] = useState(() => {
    if (!value) return null
    const d = new Date(value)
    return toDateKey(d)
  })
  const [hour, setHour] = useState(() => {
    if (!value) return '18'
    return String(new Date(value).getHours()).padStart(2, '0')
  })
  const [minute, setMinute] = useState(() => {
    if (!value) return '00'
    return String(new Date(value).getMinutes()).padStart(2, '0')
  })

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = ['00', '15', '30', '45']

  const applyDateTime = (dateKey, h, m) => {
    if (!dateKey) return
    const combined = new Date(`${dateKey}T${h}:${m}:00`)
    onChange(combined.toISOString())
  }

  const pickDate = (date) => {
    const key = toDateKey(date)
    setPickedDate(key)
    applyDateTime(key, hour, minute)
  }

  const pickTime = (h, m) => {
    setHour(h)
    setMinute(m)
    if (pickedDate) applyDateTime(pickedDate, h, m)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase text-gray-400 mb-2">Pick date (today → 7 days)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dates.map((date) => {
            const key = toDateKey(date)
            const active = pickedDate === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickDate(date)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                {formatDayLabel(date)}
              </button>
            )
          })}
        </div>
      </div>

      {pickedDate && (
        <div>
          <p className="text-xs uppercase text-gray-400 mb-2">Event start time</p>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={hour}
              onChange={(e) => pickTime(e.target.value, minute)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {hours.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-gray-400">:</span>
            <select
              value={minute}
              onChange={(e) => pickTime(hour, e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {minutes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            No new bets after this time. Bets close when the event starts.
          </p>
        </div>
      )}
    </div>
  )
}
