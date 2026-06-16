"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // If session exists, user is logged in — redirect. Otherwise show message.
    if (data?.session) {
      router.push('/dashboard')
      return
    }

    setMessage('Check your email for a confirmation link to complete sign up.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cafe-silver px-4">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-semibold mb-2 text-cafe-navy">Create an account</h1>
        <p className="text-sm text-cafe-steel mb-6">Start your repair management with a free account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-cafe-navy">Email</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2.5 border border-[#D4D8DC] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cafe-bronze"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-cafe-navy">Password</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full px-3 py-2.5 border border-[#D4D8DC] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cafe-bronze"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-cafe-bronze text-white font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-cafe-steel">
          Already have an account? <a href="/login" className="text-cafe-bronze font-medium">Sign in</a>
        </p>
      </div>
    </div>
  )
}
