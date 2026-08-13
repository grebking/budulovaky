export function getUserId(user, walletAddress) {
  return user?.id ?? walletAddress ?? 'anonymous'
}

export function getUserLabel(user, walletAddress) {
  if (user?.email?.address) return user.email.address
  if (user?.google?.email) return user.google.email
  if (user?.twitter?.username) return `@${user.twitter.username}`
  if (walletAddress) return `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
  return 'Player'
}

export function getUserEmails(user) {
  return [user?.email?.address, user?.google?.email].filter(Boolean)
}
