import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { usePrivy } from '@privy-io/react-auth'

function App() {
  const { login, logout, authenticated, ready } = usePrivy()
  const [showDeposit, setShowDeposit] = useState(false)

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

  const topBar = createPortal(
    <div className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-between px-6 py-6 pointer-events-none">
      <button
        type="button"
        onClick={handleDepositClick}
        disabled={!ready}
        className="pointer-events-auto px-8 py-3 bg-gray-900 text-white text-lg font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 shadow-lg"
      >
        Deposit
      </button>

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
            <p className="text-sm text-gray-600">
              Deposit options coming soon.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default App
