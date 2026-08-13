import React from 'react'
import ReactDOM from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider
      appId="cmsqukzij01a40cl5fqa0nli6"
      clientId="client-WY6cEKbhNMHsx3W68bSBvHmzm8vTHH3UvEjXpgPbYhBsE"
      config={{
        loginMethods: ['email', 'google', 'twitter', 'discord', 'github'],
        appearance: {
          theme: 'dark',
          accentColor: '#8B5CF6',
          walletChainType: 'solana-only',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'off',
          },
          solana: {
            createOnLogin: 'users-without-wallets',
          },
          showWalletUIs: true,
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>,
)
