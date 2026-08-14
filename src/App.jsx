import React, { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useSolanaWallets } from '@privy-io/react-auth/solana'
import AccountPage from './components/AccountPage'
import AdminPage from './components/AdminPage'
import BetPage from './components/BetPage'
import CategoryPage from './components/CategoryPage'
import HomePage from './components/HomePage'
import SetupBanner from './components/SetupBanner'
import { isAdminUser } from './config'
import { WIN_MULTIPLIER, PLATFORM_FEE_PERCENT } from './constants/eventTypes'
import { formatMoney } from './services/betsService'
import { ensureProfile, fetchProfileByUserId } from './services/profileService'
import { accountPath } from './utils/profileUtils'
import { getUserId, getUserLabel } from './utils/userLabel'
import logo from '../logo.png'

function getSolanaWalletAccounts(user) {
  return (
    user?.linkedAccounts?.filter(
      (account) =>
        (account.type === 'wallet' || account.type === 'smart_wallet') &&
        account.chainType === 'solana',
    ) ?? []
  )
}

function AccountRouteWrapper({ viewerUserId }) {
  const { username } = useParams()
  return <AccountPage username={username} viewerUserId={viewerUserId} />
}

function App() {
  const { login, logout, authenticated, ready, user } = usePrivy()
  const { wallets } = useSolanaWallets()
  const [profile, setProfile] = useState(null)
  const [showHowItWorks, setShowHowItWorks] = useState(false)

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
      <header className="flex items-center justify-between gap-4 p-4 shrink-0 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-3">
          <img src="/newlogo.png" alt="TennisZone" className="h-10 w-auto" />
        </Link>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            How it works
          </button>
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

      {/* Category Navigation */}
      <nav className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 overflow-x-auto">
        <Link
          to="/category/Soccer"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg whitespace-nowrap"
        >
          Soccer
        </Link>
        <Link
          to="/category/Tennis"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg whitespace-nowrap"
        >
          Tennis
        </Link>
        <Link
          to="/category/Basketball"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg whitespace-nowrap"
        >
          Basketball
        </Link>
        <Link
          to="/category/Concert"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg whitespace-nowrap"
        >
          Concert
        </Link>
        <Link
          to="/category/Esports"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg whitespace-nowrap"
        >
          Esports
        </Link>
        <Link
          to="/category/Politics"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg whitespace-nowrap"
        >
          Politics
        </Link>
        <Link
          to="/category/Other"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg whitespace-nowrap"
        >
          Other
        </Link>
      </nav>

      {/* How it works modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">How it works</h2>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                <strong className="text-gray-900">Join or create bets</strong> on anything - sports, politics, concerts, and more.
              </p>
              <p>
                <strong className="text-gray-900">Place your prediction</strong> by choosing a side and staking virtual money.
              </p>
              <p>
                <strong className="text-gray-900">Win 2x your stake</strong> minus platform fees ({PLATFORM_FEE_PERCENT}%) when your prediction is correct.
              </p>
              <p>
                <strong className="text-gray-900">Sell positions</strong> anytime up to 15 minutes before the event closes.
              </p>
              <p>
                <strong className="text-gray-900">Unfilled orders</strong> are automatically refunded after the event closes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className="mt-6 w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}

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
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/admin" element={<AdminPage isAdmin={isAdmin} />} />
        <Route
          path="/portfolio/@:username"
          element={
            <AccountRouteWrapper viewerUserId={userId} />
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
