import Link from 'next/link'
import PublicNavbar from './components/PublicNavbar'
import PublicFooter from './components/PublicFooter'

export default function Home() {
  return (
    <main className="bg-cafe-navy text-cafe-silver">
      <PublicNavbar />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0D1B2A] via-[#0D1B2A] to-[#1a2d3d] px-6 py-16 sm:px-10 sm:py-24 lg:px-16">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-cafe-navy opacity-80" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 sm:gap-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-6 sm:space-y-8">
            <p className="inline-flex rounded-full bg-cafe-bronze/20 px-4 py-1 text-sm font-semibold uppercase tracking-[0.24em] text-[#D4A574]">Cafe Works</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Fast coffee equipment repair for shops that demand uptime.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-[#A8B8C8]">
              Keep your espresso machines, grinders, and brewers in premium condition with expert maintenance, fast diagnostics, and reliable emergency support.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/service-request"
                className="inline-flex items-center justify-center rounded-full bg-cafe-bronze px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#a0632b]"
              >
                Book a Repair
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-cafe-steel bg-cafe-navy/80 px-6 py-3 text-sm font-semibold text-cafe-silver transition hover:border-[#9da8b8] hover:bg-[#1a2d3d]"
              >
                View Maintenance Plans
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-cafe-navy/80 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-cafe-bronze">Express service</p>
                <h2 className="mt-4 text-2xl font-semibold text-white">Same-day diagnostics</h2>
                <p className="mt-3 text-sm leading-6 text-[#A8B8C8]">
                  Our technicians isolate faults quickly and provide a clear repair plan so your cafe stays open.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-cafe-navy/80 p-5">
                  <p className="text-sm font-semibold text-white">Dedicated technicians</p>
                  <p className="mt-2 text-sm text-cafe-steel">Specialized in coffee gear service and calibration.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-cafe-navy/80 p-5">
                  <p className="text-sm font-semibold text-white">Transparent pricing</p>
                  <p className="mt-2 text-sm text-cafe-steel">No surprise fees. Estimates before work begins.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-cafe-silver text-cafe-navy px-6 py-14 sm:py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">What we repair</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Full-service repair for every coffee component.</h2>
            <p className="mt-4 text-base leading-7 text-cafe-steel">
              From busy cafe lines to premium home setups, Cafe Works provides the expertise and parts to restore performance and extend equipment life.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-[#D4D8DC] bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Espresso machines</p>
              <h3 className="mt-4 text-xl font-semibold text-cafe-navy">Pressure systems & steam wands</h3>
              <p className="mt-3 text-sm leading-6 text-cafe-steel">
                Repairs, pump rebuilds, group head service, and calibration for all commercial and prosumer models.
              </p>
            </div>
            <div className="rounded-3xl border border-[#D4D8DC] bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Grinders</p>
              <h3 className="mt-4 text-xl font-semibold text-cafe-navy">Grind consistency & burr replacements</h3>
              <p className="mt-3 text-sm leading-6 text-cafe-steel">
                Full service for maintenance, burr swaps, calibration, and precision tuning for every dose.
              </p>
            </div>
            <div className="rounded-3xl border border-[#D4D8DC] bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Brewers</p>
              <h3 className="mt-4 text-xl font-semibold text-cafe-navy">Drip, pour-over & batch brewers</h3>
              <p className="mt-3 text-sm leading-6 text-cafe-steel">
                Leak repair, heater diagnostics, water delivery checks, and system optimization for reliable brew quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cafe-navy text-cafe-silver px-6 py-14 sm:py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-[1.2fr,0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Why choose Cafe Works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Trusted service designed for busy coffee businesses.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#A8B8C8]">
              We combine fast response, coffee-specialized technicians, and clear communication so your equipment stays operational and your team stays focused.
            </p>
          </div>

          <div className="grid gap-5">
            <div className="rounded-3xl border border-white/10 bg-cafe-navy/90 p-8 shadow-xl shadow-black/20">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Rapid turnaround</p>
              <p className="mt-3 text-base leading-7 text-[#A8B8C8]">Same-day service and remote troubleshooting means less downtime for your operation.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-cafe-navy/90 p-8 shadow-xl shadow-black/20">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Certified technicians</p>
              <p className="mt-3 text-base leading-7 text-[#A8B8C8]">Our team is experienced with top coffee brands and mission-critical repair workflows.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-cafe-navy/90 p-8 shadow-xl shadow-black/20">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Proactive maintenance</p>
              <p className="mt-3 text-base leading-7 text-[#A8B8C8]">Preventative plans keep your equipment running longer and reduce costly emergency repairs.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cafe-silver text-cafe-navy px-6 py-14 sm:py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-[#D4D8DC] bg-white/90 p-6 sm:p-10 shadow-2xl shadow-cafe-navy/10">
          <div className="grid gap-10 lg:grid-cols-[1.4fr,0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Maintenance plans</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-cafe-navy">Plans for every size of cafe and gear stack.</h2>
              <p className="mt-4 text-base leading-7 text-cafe-steel">
                Choose a plan that matches your service needs, with convenient monthly billing and priority support for routine upkeep.
              </p>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-[#D4D8DC] bg-[#F5F7FA] p-6">
                <p className="text-sm font-semibold text-cafe-navy">Basic Plan</p>
                <p className="mt-2 text-sm text-cafe-steel">Perfect for small shops that need dependable monthly maintenance.</p>
              </div>
              <div className="rounded-3xl border border-[#D4D8DC] bg-[#F5F7FA] p-6">
                <p className="text-sm font-semibold text-cafe-navy">Standard Plan</p>
                <p className="mt-2 text-sm text-cafe-steel">A balanced plan for regular maintenance and ongoing support.</p>
              </div>
              <div className="rounded-3xl border border-[#D4D8DC] bg-[#F5F7FA] p-6">
                <p className="text-sm font-semibold text-cafe-navy">Premium Plan</p>
                <p className="mt-2 text-sm text-cafe-steel">Priority response and full coverage for busy or multi-location cafes.</p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full bg-cafe-bronze px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#a0632b]"
            >
              Explore Pricing
            </Link>
            <p className="text-sm text-cafe-steel">Start with a plan that keeps your equipment running at peak performance.</p>
          </div>
        </div>
      </section>

      <section className="bg-cafe-navy text-cafe-silver px-6 py-14 sm:py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cafe-bronze">Contact Cafe Works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Ready to schedule your service?</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#A8B8C8]">
              Reach out for a free inspection estimate, rapid repair booking, or help choosing the right maintenance plan for your equipment.
            </p>
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-cafe-navy/80 p-8 shadow-2xl shadow-black/20">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cafe-bronze">Phone</p>
              <p className="mt-3 text-xl font-semibold text-white">(555) 012-3456</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cafe-bronze">Email</p>
              <p className="mt-3 text-xl font-semibold text-white">hello@cafeworks.com</p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
