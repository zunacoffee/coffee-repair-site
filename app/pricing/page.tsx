import PublicNavbar from '../components/PublicNavbar'
import PublicFooter from '../components/PublicFooter'
import SubscribeButton from './SubscribeButton'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export const revalidate = 300 // re-render at most every 5 minutes

interface Plan {
  id: number
  plan_key: string
  name: string
  description: string
  price: number
  features: string[]
  is_active: boolean
}

const FALLBACK_PLANS: Plan[] = [
  { id: 1, plan_key: 'basic',    name: 'Basic Plan',    description: 'Monthly maintenance for light coffee equipment.',    price: 29, features: ['1 service visit / month', 'Standard inspection', 'Priority scheduling'],                         is_active: true },
  { id: 2, plan_key: 'standard', name: 'Standard Plan', description: 'Regular maintenance for most coffee repair needs.', price: 59, features: ['2 service visits / month', 'Detailed inspection', 'Parts diagnostics'],                          is_active: true },
  { id: 3, plan_key: 'premium',  name: 'Premium Plan',  description: 'Full coverage with priority service and support.',  price: 99, features: ['Unlimited service visits', 'Priority response', 'Dedicated support line'], is_active: true },
]

async function getPlans(): Promise<Plan[]> {
  try {
    const { data } = await supabaseAdmin
      .from('plan_settings')
      .select('id, plan_key, name, description, price, features, is_active')
      .eq('is_active', true)
      .order('price', { ascending: true })
    return data && data.length > 0 ? (data as Plan[]) : FALLBACK_PLANS
  } catch {
    return FALLBACK_PLANS
  }
}

export default async function PricingPage() {
  const plans = await getPlans()

  return (
    <div className="min-h-screen bg-cafe-silver flex flex-col">
      <PublicNavbar />
      <div className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="sm:flex sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cafe-bronze">Maintenance plans</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-cafe-navy sm:text-4xl lg:text-5xl">Choose the best plan for your coffee equipment.</h1>
              <p className="mt-4 max-w-2xl text-base text-cafe-steel">
                Subscribe to a monthly maintenance plan and keep your coffee systems running smoothly with fast service and expert support.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-3xl border border-[#D4D8DC] bg-white p-8 shadow-sm">
                <div>
                  <h2 className="text-xl font-semibold text-cafe-navy">{plan.name}</h2>
                  <p className="mt-2 text-sm text-cafe-steel">{plan.description}</p>
                </div>

                <div className="mt-8">
                  <p className="text-5xl font-bold text-cafe-navy">${plan.price}</p>
                  <p className="mt-2 text-sm text-cafe-steel">per month</p>
                </div>

                <ul className="mt-8 space-y-3 text-sm text-cafe-steel">
                  {(plan.features ?? []).map((feature, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1 text-cafe-bronze">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <SubscribeButton planKey={plan.plan_key} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
