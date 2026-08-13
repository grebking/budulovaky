import React, { useEffect, useMemo, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useSolanaWallets } from '@privy-io/react-auth/solana'
import DepositModal from './components/DepositModal'
import LaLigaGuess from './components/LaLigaGuess'

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
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositError, setDepositError] = useState(null)
  const [depositAddress, setDepositAddress] = useState(null)

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

      setDepositAddress(address)
    } catch (error) {
      const message = error?.message || 'Could not open deposit. Please try again.'
      setDepositError(message)
      console.error('Deposit flow failed:', error)
    } finally {
      setDepositLoading(false)
    }
  }

  return (
    <div className="h-full bg-white flex flex-col min-h-0">
      {depositAddress && (
        <DepositModal address={depositAddress} onClose={() => setDepositAddress(null)} />
      )}

      <header className="flex items-center justify-between gap-4 p-6 shrink-0 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">LaLiga Guess</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Bet on player match ratings — find your opponent at the bar.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {authenticated ? (
            <>
              <button
                type="button"
                onClick={handleDeposit}
                disabled={!ready || !solanaReady || depositLoading}
                className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
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
                className="px-5 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              disabled={!ready}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {!ready ? 'Loading...' : 'Login'}
            </button>
          )}
        </div>
      </header>

      {depositError && (
        <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 shrink-0">
          {depositError}
        </p>
      )}

      {authenticated ? (
        <LaLigaGuess user={user} walletAddress={solanaAddress} />
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-gray-500 text-center max-w-md">
            Login to post a La Liga player bet or take someone&apos;s challenge at the bar.
          </p>
        </div>
      )}
    </div>
  )
}

export default App
