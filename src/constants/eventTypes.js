export const EVENT_TYPES = [
  'Soccer',
  'Tennis',
  'Basketball',
  'Concert',
  'Esports',
  'Politics',
  'Other',
]

/** Winners receive stake × this multiplier (fee = stake × (2 - WIN_MULTIPLIER)). */
export const WIN_MULTIPLIER = 1.8
export const PLATFORM_FEE_PERCENT = (2 - WIN_MULTIPLIER) * 100
export const STARTING_BALANCE = 50
export const NAME_CHANGE_COOLDOWN_DAYS = 30
export const MAX_EVENT_DAYS_AHEAD = 7
