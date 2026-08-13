import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useFundWallet, useSolanaWallets } from '@privy-io/react-auth/solana'

function shortenAddress(address) {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

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
  const { ready: solanaReady, wallets, createWallet, exportWallet } = useSolanaWallets()
  const { fundWallet } = useFundWallet()
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [walletActionLoading, setWalletActionLoading] = useState(false)

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
      setShowWalletMenu(false)
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleDeposit = async () => {
    if (!authenticated) {
      await handleLogin()
      return
    }

    setWalletActionLoading(true)
    try {
      const address = await ensureSolanaWallet()
      await fundWallet(address, {
        defaultFundingMethod: 'manual',
        uiConfig: {
          receiveFundsTitle: 'Deposit to your wallet',
          receiveFundsSubtitle:
            'Scan the QR code or copy your Solana address to receive funds.',
        },
      })
    } catch (error) {
      console.error('Deposit flow failed:', error)
    } finally {
      setWalletActionLoading(false)
      setShowWalletMenu(false)
    }
  }

  const handleFundWithOptions = async () => {
    if (!authenticated) return

    setWalletActionLoading(true)
    try {
      const address = await ensureSolanaWallet()
      await fundWallet(address)
    } catch (error) {
      console.error('Funding flow failed:', error)
    } finally {
      setWalletActionLoading(false)
      setShowWalletMenu(false)
    }
  }

  const handleExportKey = async () => {
    if (!authenticated) return

    setWalletActionLoading(true)
    try {
      const address = await ensureSolanaWallet()
      await exportWallet({ address })
    } catch (error) {
      console.error('Export wallet failed:', error)
    } finally {
      setWalletActionLoading(false)
      setShowWalletMenu(false)
    }
  }

  const topBar = createPortal(
    <header className="fixed top-0 left-0 right-0 z-[99999] px-4 sm:px-6 py-4 pointer-events-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between glass-nav rounded-2xl px-4 sm:px-6 py-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-sm font-bold shadow-lg">
            P
          </div>
          <span className="text-white/90 font-medium tracking-wide hidden sm:inline">
            Privy Game
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {authenticated && solanaAddress && (
            <span className="hidden md:inline text-xs text-white/50 font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              {shortenAddress(solanaAddress)}
            </span>
          )}

          {authenticated && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowWalletMenu((open) => !open)}
                disabled={!ready || walletActionLoading}
                className="btn-primary"
              >
                {walletActionLoading ? 'Opening...' : 'Deposit'}
              </button>

              {showWalletMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[99998]"
                    onClick={() => setShowWalletMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 glass-card rounded-xl shadow-2xl overflow-hidden z-[99999]">
                    <div className="p-3 border-b border-white/10">
                      <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
                        Wallet
                      </p>
                      {solanaAddress ? (
                        <p className="text-xs font-mono text-white/80 break-all">
                          {solanaAddress}
                        </p>
                      ) : (
                        <p className="text-xs text-white/50">Creating Solana wallet...</p>
                      )}
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={handleDeposit}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm text-white/90 transition-colors"
                      >
                        Receive / Deposit
                      </button>
                      <button
                        type="button"
                        onClick={handleFundWithOptions}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm text-white/90 transition-colors"
                      >
                        Buy crypto
                      </button>
                      <button
                        type="button"
                        onClick={handleExportKey}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm text-white/90 transition-colors"
                      >
                        Export private key
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={authenticated ? handleLogout : handleLogin}
            disabled={!ready}
            className="btn-secondary"
          >
            {!ready ? 'Loading...' : authenticated ? 'Logout' : 'Login'}
          </button>
        </div>
      </div>
    </header>,
    document.body,
  )

  return (
    <>
      {topBar}

      <main className="min-h-screen hero-glow flex flex-col items-center justify-center relative px-6 pt-24 pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-1.5 mb-8 text-sm text-white/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Solana-powered gaming platform
          </div>

          <h1 className="text-5xl sm:text-7xl font-light text-white tracking-tight mb-6">
            Coming{' '}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Soon
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 font-light mb-10 max-w-xl mx-auto leading-relaxed">
            The future of decentralized gaming. Log in, get your Solana wallet, and deposit in one
            click.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!authenticated ? (
              <button type="button" onClick={handleLogin} disabled={!ready} className="btn-primary text-lg px-8 py-3">
                Get started
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDeposit}
                disabled={!ready || walletActionLoading}
                className="btn-primary text-lg px-8 py-3"
              >
                {walletActionLoading ? 'Opening wallet...' : 'Deposit now'}
              </button>
            )}
          </div>

          {authenticated && (
            <div className="mt-12 glass-card rounded-2xl p-6 text-left max-w-md mx-auto">
              <h2 className="text-sm font-medium text-white/70 mb-3">Your account</h2>
              {solanaAddress ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Network</span>
                    <span className="text-violet-300">Solana</span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-white/40 shrink-0">Address</span>
                    <span className="font-mono text-white/70 text-xs break-all text-right">
                      {solanaAddress}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/40">Setting up your Solana wallet...</p>
              )}
            </div>
          )}
        </div>

        <div className="relative mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { title: 'Easy login', desc: 'Email, social, or wallet — powered by Privy' },
            { title: 'Solana wallet', desc: 'Embedded wallet created automatically on signup' },
            { title: 'Secure deposits', desc: 'Privy handles addresses, keys, and funding' },
          ].map((item) => (
            <div key={item.title} className="glass-card rounded-xl p-5 text-left">
              <h3 className="text-white/90 font-medium mb-1">{item.title}</h3>
              <p className="text-sm text-white/40">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}

export default App
