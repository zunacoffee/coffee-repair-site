import PublicNavbar from '../components/PublicNavbar'
import PublicFooter from '../components/PublicFooter'
import SubscribeButton from './SubscribeButton'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export const revalidate = 300 // re-render at most every 5 minutes

const MONO = 'font-[family-name:var(--font-ibm-plex-mono)]'

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
  { id: 1, plan_key: 'basic',    name: 'Basic',    description: 'Monthly maintenance for light coffee equipment.',    price: 29, features: ['1 service visit / month', 'Standard inspection', 'Priority scheduling'],                                    is_active: true },
  { id: 2, plan_key: 'standard', name: 'Standard', description: 'Regular maintenance for most coffee repair needs.', price: 59, features: ['2 service visits / month', 'Detailed inspection', 'Parts diagnostics', 'Priority scheduling'], is_active: true },
  { id: 3, plan_key: 'premium',  name: 'Premium',  description: 'Full coverage with priority service and support.',  price: 99, features: ['Unlimited service visits', 'Priority response', 'Dedicated support line', 'Emergency same-day service'], is_active: true },
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

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 mt-0.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="8" fill="#B87333" fillOpacity="0.12" />
      <path
        d="M4.5 8.5L6.5 10.5L11.5 5.5"
        stroke="#B87333"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default async function PricingPage() {
  const plans = await getPlans()

  return (
    <div className="min-h-screen flex flex-col bg-[#E8ECF0]">
      <PublicNavbar />

      {/* Hero */}
      <section className="bg-[#0D1B2A] px-6 py-20 sm:py-28 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`${MONO} text-xs font-semibold tracking-[0.18em] uppercase`} style={{ color: '#B87333' }}>
            // MAINTENANCE PLANS
          </p>
          <h1 className="mt-5 text-4xl font-light tracking-tight text-white sm:text-5xl lg:text-6xl">
            Stop paying for<br />
            <em className="not-italic font-semibold" style={{ color: '#B87333' }}>emergency repairs.</em>
          </h1>
          <p className="mt-6 text-base text-[#E8ECF0]/60 max-w-xl mx-auto leading-relaxed">
            A monthly plan costs less than one service call. Keep your espresso machines, grinders, and brewers running.
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
            {plans.map((plan) => {
              const featured = plan.plan_key === 'standard'
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl p-8 ${
                    featured
                      ? 'bg-[#0D1B2A] shadow-xl'
                      : 'bg-white shadow-sm ring-1 ring-[#E8ECF0]'
                  }`}
                  style={featured ? { boxShadow: '0 0 0 2px #B87333, 0 20px 40px -8px rgba(0,0,0,0.20)' } : undefined}
                >
                  {featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className={`${MONO} inline-block rounded-full px-4 py-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-white`}
                        style={{ backgroundColor: '#B87333' }}
                      >
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div>
                    <p
                      className={`${MONO} text-[10px] font-semibold tracking-[0.15em] uppercase`}
                      style={{ color: '#B87333' }}
                    >
                      PLAN-TYPE: {plan.plan_key.toUpperCase()}
                    </p>
                    <h2 className={`mt-2 text-xl font-semibold ${featured ? 'text-white' : 'text-[#0D1B2A]'}`}>{plan.name}</h2>
                    <p className={`mt-1.5 text-sm leading-relaxed ${featured ? 'text-[#E8ECF0]/60' : 'text-[#7A8898]'}`}>{plan.description}</p>
                  </div>

                  <div className="mt-8">
                    <div className="flex items-end gap-1.5">
                      <span className={`text-5xl font-bold ${featured ? 'text-white' : 'text-[#0D1B2A]'}`}>${plan.price}</span>
                      <span className={`mb-1.5 text-sm ${featured ? 'text-[#E8ECF0]/50' : 'text-[#7A8898]'}`}>/ mo</span>
                    </div>
                  </div>

                  <ul className="mt-8 flex-1 space-y-3">
                    {(plan.features ?? []).map((feature, i) => (
                      <li key={i} className={`flex items-start gap-3 text-sm ${featured ? 'text-[#E8ECF0]/70' : 'text-[#7A8898]'}`}>
                        <CheckIcon />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <SubscribeButton planKey={plan.plan_key} />
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-10 text-center text-sm text-[#7A8898]">
            No long-term contracts. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Stats band */}
      <section className="bg-[#0D1B2A] px-6 py-14 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            {[
              { label: 'Average response time', value: '< 2 hrs' },
              { label: 'Machines serviced', value: '1,200+' },
              { label: 'Customer satisfaction', value: '98%' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <span className="text-4xl font-bold text-white">{stat.value}</span>
                <span className="text-sm text-[#E8ECF0]/50">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
