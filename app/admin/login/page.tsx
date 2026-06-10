"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Invalid password.')
      setPassword('')
      return
    }

    router.replace('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0D1B2A' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight">
            <span style={{ color: '#E8ECF0' }}>Cafe</span>
            <span style={{ color: '#B87333' }}> Works</span>
          </p>
          <p className="mt-1 text-sm" style={{ color: '#7A8898' }}>Admin portal</p>
        </div>

        <div className="rounded-2xl border p-8" style={{ backgroundColor: '#0D1B2A', borderColor: '#7A8898' + '40' }}>
          <h1 className="text-lg font-semibold mb-1" style={{ color: '#E8ECF0' }}>Admin access</h1>
          <p className="text-sm mb-6" style={{ color: '#7A8898' }}>Enter the admin password to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#E8ECF0' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="block w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: '#0D1B2A',
                  border: '1px solid #7A8898',
                  color: '#E8ECF0',
                  '--tw-ring-color': '#B87333',
                } as React.CSSProperties}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#f87171' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: '#B87333' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#a0632b' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = loading ? '' : '#B87333' }}
            >
              {loading ? 'Checking...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
