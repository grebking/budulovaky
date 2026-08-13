import React, { useState } from 'react'

export default function DepositModal({ address, onClose }) {
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
