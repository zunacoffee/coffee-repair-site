import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getSiteSettings, getBool } from '../../../lib/siteSettings'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripe = new Stripe(stripeSecretKey)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!token) {
    return NextResponse.json({ error: 'Please log in to subscribe to a plan.' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Please log in to subscribe to a plan.' }, { status: 401 })
  }

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, email')
    .eq('email', user.email)
    .maybeSingle()

  if (!customer) {
    return NextResponse.json(
      { error: "Your login hasn't been linked to a customer record yet. Contact us to complete your setup." },
      { status: 400 },
    )
  }

  const body = (await req.json()) as { planId?: string }

  if (!body.planId) {
    return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 })
  }

  const settings = await getSiteSettings()
  if (!getBool(settings, 'online_payments_enabled')) {
    return NextResponse.json({ error: 'Online payments are currently unavailable. Please contact us to sign up.' }, { status: 400 })
  }

  // Look up live price from plan_settings
  const { data: plan } = await supabaseAdmin
    .from('plan_settings')
    .select('stripe_price_id, is_active')
    .eq('plan_key', body.planId)
    .single()

  if (!plan?.is_active || !plan.stripe_price_id) {
    return NextResponse.json(
      { error: 'Invalid plan selected. Please choose a valid maintenance plan.' },
      { status: 400 },
    )
  }

  try {
    const origin = new URL(req.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/pricing`,
      metadata: { customer_id: String(customer.id) },
      subscription_data: { metadata: { customer_id: String(customer.id) } },
    })

    return NextResponse.json({ url: session.url ?? null })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Unable to create checkout session.' },
      { status: 500 },
    )
  }
}
