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
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Overview of your repairs and maintenance plan.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Signed in as</p>
              <p className="text-sm font-medium text-gray-900">{userEmail ?? '—'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900">Repair history</h2>
            <p className="text-sm text-gray-500 mt-1">Your past repairs and service tickets.</p>

            <div className="mt-6 border-2 border-dashed border-gray-200 rounded-md p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" />
              </svg>
              <p className="mt-4 text-gray-700 font-medium">No repair history yet</p>
              <p className="mt-2 text-sm text-gray-500">When you complete repairs, they'll appear here for easy reference.</p>
            </div>
          </div>

          <aside className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900">Maintenance plan</h2>
            <p className="text-sm text-gray-500 mt-1">Status of your current plan.</p>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Plan</p>
                  <p className="text-base font-medium text-gray-900">Basic</p>
                </div>

                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Active</span>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <p>No actions required. Your plan renews on <span className="font-medium text-gray-800">—</span>.</p>
              </div>

              <button className="mt-6 w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Manage plan</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
 }
