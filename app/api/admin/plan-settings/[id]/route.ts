import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  // Fetch current plan
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('plan_settings')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.name        !== undefined) updates.name        = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.features    !== undefined) updates.features    = body.features
  if (body.is_active   !== undefined) updates.is_active   = body.is_active

  // Price change: create new Stripe price, archive old one
  if (body.price !== undefined && Number(body.price) !== Number(current.price)) {
    const newPrice = Number(body.price)
    if (isNaN(newPrice) || newPrice <= 0) {
      return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 })
    }

    try {
      const stripe = getStripe()

      // Create new price on the same product
      const stripePrice = await stripe.prices.create({
        currency:    'usd',
        unit_amount: Math.round(newPrice * 100),
        recurring:   { interval: 'month' },
        product:     current.stripe_product_id,
        metadata:    { plan_key: current.plan_key },
      })

      // Archive old price
      if (current.stripe_price_id) {
        await stripe.prices.update(current.stripe_price_id, { active: false }).catch(() => {
          // Non-fatal: old price may already be archived or missing
        })
      }

      updates.price           = newPrice
      updates.stripe_price_id = stripePrice.id
    } catch (err) {
      return NextResponse.json(
        { error: `Stripe error: ${(err as Error).message}` },
        { status: 500 },
      )
    }
  } else if (body.price !== undefined) {
    updates.price = Number(body.price)
  }

  const { data, error } = await supabaseAdmin
    .from('plan_settings')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
}
