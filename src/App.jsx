import React, { useEffect, useMemo, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useSolanaWallets } from '@privy-io/react-auth/solana'

function getSolanaWalletAccounts(user) {
  return (
    user?.linkedAccounts?.filter(
      (account) =>
        (account.type === 'wallet' || account.type === 'smart_wallet') &&
        account.chainType === 'solana',
    ) ?? []
  )
}

function DepositModal({ address, onClose }) {
  const [copied, setCopied] = useState(false)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-medium text-gray-900">Deposit SOL</h2>
            <p className="mt-1 text-sm text-gray-500">
              Send SOL on Solana mainnet to your embedded wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <img
            src={qrUrl}
            alt="Wallet address QR code"
            width={200}
            height={200}
            className="rounded-lg border border-gray-200"
          />
        </div>

        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Your wallet address</p>
        <p className="text-sm text-gray-900 break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          {address}
        </p>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy address'}
        </button>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Funds usually arrive in under a minute. Only send SOL on Solana mainnet.
        </p>
      </div>
    </div>
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
    <div className="h-full bg-white flex flex-col">
      {depositAddress && (
        <DepositModal
          address={depositAddress}
          onClose={() => setDepositAddress(null)}
        />
      )}

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
