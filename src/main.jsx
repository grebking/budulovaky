import React from 'react'
import ReactDOM from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider
      appId="cmsqukzij01a40cl5fqa0nli6"
      clientId="client-WY6cEKbhNMHsx3W68bSBvHmzm8vTHH3UvEjrxa4VwyoJ1"
      config={{
        loginMethods: ['email', 'google', 'twitter', 'discord', 'github'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          walletChainType: 'solana-only',
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>,
)
