import Link from 'next/link'
import PublicNavbar from './components/PublicNavbar'

export default function Home() {
  return (
    <main className="bg-slate-950 text-slate-50">
      <PublicNavbar />
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-800 px-6 py-24 sm:px-10 lg:px-16">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-slate-900 opacity-80" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-8">
            <p className="inline-flex rounded-full bg-indigo-600/20 px-4 py-1 text-sm font-semibold uppercase tracking-[0.24em] text-indigo-100">Cafe Works</p>
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Fast coffee equipment repair for shops that demand uptime.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              Keep your espresso machines, grinders, and brewers in premium condition with expert maintenance, fast diagnostics, and reliable emergency support.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
              >
                Book a Repair
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-slate-600 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800"
              >
                View Maintenance Plans
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10">
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-indigo-400">Express service</p>
                <h2 className="mt-4 text-2xl font-semibold text-white">Same-day diagnostics</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Our technicians isolate faults quickly and provide a clear repair plan so your cafe stays open.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                  <p className="text-sm font-semibold text-white">Dedicated technicians</p>
                  <p className="mt-2 text-sm text-slate-400">Specialized in coffee gear service and calibration.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                  <p className="text-sm font-semibold text-white">Transparent pricing</p>
                  <p className="mt-2 text-sm text-slate-400">No surprise fees. Estimates before work begins.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-slate-50 text-slate-950 px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">What we repair</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Full-service repair for every coffee component.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              From busy cafe lines to premium home setups, Cafe Works provides the expertise and parts to restore performance and extend equipment life.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Espresso machines</p>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">Pressure systems & steam wands</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Repairs, pump rebuilds, group head service, and calibration for all commercial and prosumer models.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Grinders</p>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">Grind consistency & burr replacements</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Full service for maintenance, burr swaps, calibration, and precision tuning for every dose.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Brewers</p>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">Drip, pour-over & batch brewers</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Leak repair, heater diagnostics, water delivery checks, and system optimization for reliable brew quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-slate-50 px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-[1.2fr,0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-400">Why choose Cafe Works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Trusted service designed for busy coffee businesses.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              We combine fast response, coffee-specialized technicians, and clear communication so your equipment stays operational and your team stays focused.
            </p>
          </div>

          <div className="grid gap-5">
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-xl shadow-black/20">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-300">Rapid turnaround</p>
              <p className="mt-3 text-base leading-7 text-slate-300">Same-day service and remote troubleshooting means less downtime for your operation.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-xl shadow-black/20">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-300">Certified technicians</p>
              <p className="mt-3 text-base leading-7 text-slate-300">Our team is experienced with top coffee brands and mission-critical repair workflows.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-xl shadow-black/20">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-300">Proactive maintenance</p>
              <p className="mt-3 text-base leading-7 text-slate-300">Preventative plans keep your equipment running longer and reduce costly emergency repairs.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 text-slate-950 px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white/90 p-10 shadow-2xl shadow-slate-900/10">
          <div className="grid gap-10 lg:grid-cols-[1.4fr,0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Maintenance plans</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Plans for every size of cafe and gear stack.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Choose a plan that matches your service needs, with convenient monthly billing and priority support for routine upkeep.
              </p>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6">
                <p className="text-sm font-semibold text-slate-900">Basic Plan</p>
                <p className="mt-2 text-sm text-slate-600">Perfect for small shops that need dependable monthly maintenance.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6">
                <p className="text-sm font-semibold text-slate-900">Standard Plan</p>
                <p className="mt-2 text-sm text-slate-600">A balanced plan for regular maintenance and ongoing support.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6">
                <p className="text-sm font-semibold text-slate-900">Premium Plan</p>
                <p className="mt-2 text-sm text-slate-600">Priority response and full coverage for busy or multi-location cafes.</p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Explore Pricing
            </Link>
            <p className="text-sm text-slate-600">Start with a plan that keeps your equipment running at peak performance.</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-slate-100 px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-400">Contact Cafe Works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Ready to schedule your service?</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              Reach out for a free inspection estimate, rapid repair booking, or help choosing the right maintenance plan for your equipment.
            </p>
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/20">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">Phone</p>
              <p className="mt-3 text-xl font-semibold text-white">(555) 012-3456</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">Email</p>
              <p className="mt-3 text-xl font-semibold text-white">hello@cafeworks.com</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
