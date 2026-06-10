"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return
      if (!user) {
        router.replace('/login')
        return
      }

      setUserEmail(user.email ?? null)
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Sign out
          </button>
        </div>

        <div className="mt-6">
          <p className="text-gray-700 text-lg">Welcome{userEmail ? `, ${userEmail}` : ''}.</p>
          <p className="mt-2 text-sm text-gray-500">This is your dashboard. Build out your repair workflow here.</p>
        </div>
      </div>
    </div>
  )
}
