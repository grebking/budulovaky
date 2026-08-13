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

function LandingPage({ ready, onLogin }) {
  return (
    <main className="h-full flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="text-center max-w-2xl">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-4">Coming soon</p>

        <h1 className="text-4xl sm:text-6xl font-light text-gray-900 tracking-tight mb-5">
          Wager in random games
        </h1>

        <p className="text-lg sm:text-xl text-gray-500 font-light mb-8 leading-relaxed">
          Deposit SOL, get matched into surprise mini-games, and wager against other players.
          Every round is a new game — you never know what&apos;s next.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {['Coin flip', 'Dice roll', 'Card draw', 'Spin wheel'].map((game) => (
            <span
              key={game}
              className="px-4 py-1.5 rounded-full text-sm text-gray-600 bg-gray-100 border border-gray-200"
            >
              {game}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onLogin}
          disabled={!ready}
          className="btn-primary text-lg px-8 py-3"
        >
          Login
        </button>

        <p className="mt-8 text-sm text-gray-400">
          Log in to access your dashboard and wallet.
        </p>
      </div>
    </main>
  )
}

function Dashboard({ solanaAddress, walletLoading }) {
  return (
    <main className="h-full flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="text-center max-w-2xl">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-4">Dashboard</p>

        <h1 className="text-4xl sm:text-5xl font-light text-gray-900 tracking-tight mb-5">
          Ready to wager
        </h1>

        <p className="text-lg text-gray-500 font-light mb-8 leading-relaxed">
          Your wallet is set up. Deposit SOL using the button above, then jump into random games
          when they go live.
        </p>

        <div className="glass-card rounded-2xl p-6 text-left max-w-md mx-auto">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Your wallet</h2>
          {walletLoading ? (
            <p className="text-sm text-gray-400">Setting up your Solana wallet...</p>
          ) : solanaAddress ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Network</span>
                <span className="text-gray-800">Solana</span>
              </div>
              <div className="flex justify-between text-sm gap-4">
                <span className="text-gray-400 shrink-0">Address</span>
                <span className="font-mono text-gray-700 text-xs break-all text-right">
                  {solanaAddress}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Wallet is being created...</p>
          )}
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Click Deposit to open your Privy wallet — balance, QR code, and address.
        </p>
      </div>
    </main>
  )
}

function DashboardTopBar({ onDeposit, onLogout, depositLoading, ready }) {
  return createPortal(
    <header className="fixed top-0 left-0 right-0 z-[99999] px-4 sm:px-6 py-4 pointer-events-none">
      <div className="max-w-5xl mx-auto flex items-center justify-end gap-2 sm:gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={onDeposit}
          disabled={!ready || depositLoading}
          className="btn-primary"
        >
          {depositLoading ? 'Opening...' : 'Deposit'}
        </button>

        <button type="button" onClick={onLogout} disabled={!ready} className="btn-secondary">
          Logout
        </button>
      </div>
    </header>,
    document.body,
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
  const walletLoading = authenticated && solanaReady && !hasSolanaWallet

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

  if (!ready) {
    return (
      <main className="h-full flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  if (authenticated) {
    return (
      <>
        <DashboardTopBar
          onDeposit={handleDeposit}
          onLogout={handleLogout}
          depositLoading={depositLoading}
          ready={ready}
        />
        <Dashboard solanaAddress={solanaAddress} walletLoading={walletLoading} />
      </>
    )
  }

  return <LandingPage ready={ready} onLogin={handleLogin} />
}

export default App
