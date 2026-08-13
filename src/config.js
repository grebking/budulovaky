export const ADMIN_EMAILS = (
  import.meta.env.VITE_ADMIN_EMAILS ?? 'cxmrkt@gmail.com'
)
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export function isAdminUser(user) {
  if (!user) return false
  const emails = [
    user?.email?.address,
    user?.google?.email,
  ]
    .filter(Boolean)
    .map((email) => email.toLowerCase())

  return emails.some((email) => ADMIN_EMAILS.includes(email))
}

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://lxtfjhypewwnjtccjbsl.supabase.co'

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dGZqaHlwZXd3bmp0Y2NqYnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDUyMTcsImV4cCI6MjEwMjIyMTIxN30.RW5ltc8lhnq3wzYKt0g_x2w_pmqmejjYe2uGC-sf-FM'

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}
