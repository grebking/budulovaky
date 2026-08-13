import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePrivy } from '@privy-io/react-auth'

function getWalletLabel(account) {
  if (account.type === 'smart_wallet') return 'Smart Wallet'
  if (account.walletClientType === 'privy') return 'Embedded Wallet'
  if (account.walletClientType) return account.walletClientType
  return 'Wallet'
}

function getChainLabel(chainType) {
  if (chainType === 'solana') return 'Solana'
  if (chainType === 'ethereum') return 'Ethereum'
  return chainType || 'Unknown'
}

function App() {
  const { login, logout, authenticated, ready, user } = usePrivy()
  const [showDeposit, setShowDeposit] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(null)

  const walletAddresses = useMemo(() => {
    const byAddress = new Map()

    user?.linkedAccounts
      ?.filter((account) => account.type === 'wallet' || account.type === 'smart_wallet')
      .forEach((account) => {
        byAddress.set(account.address, {
          address: account.address,
          label: getWalletLabel(account),
          chain: getChainLabel(account.chainType),
        })
      })

    if (user?.wallet?.address && !byAddress.has(user.wallet.address)) {
      byAddress.set(user.wallet.address, {
        address: user.wallet.address,
        label: 'Wallet',
        chain: getChainLabel(user.wallet.chainType),
      })
    }

    return Array.from(byAddress.values())
  }, [user])

  const handleLogin = async () => {
    try {
      await login()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleLogout = async () => {
    try {
      setShowDeposit(false)
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleDepositClick = async () => {
    if (!authenticated) {
      await handleLogin()
      return
    }
    setShowDeposit(true)
  }

  const handleCopyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      window.setTimeout(() => setCopiedAddress(null), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const topBar = createPortal(
    <div className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-end gap-3 px-6 py-6 pointer-events-none">
      {authenticated && (
        <button
          type="button"
          onClick={handleDepositClick}
          disabled={!ready}
          className="pointer-events-auto px-8 py-3 bg-gray-900 text-white text-lg font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 shadow-lg"
        >
          Deposit
        </button>
      )}

      <button
        type="button"
        onClick={authenticated ? handleLogout : handleLogin}
        disabled={!ready}
        className="pointer-events-auto px-6 py-2 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 shadow-lg"
      >
        {!ready ? 'Loading...' : authenticated ? 'Logout' : 'Login'}
      </button>
    </div>,
    document.body,
  )

  return (
    <>
      {topBar}

      <div className="min-h-screen bg-white flex items-center justify-center relative">
        <div className="text-center px-6">
          <h1 className="text-6xl font-light text-gray-800 tracking-wide mb-4">
            Coming Soon
          </h1>
          <p className="text-xl text-gray-600 font-light">
            The Future of Decentralized Gaming
          </p>
        </div>
      </div>

      {showDeposit && authenticated && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100000]"
          onClick={() => setShowDeposit(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-light text-gray-800">Deposit</h2>
              <button
                type="button"
                onClick={() => setShowDeposit(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Send crypto to any of your wallet addresses below.
            </p>

            {!ready ? (
              <p className="text-sm text-gray-500">Loading wallets...</p>
            ) : walletAddresses.length === 0 ? (
              <p className="text-sm text-gray-500">
                No wallet addresses found on this account yet.
              </p>
            ) : (
              <div className="space-y-3">
                {walletAddresses.map((wallet) => (
                  <div
                    key={wallet.address}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{wallet.label}</p>
                        <p className="text-xs text-gray-500">{wallet.chain}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(wallet.address)}
                        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        {copiedAddress === wallet.address ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 break-all font-mono">
                      {wallet.address}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default App
