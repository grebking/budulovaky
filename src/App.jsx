import React, { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'

function App() {
  const { login, logout, authenticated } = usePrivy()
  const [showDeposit, setShowDeposit] = useState(false)

  useEffect(() => {
    const depositBtn = document.getElementById('deposit-btn')
    const loginBtn = document.getElementById('login-btn')

    if (loginBtn) {
      loginBtn.textContent = authenticated ? 'Logout' : 'Login'
    }

    const onDepositClick = async () => {
      if (!authenticated) {
        try {
          await login()
        } catch (error) {
          console.error('Login failed:', error)
        }
        return
      }
      setShowDeposit(true)
    }

    const onLoginClick = async () => {
      try {
        if (authenticated) {
          setShowDeposit(false)
          await logout()
        } else {
          await login()
        }
      } catch (error) {
        console.error('Auth failed:', error)
      }
    }

    depositBtn?.addEventListener('click', onDepositClick)
    loginBtn?.addEventListener('click', onLoginClick)

    return () => {
      depositBtn?.removeEventListener('click', onDepositClick)
      loginBtn?.removeEventListener('click', onLoginClick)
    }
  }, [authenticated, login, logout])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
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
            zIndex: 2147483646,
          }}
          onClick={() => setShowDeposit(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              width: '100%',
              maxWidth: '480px',
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
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: '300', color: '#1f2937', margin: 0 }}>
                Deposit
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
            <p style={{ fontSize: '15px', color: '#4b5563', margin: 0 }}>
              Deposit options coming soon.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
