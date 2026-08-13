import React, { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useCreateWallet } from '@privy-io/react-auth/solana'

function App() {
  const { login, logout, authenticated, user } = usePrivy()
  const { createWallet } = useCreateWallet()
  const [isCreatingWallet, setIsCreatingWallet] = useState(false)

  const handleLogin = async () => {
    try {
      await login()
      // Create Solana wallet after successful login
      await createSolanaWallet()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const createSolanaWallet = async () => {
    try {
      setIsCreatingWallet(true)
      await createWallet({ createAdditional: false })
    } catch (error) {
      console.error('Wallet creation failed:', error)
    } finally {
      setIsCreatingWallet(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const getSolanaAddress = () => {
    if (!user?.wallets) return null
    const solanaWallet = user.wallets.find(wallet => wallet.chainType === 'solana')
    return solanaWallet?.address
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative">
      <button 
        onClick={authenticated ? handleLogout : handleLogin}
        className="absolute top-6 right-6 px-6 py-2 bg-gray-900 text-white font-light rounded hover:bg-gray-700 transition-colors"
      >
        {authenticated ? 'Logout' : 'Login'}
      </button>
      <div className="text-center">
        <h1 className="text-6xl font-light text-gray-800 tracking-wide mb-4">
          Coming Soon
        </h1>
        <p className="text-xl text-gray-600 font-light mb-8">
          The Future of Decentralized Gaming
        </p>
        {authenticated && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Your Solana Wallet:</p>
            {isCreatingWallet ? (
              <p className="text-sm text-gray-600">Creating wallet...</p>
            ) : (
              <p className="text-sm font-mono text-gray-800 break-all">
                {getSolanaAddress() || 'No wallet found'}
              </p>
            )}
            {!getSolanaAddress() && !isCreatingWallet && (
              <button 
                onClick={createSolanaWallet}
                className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Create Solana Wallet
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
