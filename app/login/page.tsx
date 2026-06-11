"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cafe-silver px-4">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-semibold mb-2 text-cafe-navy">Sign in</h1>
        <p className="text-sm text-cafe-steel mb-6">Access your account with your email and password.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cafe-navy">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2.5 border border-[#D4D8DC] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cafe-bronze"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-cafe-navy">Password</label>
              <a href="/forgot-password" className="text-xs text-cafe-bronze hover:underline">Forgot password?</a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2.5 border border-[#D4D8DC] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cafe-bronze"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-cafe-bronze text-white font-semibold rounded-md hover:bg-[#a0632b] disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-cafe-steel">
          Don't have an account? <a href="/signup" className="text-cafe-bronze font-medium">Sign up</a>
        </p>
      </div>
    </div>
  )
}
