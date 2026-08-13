import React, { useMemo } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useSolanaWallets } from '@privy-io/react-auth/solana'
import AdminPage from './components/AdminPage'
import BetPage from './components/BetPage'
import HomePage from './components/HomePage'
import SetupBanner from './components/SetupBanner'
import { isAdminUser } from './config'
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

function App() {
  const { login, logout, authenticated, ready, user } = usePrivy()
  const { wallets } = useSolanaWallets()

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
          <p className="text-sm text-gray-500 mt-0.5">Virtual bets — share a link, anyone joins</p>
        </Link>

        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Admin
            </Link>
          )}
          {authenticated ? (
            <>
              <span className="text-sm text-gray-500 hidden sm:inline truncate max-w-[180px]">
                {userLabel}
              </span>
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
              userLabel={userLabel}
              authenticated={authenticated}
              onLogin={handleLogin}
            />
          }
        />
        <Route
          path="/admin"
          element={<AdminPage isAdmin={isAdmin} />}
        />
        <Route
          path="/"
          element={
            authenticated ? (
              <HomePage userId={userId} userLabel={userLabel} />
            ) : (
              <div className="flex-1 flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                  <p className="text-gray-500 mb-4">
                    Login to create bets or join a side. Open a shared bet link to view without
                    logging in.
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
