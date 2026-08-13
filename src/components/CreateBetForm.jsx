import React, { useState } from 'react'
import { createBet, joinBet } from '../services/betsService'

const EVENT_TYPES = [
  'Soccer',
  'Tennis',
  'Basketball',
  'Concert',
  'Esports',
  'Politics',
  'Other',
]

export default function CreateBetForm({ userId, userLabel, onCreated }) {
  const [form, setForm] = useState({
    eventType: 'Tennis',
    title: '',
    eventDate: '',
    side1Label: '',
    side2Label: '',
    rules: '',
    stake: '5',
    side: '1',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    setError(null)
    const stake = Number(form.stake)
    const side = Number(form.side)

    if (!form.title.trim()) {
      setError('Describe the event.')
      return
    }
    if (!form.eventDate) {
      setError('Pick when it happens.')
      return
    }
    if (!form.side1Label.trim() || !form.side2Label.trim()) {
      setError('Label both sides.')
      return
    }
    if (!form.rules.trim()) {
      setError('Write the rules (win / lose / scratch).')
      return
    }
    if (!Number.isFinite(stake) || stake <= 0) {
      setError('Enter a valid virtual stake.')
      return
    }

    setLoading(true)
    try {
      const bet = await createBet({
        title: form.title.trim(),
        event_type: form.eventType,
        event_date: new Date(form.eventDate).toISOString(),
        side1_label: form.side1Label.trim(),
        side2_label: form.side2Label.trim(),
        rules: form.rules.trim(),
        created_by_id: userId,
        created_by_label: userLabel,
      })

      await joinBet({
        betId: bet.id,
        userId,
        userLabel,
        side,
        stake,
      })

      onCreated?.(bet.id)
      setForm({
        eventType: form.eventType,
        title: '',
        eventDate: '',
        side1Label: '',
        side2Label: '',
        rules: '',
        stake: '5',
        side: '1',
      })
    } catch (err) {
      setError(err.message ?? 'Could not create bet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border-2 border-gray-900 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Custom bet</h2>
      <p className="text-sm text-gray-500 mb-5">
        Virtual money only — share the link so anyone can join either side.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs uppercase text-gray-400 mb-1.5">Type</label>
          <select
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase text-gray-400 mb-1.5">When</label>
          <input
            type="datetime-local"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase text-gray-400 mb-1.5">What is it?</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="US Open — player steps, concert outcome, etc."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase text-gray-400 mb-1.5">Side 1 wins if</label>
          <input
            value={form.side1Label}
            onChange={(e) => setForm({ ...form, side1Label: e.target.value })}
            placeholder="Over 25,000 steps"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase text-gray-400 mb-1.5">Side 2 wins if</label>
          <input
            value={form.side2Label}
            onChange={(e) => setForm({ ...form, side2Label: e.target.value })}
            placeholder="Under 25,000 steps"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase text-gray-400 mb-1.5">Rules</label>
          <textarea
            value={form.rules}
            onChange={(e) => setForm({ ...form, rules: e.target.value })}
            rows={3}
            placeholder="Side 1 wins if over. Side 2 wins if under. Scratch = nobody wins, virtual funds returned."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
          />
        </div>
        <div>
          <label className="block text-xs uppercase text-gray-400 mb-1.5">Your side</label>
          <select
            value={form.side}
            onChange={(e) => setForm({ ...form, side: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="1">Side 1</option>
            <option value="2">Side 2</option>
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase text-gray-400 mb-1.5">Virtual stake ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.stake}
            onChange={(e) => setForm({ ...form, stake: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={submit}
        className="mt-5 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create bet & get share link'}
      </button>
    </section>
  )
}
