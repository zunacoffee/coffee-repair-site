"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

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

  const handleManagePlan = async () => {
    setPortalLoading(true)
    setPortalError(null)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      router.push('/login')
      return
    }

    const res = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    const data = await res.json()
    setPortalLoading(false)

    if (!res.ok) {
      setPortalError(data.error || 'Unable to open billing portal.')
      return
    }

    window.location.href = data.url
  }

  return (
    <div className="min-h-screen bg-cafe-silver py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-cafe-navy">Dashboard</h1>
            <p className="text-sm text-cafe-steel">Overview of your repairs and maintenance plan.</p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="text-right">
              <p className="text-sm text-cafe-steel">Signed in as</p>
              <p className="text-sm font-medium text-cafe-navy">{userEmail ?? '—'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-cafe-navy">Repair history</h2>
            <p className="text-sm text-cafe-steel mt-1">Your past repairs and service tickets.</p>

            <div className="mt-6 border-2 border-dashed border-[#D4D8DC] rounded-md p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-cafe-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" />
              </svg>
              <p className="mt-4 text-cafe-navy font-medium">No repair history yet</p>
              <p className="mt-2 text-sm text-cafe-steel">When you complete repairs, they'll appear here for easy reference.</p>
            </div>
          </div>

          <aside className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-cafe-navy">Maintenance plan</h2>
            <p className="text-sm text-cafe-steel mt-1">Status of your current plan.</p>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cafe-steel">Plan</p>
                  <p className="text-base font-medium text-cafe-navy">Basic</p>
                </div>

                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Active</span>
                </div>
              </div>

              <div className="mt-4 text-sm text-cafe-steel">
                <p>No actions required. Your plan renews on <span className="font-medium text-cafe-navy">—</span>.</p>
              </div>

              {portalError && <p className="mt-4 text-sm text-red-600">{portalError}</p>}
              <button
                onClick={handleManagePlan}
                disabled={portalLoading}
                className="mt-6 w-full py-2 px-4 bg-cafe-bronze text-white rounded-md hover:bg-[#a0632b] disabled:opacity-50"
              >
                {portalLoading ? 'Opening portal…' : 'Manage plan'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
 }
