import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

export async function POST(req: NextRequest) {
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing Stripe environment variables' },
      { status: 500 }
    )
  }

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not initialized' },
      { status: 500 }
    )
  }

  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const validatedWebhookSecret = webhookSecret
  let event: Stripe.Event

  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, validatedWebhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get subscription details to find the price and plan type
        if (session.subscription) {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id

          const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription

          // Determine plan type based on amount
          const priceAmount = subscription.items.data[0]?.price?.unit_amount

          let planName = 'Standard Plan'
          if (priceAmount === 2900) planName = 'Basic Plan'
          else if (priceAmount === 5900) planName = 'Standard Plan'
          else if (priceAmount === 9900) planName = 'Premium Plan'

          // Create maintenance plan record
          // Note: We need customer_id from the session metadata or we need to associate it differently
          // For now, we'll store the subscription ID and stripe customer ID for reference
          const renewalDate = new Date(
            ((subscription as unknown as Record<string, unknown>).current_period_end as number) * 1000
          ).toISOString()

          const { error } = await supabaseAdmin.from('maintenance_plans').insert([
            {
              plan_name: planName,
              status: 'active',
              price: (priceAmount ?? 5900) / 100, // Convert to dollars
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: subscription.customer as string,
              renewal_date: renewalDate,
            },
          ])

          if (error) {
            console.error('Error creating maintenance plan:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Update maintenance plan status
        const renewalDate = new Date(
          ((subscription as unknown as Record<string, unknown>).current_period_end as number) * 1000
        ).toISOString()

        const { error } = await supabaseAdmin
          .from('maintenance_plans')
          .update({
            status: subscription.status === 'active' ? 'active' : 'paused',
            renewal_date: renewalDate,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating maintenance plan:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Set plan status to cancelled
        const { error } = await supabaseAdmin
          .from('maintenance_plans')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error cancelling maintenance plan:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        break
      }

      default:
        // Unhandled event type
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook processing error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
