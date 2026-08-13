import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import {
  useFundWallet,
  useSolanaFundingPlugin,
  useSolanaWallets,
} from '@privy-io/react-auth/solana'

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
  useSolanaFundingPlugin()

  const { login, logout, authenticated, ready, user } = usePrivy()
  const { ready: solanaReady, wallets, createWallet } = useSolanaWallets()
  const { fundWallet } = useFundWallet()
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositError, setDepositError] = useState(null)

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

  const openPrivyDeposit = useCallback(
    async (address) => {
      const fundingConfig = {
        defaultFundingMethod: 'manual',
      }

      const connectedWallet = wallets.find((wallet) => wallet.address === address)

      if (connectedWallet?.fund) {
        await connectedWallet.fund(fundingConfig)
        return
      }

      await fundWallet(address, fundingConfig)
    },
    [fundWallet, wallets],
  )

  const handleDeposit = async () => {
    setDepositError(null)
    setDepositLoading(true)

    try {
      if (!solanaReady) {
        throw new Error('Wallet is still loading. Please wait a moment and try again.')
      }

      let address = solanaAddress

      if (!address) {
        const wallet = await createWallet()
        address = wallet.address
      }

      if (!address) {
        throw new Error('No Solana wallet found. Try logging out and back in.')
      }

      await openPrivyDeposit(address)
    } catch (error) {
      const message =
        error?.message ||
        'Could not open deposit. Check that funding is enabled in your Privy dashboard.'
      setDepositError(message)
      console.error('Deposit flow failed:', error)
    } finally {
      setDepositLoading(false)
    }
  }

  return (
    <div className="h-full bg-white flex flex-col">
      <header className="flex items-center justify-end gap-3 p-6 shrink-0">
        {authenticated ? (
          <>
            <button
              type="button"
              onClick={handleDeposit}
              disabled={!ready || !solanaReady || depositLoading}
              className="px-8 py-3 bg-gray-900 text-white text-lg font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {depositLoading
                ? 'Opening...'
                : !solanaReady
                  ? 'Loading wallet...'
                  : 'Deposit'}
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
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="text-center max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-4">Coming soon</p>

          <h1 className="text-4xl sm:text-6xl font-light text-gray-900 tracking-tight mb-5">
            Wager in random games
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 font-light leading-relaxed">
            Deposit SOL, get matched into surprise mini-games, and wager against other players.
            Every round is a new game — you never know what&apos;s next.
          </p>

          {depositError && (
            <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {depositError}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
