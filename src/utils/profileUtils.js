import {
  MAX_EVENT_DAYS_AHEAD,
  NAME_CHANGE_COOLDOWN_DAYS,
} from '../constants/eventTypes'

export function sanitizeUsername(raw) {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24)

  return slug || 'player'
}

export function getMaxEventDate() {
  const max = new Date()
  max.setDate(max.getDate() + MAX_EVENT_DAYS_AHEAD)
  max.setHours(23, 59, 59, 999)
  return max
}

export function getSelectableDates() {
  const dates = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i <= MAX_EVENT_DAYS_AHEAD; i += 1) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

export function isValidNewEventDate(date) {
  const now = new Date()
  const max = getMaxEventDate()
  return date > now && date <= max
}

export function isBetJoinable(bet) {
  if (!bet || bet.status !== 'open') return false
  return new Date(bet.event_date) > new Date()
}

export function canChangeUsername(profile) {
  if (!profile?.name_changed_at) return true
  const last = new Date(profile.name_changed_at)
  const cooldown = new Date(last)
  cooldown.setDate(cooldown.getDate() + NAME_CHANGE_COOLDOWN_DAYS)
  return new Date() >= cooldown
}

export function daysUntilNameChange(profile) {
  if (!profile?.name_changed_at) return 0
  const last = new Date(profile.name_changed_at)
  const cooldown = new Date(last)
  cooldown.setDate(cooldown.getDate() + NAME_CHANGE_COOLDOWN_DAYS)
  const diff = cooldown - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function normalizeUsernameParam(raw) {
  return String(raw ?? '')
    .replace(/^@+/, '')
    .trim()
    .toLowerCase()
}

export function accountPath(username) {
  const clean = normalizeUsernameParam(username)
  return `/portfolio/@${clean}`
}
