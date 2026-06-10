"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const ADMIN_EMAIL = 'tyson@zunacoffee.com'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/login')
        return
      }
      if (session.user.email !== ADMIN_EMAIL) {
        router.replace('/dashboard')
        return
      }
      setAuthorized(true)
    })
  }, [router])

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  return <>{children}</>
}
