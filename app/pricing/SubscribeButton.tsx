'use client'

import { useState } from 'react'

export default function SubscribeButton({ planKey }: { planKey: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleSubscribe = async () => {
    setError(null)
    setLoading(true)

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: planKey }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setLoading(false)
      setError(data?.error || 'Unable to start checkout. Please try again.')
      return
    }

    const { url } = await res.json()

    if (!url) {
      setLoading(false)
      setError('Unable to start checkout. Please try again.')
      return
    }

    window.location.href = url
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={handleSubscribe}
        className="mt-10 inline-flex w-full items-center justify-center rounded-xl bg-cafe-bronze px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a0632b] disabled:cursor-not-allowed disabled:bg-[#D4D8DC]"
      >
        {loading ? 'Starting checkout…' : 'Subscribe'}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  )
}
