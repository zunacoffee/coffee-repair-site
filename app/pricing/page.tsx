"use client"

import { useState } from 'react'

const plans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '$29',
    description: 'Monthly maintenance for light coffee equipment.',
    features: ['1 service visit / month', 'Standard inspection', 'Priority scheduling'],
  },
  {
    id: 'standard',
    name: 'Standard Plan',
    price: '$59',
    description: 'Regular maintenance for most coffee repair needs.',
    features: ['2 service visits / month', 'Detailed inspection', 'Parts diagnostics'],
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: '$99',
    description: 'Full coverage with priority service and support.',
    features: ['Unlimited service visits', 'Priority response', 'Dedicated support line'],
  },
]

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    setError(null)
    setLoadingPlan(planId)

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      setLoadingPlan(null)
      setError(data?.error || 'Unable to start checkout. Please try again.')
      return
    }

    const { url } = await response.json()

    if (!url) {
      setLoadingPlan(null)
      setError('Unable to start checkout. Please try again.')
      return
    }

    window.location.href = url
  }

  const isLoading = loadingPlan !== null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Maintenance plans</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Choose the best plan for your coffee equipment.</h1>
            <p className="mt-4 max-w-2xl text-base text-gray-600">
              Subscribe to a monthly maintenance plan and keep your coffee systems running smoothly with fast service and expert support.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
                  <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-5xl font-bold text-gray-900">{plan.price}</p>
                <p className="mt-2 text-sm text-gray-500">per month</p>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-gray-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-1 text-indigo-600">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSubscribe(plan.id)}
                className="mt-10 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loadingPlan === plan.id ? 'Starting checkout...' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
