import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'
import { getSiteSettings, getNum } from '../../../../lib/siteSettings'

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('work_orders')
    .select(`
      id, work_order_number, status, labor_hours, labor_type,
      labor_total, parts_total, grand_total, created_at, completed_at,
      problem_description,
      customers(id, full_name, email),
      equipment_list(id, equipment_type, brand, model)
    `)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ workOrders: data })
}

export async function POST(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    customer_id: number
    equipment_id?: number | null
    problem_description: string
    labor_type?: 'weekday' | 'weekend'
    labor_hours?: number
    parts?: { part_id: number; quantity_used: number }[]
  }

  if (!body.customer_id || !body.problem_description?.trim()) {
    return NextResponse.json({ error: 'customer_id and problem_description are required.' }, { status: 400 })
  }

  const settings = await getSiteSettings()
  const WEEKDAY_RATE = getNum(settings, 'labor_rate_weekday')
  const WEEKEND_RATE = getNum(settings, 'labor_rate_weekend')

  // Generate WO number
  const { data: lastWO } = await supabaseAdmin
    .from('work_orders')
    .select('work_order_number')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextNum = 1
  if (lastWO?.work_order_number) {
    const match = lastWO.work_order_number.match(/WO-(\d+)/)
    if (match) nextNum = parseInt(match[1]) + 1
  }
  const workOrderNumber = `WO-${String(nextNum).padStart(4, '0')}`

  const laborType  = body.labor_type ?? 'weekday'
  const laborHours = Number(body.labor_hours ?? 0)
  const rate       = laborType === 'weekend' ? WEEKEND_RATE : WEEKDAY_RATE
  const laborTotal = Math.round(laborHours * rate * 100) / 100

  const { data: workOrder, error: woError } = await supabaseAdmin
    .from('work_orders')
    .insert([{
      work_order_number:   workOrderNumber,
      customer_id:         body.customer_id,
      equipment_id:        body.equipment_id ?? null,
      problem_description: body.problem_description.trim(),
      status:              'open',
      labor_type:          laborType,
      labor_hours:         laborHours,
      labor_total:         laborTotal,
      parts_total:         0,
      grand_total:         laborTotal,
    }])
    .select('id, work_order_number, status, created_at')
    .single()

  if (woError) return NextResponse.json({ error: woError.message }, { status: 500 })

  let partsTotal = 0
  if (body.parts && body.parts.length > 0) {
    for (const p of body.parts) {
      const { data: part } = await supabaseAdmin
        .from('parts_inventory')
        .select('id, sell_price, quantity')
        .eq('id', p.part_id)
        .maybeSingle()
      if (!part) continue

      const qty   = Math.max(1, p.quantity_used)
      const total = Math.round(Number(part.sell_price) * qty * 100) / 100
      partsTotal += total

      await supabaseAdmin.from('work_order_parts').insert([{
        work_order_id: workOrder.id,
        part_id:       p.part_id,
        quantity_used: qty,
        unit_price:    Number(part.sell_price),
        total,
      }])
      await supabaseAdmin
        .from('parts_inventory')
        .update({ quantity: Math.max(0, part.quantity - qty) })
        .eq('id', p.part_id)
    }

    if (partsTotal > 0) {
      await supabaseAdmin
        .from('work_orders')
        .update({ parts_total: partsTotal, grand_total: Math.round((laborTotal + partsTotal) * 100) / 100 })
        .eq('id', workOrder.id)
    }
  }

  return NextResponse.json({ workOrder }, { status: 201 })
}
