"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLinkInvalid(true)
    }, 5000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeout)
        setSessionReady(true)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Password updated. Redirecting to sign in...')
    setTimeout(() => router.push('/login'), 2000)
  }

  if (linkInvalid && !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-silver px-4">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-semibold mb-2 text-cafe-navy">Link expired</h1>
          <p className="text-sm text-cafe-steel mb-6">
            This password reset link is invalid or has expired.
          </p>
          <a
            href="/forgot-password"
            className="inline-block py-2 px-4 bg-cafe-bronze text-white rounded-md hover:opacity-90 text-sm font-medium"
          >
            Request a new link
          </a>
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-silver px-4">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center">
          <p className="text-cafe-steel text-sm">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cafe-silver px-4">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-semibold mb-2 text-cafe-navy">Choose a new password</h1>
        <p className="text-sm text-cafe-steel mb-6">Enter a new password for your account.</p>

        {message ? (
          <div className="rounded-md bg-green-50 px-4 py-4 text-sm text-green-700">{message}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password-new" className="block text-sm font-medium text-cafe-navy">New password</label>
              <input
                id="reset-password-new"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                className="mt-1 block w-full px-3 py-2 border border-[#D4D8DC] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cafe-bronze"
              />
            </div>

            <div>
              <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-cafe-navy">Confirm password</label>
              <input
                id="reset-password-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-[#D4D8DC] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cafe-bronze"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-cafe-bronze text-white rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
