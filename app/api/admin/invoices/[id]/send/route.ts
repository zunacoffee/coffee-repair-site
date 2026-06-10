import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../../lib/adminAuth'

function fmt(n: number) { return `$${n.toFixed(2)}` }

function buildEmailHtml(opts: {
  invoice_number: string
  customer_name: string
  date: string
  lineItems: { description: string; quantity: number; unit_price: number; total: number }[]
  total: number
  notes: string | null
  payment_link: string
}) {
  const rows = opts.lineItems.map((li) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #E8ECF0;color:#0D1B2A">${li.description}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #E8ECF0;text-align:right;color:#7A8898">${li.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #E8ECF0;text-align:right;color:#7A8898">${fmt(li.unit_price)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #E8ECF0;text-align:right;font-weight:600;color:#0D1B2A">${fmt(li.total)}</td>
    </tr>`).join('')

  const notesHtml = opts.notes
    ? `<p style="margin-top:24px;padding:16px;background:#F4F6F9;border-radius:8px;font-size:14px;color:#7A8898"><strong>Note:</strong> ${opts.notes}</p>`
    : ''

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F6F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#0D1B2A;padding:24px 32px;border-radius:12px 12px 0 0">
    <span style="color:white;font-size:20px;font-weight:700">Cafe</span><span style="color:#B87333;font-size:20px;font-weight:700"> Works</span>
    <p style="color:#7A8898;margin:4px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Equipment Repair & Maintenance</p>
  </div>
  <div style="background:white;padding:32px;border:1px solid #E8ECF0;border-top:none">
    <div style="display:flex;justify-content:space-between;margin-bottom:28px">
      <div>
        <p style="margin:0;font-size:12px;color:#7A8898;text-transform:uppercase;letter-spacing:.08em">Invoice</p>
        <p style="margin:4px 0 0;font-size:26px;font-weight:700;color:#0D1B2A">${opts.invoice_number}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-size:12px;color:#7A8898">Date</p>
        <p style="margin:4px 0 0;font-weight:600;color:#0D1B2A">${opts.date}</p>
      </div>
    </div>
    <p style="color:#0D1B2A;margin:0">Hi ${opts.customer_name},</p>
    <p style="color:#7A8898;margin:8px 0 24px">Please find your invoice below. Click the button to pay securely online.</p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:2px solid #0D1B2A">
          <th style="text-align:left;padding:8px 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7A8898">Description</th>
          <th style="text-align:right;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7A8898">Qty</th>
          <th style="text-align:right;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7A8898">Unit Price</th>
          <th style="text-align:right;padding:8px 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7A8898">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:20px 0 4px;text-align:right;font-size:14px;font-weight:600;color:#0D1B2A">Total Due</td>
          <td style="padding:20px 0 4px;text-align:right;font-size:22px;font-weight:700;color:#B87333">${fmt(opts.total)}</td>
        </tr>
      </tfoot>
    </table>
    ${notesHtml}
    <div style="margin-top:36px;text-align:center">
      <a href="${opts.payment_link}" style="display:inline-block;background:#B87333;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700">
        Pay Now — ${fmt(opts.total)}
      </a>
      <p style="margin-top:10px;font-size:12px;color:#7A8898">Secure payment powered by Stripe</p>
    </div>
  </div>
  <div style="background:#E8ECF0;padding:16px;border-radius:0 0 12px 12px;text-align:center">
    <p style="margin:0;font-size:12px;color:#7A8898">Cafe Works · Professional Coffee Equipment Service</p>
  </div>
</div>
</body></html>`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  // Fetch invoice + customer + line items
  const [invoiceRes, lineItemsRes] = await Promise.all([
    supabaseAdmin
      .from('invoices')
      .select('*, customers(id, full_name, email)')
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .order('id'),
  ])

  if (invoiceRes.error || !invoiceRes.data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const invoice   = invoiceRes.data
  const lineItems = lineItemsRes.data ?? []
  const customer  = (invoice.customers as { id: number; full_name: string; email: string } | null)

  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
  }

  let paymentLinkUrl = invoice.stripe_payment_link as string | null

  // Create Stripe Payment Link if not already created
  if (!paymentLinkUrl && process.env.STRIPE_SECRET_KEY && invoice.total > 0) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const product = await stripe.products.create({
        name: `Invoice ${invoice.invoice_number}`,
        metadata: { invoice_number: invoice.invoice_number },
      })
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(Number(invoice.total) * 100),
        currency: 'usd',
      })
      const link = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { invoice_number: invoice.invoice_number },
        after_completion: {
          type: 'hosted_confirmation',
          hosted_confirmation: { custom_message: 'Payment received. Thank you for choosing Cafe Works!' },
        },
      })
      paymentLinkUrl = link.url
    } catch (err) {
      console.error('Stripe payment link error:', err)
      // Continue without payment link — still mark sent and email if possible
    }
  }

  // Update invoice status → sent
  const { error: updateError } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'sent',
      stripe_payment_link: paymentLinkUrl ?? null,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send email to customer
  if (process.env.RESEND_API_KEY && customer?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const date = new Date(invoice.created_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
    const html = buildEmailHtml({
      invoice_number: invoice.invoice_number,
      customer_name:  customer.full_name,
      date,
      lineItems: lineItems.map((li) => ({
        description: li.description,
        quantity:    Number(li.quantity),
        unit_price:  Number(li.unit_price),
        total:       Number(li.total),
      })),
      total:        Number(invoice.total),
      notes:        invoice.notes ?? null,
      payment_link: paymentLinkUrl ?? '#',
    })
    await resend.emails.send({
      from:    'Cafe Works <onboarding@resend.dev>',
      to:      customer.email,
      subject: `Invoice ${invoice.invoice_number} from Cafe Works — ${fmt(Number(invoice.total))} due`,
      html,
    }).catch((err: unknown) => console.error('Resend invoice email error:', err))
  }

  return NextResponse.json({ success: true, stripe_payment_link: paymentLinkUrl })
}
