import Link from 'next/link'
import PublicNavbar from './components/PublicNavbar'
import PublicFooter from './components/PublicFooter'

const MONO = 'font-[family-name:var(--font-ibm-plex-mono)]'

export default function Home() {
  return (
    <main className="bg-[#0D1B2A] text-[#E8ECF0]">
      <PublicNavbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0D1B2A] px-6 py-20 sm:px-10 sm:py-28 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#B87333_0%,_transparent_60%)] opacity-[0.07] pointer-events-none" />
        <div className="relative mx-auto max-w-7xl flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">

          {/* Left */}
          <div className="max-w-xl space-y-7">
            <p className={`${MONO} text-xs tracking-widest text-[#B87333]`}>// CAFE-WORKS · REPAIR DISPATCH</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your machine is down.{' '}
              <em className="not-italic text-[#B87333]">We fix it today.</em>
            </h1>
            <p className="text-lg leading-8 text-[#E8ECF0]/60">
              Expert repair for espresso machines, grinders, and brewers. Same-day diagnostics, transparent pricing, no surprise fees.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/service-request"
                className="inline-flex items-center justify-center rounded-full bg-[#B87333] px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#a0632b]"
              >
                Book a Repair
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-[#E8ECF0] transition hover:border-white/40 hover:bg-white/5"
              >
                View Maintenance Plans
              </Link>
            </div>
          </div>

          {/* Right — Repair Tracker */}
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm lg:shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className={`${MONO} text-[10px] tracking-widest text-[#B87333]`}>JOB-ID: CW-2025-0891</p>
                <p className="mt-1 text-sm font-semibold text-white">La Marzocco Linea PB</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[#B87333]/15 px-3 py-1 text-[11px] font-semibold text-[#B87333]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B87333] animate-pulse" />
                In Progress
              </span>
            </div>

            <div className="space-y-0">
              {[
                { label: 'Job received',      done: true  },
                { label: 'Diagnostics',        done: true  },
                { label: 'Parts sourced',      done: true  },
                { label: 'Repair in progress', done: true, active: true },
                { label: 'QA & calibration',   done: false },
                { label: 'Ready for pickup',   done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      step.active ? 'border-[#B87333] bg-[#B87333]'
                      : step.done  ? 'border-[#B87333] bg-[#B87333]/20'
                      : 'border-white/20 bg-transparent'
                    }`}>
                      {step.done && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {i < 5 && <div className={`w-px flex-1 my-0.5 ${step.done ? 'bg-[#B87333]/40' : 'bg-white/10'}`} style={{ minHeight: 16 }} />}
                  </div>
                  <p className={`pb-4 text-sm leading-5 ${step.active ? 'font-semibold text-white' : step.done ? 'text-[#E8ECF0]/60' : 'text-[#E8ECF0]/30'}`}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-2 pt-4 border-t border-white/10">
              <p className={`${MONO} text-[10px] text-[#E8ECF0]/40`}>EST. COMPLETION: TODAY 4:30 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section className="border-y border-white/[0.07] bg-white/[0.03]">
        <div className="mx-auto max-w-7xl grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.07]">
          {[
            { stat: '4 hr',  label: 'avg repair time'       },
            { stat: '98%',   label: 'same-day turnaround'   },
            { stat: '$0',    label: 'surprise fees'          },
            { stat: 'All',   label: 'brands supported'       },
          ].map(({ stat, label }) => (
            <div key={label} className="px-8 py-8 text-center">
              <p className="text-3xl font-bold text-[#B87333]">{stat}</p>
              <p className="mt-1.5 text-sm text-[#E8ECF0]/50">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="bg-[#E8ECF0] px-6 py-16 sm:py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-2xl">
            <p className={`${MONO} text-xs tracking-widest text-[#B87333]`}>// SERVICES</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0D1B2A] sm:text-4xl">
              Full-service repair for every coffee component.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#7A8898]">
              From busy cafe lines to premium home setups, Cafe Works restores performance and extends equipment life.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                key:   'PART-TYPE: ESPRESSO',
                title: 'Espresso Machines',
                sub:   'Pressure systems & steam wands',
                body:  'Pump rebuilds, group head service, boiler repair, and calibration for all commercial and prosumer models.',
              },
              {
                key:   'PART-TYPE: GRINDER',
                title: 'Grinders',
                sub:   'Grind consistency & burr replacements',
                body:  'Full service for maintenance, burr swaps, alignment, calibration, and precision tuning for every dose.',
              },
              {
                key:   'PART-TYPE: BREWER',
                title: 'Brewers',
                sub:   'Drip, pour-over & batch brewers',
                body:  'Leak repair, heater diagnostics, water delivery checks, and system optimization for reliable brew quality.',
              },
            ].map(({ key, title, sub, body }) => (
              <div key={title} className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 shadow-sm">
                <p className={`${MONO} text-[11px] tracking-widest text-[#B87333]`}>{key}</p>
                <h3 className="mt-4 text-xl font-bold text-[#0D1B2A]">{title}</h3>
                <p className="mt-1 text-sm font-semibold text-[#7A8898]">{sub}</p>
                <p className="mt-3 text-sm leading-6 text-[#7A8898]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Cafe Works ── */}
      <section className="bg-[#0D1B2A] px-6 py-16 sm:py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className={`${MONO} text-xs tracking-widest text-[#B87333]`}>// WHY-CAFE-WORKS</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Trusted service designed for busy coffee businesses.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#E8ECF0]/60">
              We combine fast response, coffee-specialized technicians, and clear communication so your equipment stays operational and your team stays focused.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: 'M13 10V3L4 14h7v7l9-11h-7z',
                title: 'Rapid turnaround',
                body:  'Same-day service and remote troubleshooting means less downtime for your operation.',
              },
              {
                icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                title: 'Certified technicians',
                body:  'Our team is experienced with top coffee brands and mission-critical repair workflows.',
              },
              {
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                title: 'Transparent pricing',
                body:  'You get an estimate before any work begins. No hidden costs, ever.',
              },
              {
                icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
                title: 'Proactive maintenance',
                body:  'Preventative plans keep equipment running longer and cut costly emergency repairs.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#B87333]/15">
                  <svg className="h-5 w-5 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                </div>
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1.5 text-sm leading-6 text-[#E8ECF0]/50">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Maintenance Plans ── */}
      <section className="bg-[#F4F6F9] px-6 py-16 sm:py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-2xl">
            <p className={`${MONO} text-xs tracking-widest text-[#B87333]`}>// MAINTENANCE-PLANS</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0D1B2A] sm:text-4xl">
              Plans for every size of cafe and gear stack.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#7A8898]">
              Monthly billing, priority support, and routine upkeep — choose the plan that fits your operation.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                name:     'Basic',
                price:    '$99',
                desc:     'Perfect for small shops that need dependable monthly maintenance.',
                features: ['1 machine covered', 'Monthly PM visit', 'Email support', '10% parts discount'],
                featured: false,
              },
              {
                name:     'Standard',
                price:    '$199',
                desc:     'A balanced plan for regular maintenance and ongoing priority support.',
                features: ['Up to 3 machines', 'Bi-monthly PM visits', 'Priority phone support', '15% parts discount', 'Free diagnostics'],
                featured: true,
              },
              {
                name:     'Premium',
                price:    '$349',
                desc:     'Priority response and full coverage for busy or multi-location cafes.',
                features: ['Unlimited machines', 'Monthly PM visits', '24/7 emergency line', '20% parts discount', 'Free diagnostics', 'Loaner equipment'],
                featured: false,
              },
            ].map(({ name, price, desc, features, featured }) => (
              <div
                key={name}
                className={`relative rounded-2xl p-8 ${
                  featured
                    ? 'bg-[#0D1B2A] text-white shadow-xl shadow-[#0D1B2A]/20 ring-2 ring-[#B87333]'
                    : 'bg-white border border-[#E8ECF0] shadow-sm'
                }`}
              >
                {featured && (
                  <span className={`${MONO} absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#B87333] px-4 py-0.5 text-[10px] font-semibold tracking-widest text-white`}>
                    MOST POPULAR
                  </span>
                )}
                <p className={`${MONO} text-[11px] tracking-widest ${featured ? 'text-[#B87333]' : 'text-[#B87333]'}`}>PLAN: {name.toUpperCase()}</p>
                <p className={`mt-3 text-4xl font-bold ${featured ? 'text-white' : 'text-[#0D1B2A]'}`}>
                  {price}<span className={`text-base font-normal ${featured ? 'text-white/50' : 'text-[#7A8898]'}`}>/mo</span>
                </p>
                <p className={`mt-2 text-sm leading-6 ${featured ? 'text-[#E8ECF0]/60' : 'text-[#7A8898]'}`}>{desc}</p>
                <ul className="mt-6 space-y-2.5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <svg className="h-4 w-4 shrink-0 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={featured ? 'text-[#E8ECF0]/80' : 'text-[#0D1B2A]'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`mt-8 flex items-center justify-center rounded-full py-3 text-sm font-semibold transition ${
                    featured
                      ? 'bg-[#B87333] text-white hover:bg-[#a0632b]'
                      : 'border border-[#0D1B2A]/20 text-[#0D1B2A] hover:bg-[#0D1B2A] hover:text-white'
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#0D1B2A] px-6 py-16 sm:py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={`${MONO} text-xs tracking-widest text-[#B87333]`}>// GET-IN-TOUCH</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Machine down?{' '}
              <span className="text-[#B87333]">Call us now.</span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#E8ECF0]/60">
              Free inspection estimate. Rapid booking. No commitment required. We'll have your equipment back in service today.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/service-request"
                className="inline-flex items-center justify-center rounded-full bg-[#B87333] px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#a0632b]"
              >
                Book a Repair
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-[#E8ECF0] transition hover:border-white/40 hover:bg-white/5"
              >
                View Plans
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
            <div>
              <p className={`${MONO} text-[10px] tracking-widest text-[#B87333]`}>// PHONE</p>
              <p className="mt-2 text-2xl font-bold text-white">(555) 012-3456</p>
            </div>
            <div className="border-t border-white/10 pt-6">
              <p className={`${MONO} text-[10px] tracking-widest text-[#B87333]`}>// EMAIL</p>
              <p className="mt-2 text-lg font-semibold text-white">hello@cafeworks.com</p>
            </div>
            <div className="border-t border-white/10 pt-6">
              <p className={`${MONO} text-[10px] tracking-widest text-[#B87333]`}>// HOURS</p>
              <p className="mt-2 text-sm text-[#E8ECF0]/60">Mon – Fri · 8:00 AM – 5:00 PM</p>
              <p className="mt-0.5 text-sm text-[#E8ECF0]/40">Emergency weekend service available</p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
