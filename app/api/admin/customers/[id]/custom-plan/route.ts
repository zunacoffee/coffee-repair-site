import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../../lib/adminAuth'
import { getSiteSettings } from '../../../../../../lib/siteSettings'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customerId = parseInt(id, 10)
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: 'Invalid customer id.' }, { status: 400 })
  }

  let body: {
    plan_name?: string
    description?: string
    price?: number
    visit_frequency?: number | null
    features?: string[]
    notes?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { plan_name, description, price, visit_frequency, features, notes } = body

  if (!plan_name?.trim()) {
    return NextResponse.json({ error: 'Plan name is required.' }, { status: 400 })
  }
  if (price == null || Number.isNaN(Number(price)) || Number(price) < 0.50) {
    return NextResponse.json({ error: 'Price must be at least $0.50.' }, { status: 400 })
  }

  const { data: customer, error: custError } = await supabaseAdmin
    .from('customers')
    .select('id, full_name, email')
    .eq('id', customerId)
    .maybeSingle()

  if (custError || !customer) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
  }

  try {
    const settings = await getSiteSettings()
    const businessName = settings.public_business_name || 'Cafe Works'
    const origin = new URL(req.url).origin

    const product = await stripe.products.create({
      name: plan_name.trim(),
      description: description?.trim() || undefined,
      metadata: {
        customer_id: String(customerId),
        customer_name: customer.full_name,
        customer_email: customer.email,
        is_custom: 'true',
      },
    })

    const stripePrice = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: Math.round(Number(price) * 100),
      recurring: { interval: 'month' },
    })

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${origin}/dashboard` },
      },
    })

    const { data: plan, error: planError } = await supabaseAdmin
      .from('maintenance_plans')
      .insert([{
        customer_id: customerId,
        plan_name: plan_name.trim(),
        description: description?.trim() || null,
        status: 'pending_payment',
        price: Number(price),
        visit_frequency: visit_frequency ?? null,
        features: features ?? [],
        notes: notes?.trim() || null,
        is_custom: true,
        stripe_product_id: product.id,
        stripe_price_id: stripePrice.id,
        stripe_payment_link: paymentLink.url,
      }])
      .select()
      .maybeSingle()

    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 })
    }

    const featureItems = (features ?? [])
      .filter(Boolean)
      .map((f) => `<li style="margin:4px 0;color:#374151;">• ${f}</li>`)
      .join('')

    await resend.emails.send({
      from: `${businessName} <onboarding@resend.dev>`,
      to: customer.email,
      subject: `Your custom maintenance plan is ready — ${plan_name.trim()}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0D1B2A;">
          <h2 style="color:#0D1B2A;margin:0 0 16px;">Hi ${customer.full_name},</h2>
          <p style="margin:0 0 20px;color:#374151;line-height:1.6;">
            We've put together a custom maintenance plan just for you.
            Click the button below to activate it — it only takes a moment.
          </p>
          <div style="background:#E8ECF0;border-radius:12px;padding:24px;margin:0 0 28px;">
            <h3 style="margin:0 0 6px;color:#0D1B2A;font-size:18px;">${plan_name.trim()}</h3>
            ${description ? `<p style="color:#7A8898;margin:0 0 16px;font-size:14px;">${description.trim()}</p>` : ''}
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:5px 0;color:#7A8898;">Monthly price</td>
                <td style="padding:5px 0;color:#0D1B2A;font-weight:700;text-align:right;">$${Number(price).toFixed(2)}/mo</td>
              </tr>
              ${visit_frequency ? `
              <tr>
                <td style="padding:5px 0;color:#7A8898;">Visits per month</td>
                <td style="padding:5px 0;color:#0D1B2A;font-weight:700;text-align:right;">${visit_frequency}</td>
              </tr>` : ''}
            </table>
            ${featureItems ? `<ul style="margin:16px 0 0;padding:0;list-style:none;">${featureItems}</ul>` : ''}
          </div>
          <a href="${paymentLink.url}"
             style="display:inline-block;background:#B87333;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 28px;">
            Activate My Plan →
          </a>
          ${notes ? `<p style="color:#7A8898;font-size:13px;border-top:1px solid #E8ECF0;padding-top:20px;margin:0 0 16px;">${notes.trim()}</p>` : ''}
          <p style="color:#7A8898;font-size:13px;margin:0;">
            Questions? Reply to this email and we'll be happy to help.
          </p>
        </div>
      `,
    }).catch(() => {})

    return NextResponse.json({ plan })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create custom plan.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
