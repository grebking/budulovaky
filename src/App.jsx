import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useFundWallet, useSolanaWallets } from '@privy-io/react-auth/solana'

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
  const { ready: solanaReady, wallets, createWallet } = useSolanaWallets()
  const { fundWallet } = useFundWallet()
  const [depositLoading, setDepositLoading] = useState(false)

  const solanaAddress = useMemo(() => {
    if (wallets[0]?.address) return wallets[0].address
    const linked = getSolanaWalletAccounts(user)
    return (
      linked[0]?.address ??
      (user?.wallet?.chainType === 'solana' ? user?.wallet?.address : null)
    )
  }, [user, wallets])

  const hasSolanaWallet = Boolean(solanaAddress)

  useEffect(() => {
    if (!ready || !authenticated || !solanaReady || hasSolanaWallet) return

    createWallet().catch((error) => {
      console.error('Failed to create Solana wallet:', error)
    })
  }, [ready, authenticated, solanaReady, hasSolanaWallet, createWallet])

  const ensureSolanaWallet = useCallback(async () => {
    if (solanaAddress) return solanaAddress

    const wallet = await createWallet()
    return wallet.address
  }, [createWallet, solanaAddress])

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

  const handleDeposit = async () => {
    setDepositLoading(true)
    try {
      const address = await ensureSolanaWallet()
      await fundWallet(address)
    } catch (error) {
      console.error('Deposit flow failed:', error)
    } finally {
      setDepositLoading(false)
    }
  }

  const topBar = createPortal(
    <div className="fixed top-0 right-0 z-[99999] p-6 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        {authenticated ? (
          <>
            <button
              type="button"
              onClick={handleDeposit}
              disabled={!ready || depositLoading}
              className="px-8 py-3 bg-gray-900 text-white text-lg font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {depositLoading ? 'Opening...' : 'Deposit'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={!ready}
              className="px-6 py-2 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            disabled={!ready}
            className="px-6 py-2 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {!ready ? 'Loading...' : 'Login'}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )

  return (
    <>
      {topBar}

      <main className="h-full bg-white flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="text-center max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-4">Coming soon</p>

          <h1 className="text-4xl sm:text-6xl font-light text-gray-900 tracking-tight mb-5">
            Wager in random games
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 font-light leading-relaxed">
            Deposit SOL, get matched into surprise mini-games, and wager against other players.
            Every round is a new game — you never know what&apos;s next.
          </p>
        </div>
      </main>
    </>
  )
}

export default App
