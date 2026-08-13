import React, { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'

function formatChainName(chainType) {
  if (!chainType) return 'Wallet'
  return chainType.charAt(0).toUpperCase() + chainType.slice(1)
}

function shortenAddress(address) {
  if (!address || address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function App() {
  const { login, logout, authenticated, user, ready } = usePrivy()
  const [showDeposit, setShowDeposit] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(null)

  const wallets = user?.wallets ?? []

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

  const handleCopy = async (address) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative">
      <button
        onClick={authenticated ? handleLogout : handleLogin}
        disabled={!ready}
        className="absolute top-6 right-6 px-6 py-2 bg-gray-900 text-white font-light rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {!ready ? 'Loading...' : authenticated ? 'Logout' : 'Login'}
      </button>

      <div className="text-center px-6">
        <h1 className="text-6xl font-light text-gray-800 tracking-wide mb-4">
          Coming Soon
        </h1>
        <p className="text-xl text-gray-600 font-light mb-8">
          The Future of Decentralized Gaming
        </p>

        {authenticated && (
          <button
            onClick={() => setShowDeposit(true)}
            className="px-8 py-3 bg-gray-900 text-white font-light rounded hover:bg-gray-700 transition-colors"
          >
            Deposit
          </button>
        )}
      </div>

      {showDeposit && authenticated && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDeposit(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-gray-800">Your Wallets</h2>
              <button
                onClick={() => setShowDeposit(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Send funds to any of your wallet addresses below.
            </p>

            {wallets.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                Creating your wallets...
              </div>
            ) : (
              <ul className="space-y-3">
                {wallets.map((wallet) => (
                  <li
                    key={`${wallet.chainType}-${wallet.address}`}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800">
                        {formatChainName(wallet.chainType)}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        {wallet.walletClientType || 'embedded'}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-gray-700 break-all mb-3">
                      {wallet.address}
                    </p>
                    <button
                      onClick={() => handleCopy(wallet.address)}
                      className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      {copiedAddress === wallet.address
                        ? 'Copied!'
                        : `Copy ${shortenAddress(wallet.address)}`}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
