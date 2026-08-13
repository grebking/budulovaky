const STORAGE_KEY = 'laliga-guess-bets'

export function loadBets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveBets(bets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bets))
}

export function createBetId() {
  return `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
