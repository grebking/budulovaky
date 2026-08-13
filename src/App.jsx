import React, { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useSolanaWallets } from '@privy-io/react-auth/solana'
import AccountPage from './components/AccountPage'
import AdminPage from './components/AdminPage'
import BetPage from './components/BetPage'
import HomePage from './components/HomePage'
import SetupBanner from './components/SetupBanner'
import { isAdminUser } from './config'
import { formatMoney } from './services/betsService'
import { ensureProfile, fetchProfileByUserId } from './services/profileService'
import { accountPath } from './utils/profileUtils'
import { getUserId, getUserLabel } from './utils/userLabel'

function getSolanaWalletAccounts(user) {
  return (
    user?.linkedAccounts?.filter(
      (account) =>
        (account.type === 'wallet' || account.type === 'smart_wallet') &&
        account.chainType === 'solana',
    ) ?? []
  )
}

function AccountRouteWrapper({ viewerUserId, profile }) {
  const { username } = useParams()
  const isOwner = profile?.username === username?.toLowerCase()
  return (
    <AccountPage
      username={username}
      viewerUserId={viewerUserId}
      isOwner={isOwner}
    />
  )
}

function App() {
  const { login, logout, authenticated, ready, user } = usePrivy()
  const { wallets } = useSolanaWallets()
  const [profile, setProfile] = useState(null)

  const solanaAddress = useMemo(() => {
    if (wallets[0]?.address) return wallets[0].address
    const linked = getSolanaWalletAccounts(user)
    return (
      linked[0]?.address ??
      (user?.wallet?.chainType === 'solana' ? user?.wallet?.address : null)
    )
  }, [user, wallets])

  const userId = getUserId(user, solanaAddress)
  const userLabel = getUserLabel(user, solanaAddress)
  const isAdmin = authenticated && isAdminUser(user)

  useEffect(() => {
    if (!authenticated || !userId) {
      setProfile(null)
      return
    }

    let active = true
    ensureProfile(userId, userLabel)
      .then((p) => {
        if (active) setProfile(p)
      })
      .catch(console.error)

    return () => {
      active = false
    }
  }, [authenticated, userId, userLabel])

  const refreshProfile = async () => {
    if (!userId) return
    const p = await fetchProfileByUserId(userId)
    setProfile(p)
  }

  const handleLogin = async () => {
    try {
      await login()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="h-full bg-white flex flex-col min-h-0">
      <header className="flex items-center justify-between gap-4 p-6 shrink-0 border-b border-gray-100">
        <Link to="/" className="block">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Custom Bet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Virtual bets on anything</p>
        </Link>

        <div className="flex items-center gap-3 shrink-0">
          {authenticated && profile && (
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
              {formatMoney(profile.balance)}
            </span>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Admin
            </Link>
          )}
          {authenticated && profile ? (
            <>
              <Link
                to={accountPath(profile.username)}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700"
              >
                Portfolio
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={!ready}
                className="px-5 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              disabled={!ready}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {!ready ? 'Loading...' : 'Login'}
            </button>
          )}
        </div>
      </header>

      <SetupBanner />

      <Routes>
        <Route
          path="/bet/:betId"
          element={
            <BetPage
              userId={userId}
              authenticated={authenticated}
              onLogin={handleLogin}
              onBalanceChange={refreshProfile}
            />
          }
        />
        <Route path="/admin" element={<AdminPage isAdmin={isAdmin} />} />
        <Route
          path="/account/@:username"
          element={
            <AccountRouteWrapper viewerUserId={userId} profile={profile} />
          }
        />
        <Route
          path="/"
          element={
            authenticated ? (
              <HomePage userId={userId} />
            ) : (
              <div className="flex-1 flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                  <p className="text-gray-500 mb-4">
                    Login to make or find bets. Shared bet links work without login.
                  </p>
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={!ready}
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Login
                  </button>
                </div>
              </div>
            )
          }
        />
      </Routes>
    </div>
  )
}

export default App
