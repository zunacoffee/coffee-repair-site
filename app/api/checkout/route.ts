import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripe = new Stripe(stripeSecretKey)

const plans: Record<string, { priceId: string }> = {
  basic:    { priceId: 'price_1TgrMlE3Rmn8MdLHoWctHAtV' },
  standard: { priceId: 'price_1TgrNZE3Rmn8MdLHPr9a8XHH' },
  premium:  { priceId: 'price_1TgrNvE3Rmn8MdLHLxWzzXdp' },
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { planId?: string }
  const plan = body.planId ? plans[body.planId] : undefined

  if (!plan) {
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
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/pricing`,
    })

    return NextResponse.json({ url: session.url ?? null })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Unable to create checkout session.' },
      { status: 500 },
    )
  }
}
