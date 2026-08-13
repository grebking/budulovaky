import React, { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'

function formatChainName(chainType) {
  if (!chainType) return 'Wallet'
  return chainType.charAt(0).toUpperCase() + chainType.slice(1)
}

function shortenAddress(address) {
  if (!address || address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const depositButtonStyle = {
  position: 'fixed',
  top: '20px',
  left: '20px',
  zIndex: 99999,
  padding: '14px 32px',
  fontSize: '18px',
  fontWeight: '700',
  color: '#ffffff',
  backgroundColor: '#16a34a',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
}

const loginButtonStyle = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  zIndex: 99999,
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  backgroundColor: '#ffffff',
  border: '2px solid #111827',
  borderRadius: '10px',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
}

function App() {
  const { login, logout, authenticated, user } = usePrivy()
  const [showDeposit, setShowDeposit] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(null)

  const wallets = user?.wallets ?? []

  useEffect(() => {
    document.getElementById('static-deposit-btn')?.remove()
  }, [])

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
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', position: 'relative' }}>
      <button type="button" onClick={handleDepositClick} style={depositButtonStyle}>
        DEPOSIT
      </button>

      <button
        type="button"
        onClick={authenticated ? handleLogout : handleLogin}
        style={loginButtonStyle}
      >
        {authenticated ? 'Logout' : 'Login'}
      </button>

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 3.75rem)',
              fontWeight: '300',
              color: '#1f2937',
              letterSpacing: '0.05em',
              marginBottom: '16px',
            }}
          >
            Coming Soon
          </h1>
          <p style={{ fontSize: '1.25rem', fontWeight: '300', color: '#4b5563' }}>
            The Future of Decentralized Gaming
          </p>
        </div>
      </main>

      {showDeposit && authenticated && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100000,
          }}
          onClick={() => setShowDeposit(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              textAlign: 'left',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: '300', color: '#1f2937', margin: 0 }}>
                Your Wallets
              </h2>
              <button
                type="button"
                onClick={() => setShowDeposit(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
              Send funds to any of your wallet addresses below.
            </p>

            {wallets.length === 0 ? (
              <p
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#4b5563',
                  margin: 0,
                }}
              >
                No wallets yet.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
                {wallets.map((wallet) => (
                  <li
                    key={`${wallet.chainType}-${wallet.address}`}
                    style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #f3f4f6',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                        {formatChainName(wallet.chainType)}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {wallet.walletClientType || 'embedded'}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        color: '#374151',
                        wordBreak: 'break-all',
                        margin: '0 0 12px 0',
                      }}
                    >
                      {wallet.address}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy(wallet.address)}
                      style={{
                        fontSize: '14px',
                        padding: '6px 16px',
                        backgroundColor: '#111827',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
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
