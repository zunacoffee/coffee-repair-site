"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type NavItem = 'dashboard' | 'customers' | 'repair-jobs' | 'maintenance-plans'

export default function AdminPage() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      setIsLoading(false)
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  const navItems = [
    { id: 'dashboard' as NavItem, label: 'Dashboard', icon: '📊' },
    { id: 'customers' as NavItem, label: 'Customers', icon: '👥' },
    { id: 'repair-jobs' as NavItem, label: 'Repair Jobs', icon: '🔧' },
    { id: 'maintenance-plans' as NavItem, label: 'Maintenance Plans', icon: '📋' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
          <p className="text-xs text-gray-500 mt-1">Coffee Repair Co.</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full text-left px-4 py-2 rounded-md transition ${
                activeNav === item.id
                  ? 'bg-indigo-100 text-indigo-900 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <p className="text-xs text-gray-500">Signed in</p>
          <p className="text-sm font-medium text-gray-900 truncate">{userEmail}</p>
          <button
            onClick={handleSignOut}
            className="w-full mt-4 py-2 px-3 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-gray-900">
              {navItems.find((item) => item.id === activeNav)?.label || 'Dashboard'}
            </h2>
            <p className="text-gray-500 mt-1">Manage your repair business operations</p>
          </div>

          {/* Dashboard View */}
          {activeNav === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">—</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Active Repair Jobs</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">—</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Active Plans</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">—</p>
              </div>
            </div>
          )}

          {/* Customers View */}
          {activeNav === 'customers' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                  Add Customer
                </button>
              </div>

              <div className="p-6">
                <div className="border-2 border-dashed border-gray-200 rounded-md p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20a9 9 0 0118 0v2H0v-2a9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-4 text-gray-700 font-medium">No customers yet</p>
                  <p className="mt-2 text-sm text-gray-500">Add your first customer to get started</p>
                </div>
              </div>
            </div>
          )}

          {/* Repair Jobs View */}
          {activeNav === 'repair-jobs' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Repair Jobs</h3>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                  Create Job
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Job ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-500 font-medium">No repair jobs yet</p>
                        <p className="text-sm text-gray-400">Create a new job to get started</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Maintenance Plans View */}
          {activeNav === 'maintenance-plans' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Maintenance Plans</h3>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                  Create Plan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                <div className="border rounded-lg p-4 text-center">
                  <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-4">
                    Active Plans
                  </div>
                  <p className="text-3xl font-semibold text-gray-900">—</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 mb-4">
                    Expiring Soon
                  </div>
                  <p className="text-3xl font-semibold text-gray-900">—</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 mb-4">
                    Inactive Plans
                  </div>
                  <p className="text-3xl font-semibold text-gray-900">—</p>
                </div>
              </div>

              <div className="px-6 pb-6 border-2 border-dashed border-gray-200 rounded-md p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 font-medium">No maintenance plans yet</p>
                <p className="text-sm text-gray-400">Create your first plan to offer customers</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
