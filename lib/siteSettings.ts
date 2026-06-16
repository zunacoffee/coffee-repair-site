import { supabaseAdmin } from './supabaseAdmin'

export const SETTING_DEFAULTS: Record<string, string> = {
  // Business Info
  business_name:               'Cafe Works',
  phone:                       '',
  email:                       '',
  address:                     '',
  business_hours:              'Mon-Fri 8am-5pm',
  emergency_phone:             '',
  // Notifications
  notify_email:                '',
  notify_new_service_request:  'true',
  notify_new_customer:         'true',
  notify_low_stock:            'true',
  notify_invoice_paid:         'true',
  notify_work_order_completed: 'true',
  // Labor Rates
  labor_rate_weekday:          '80',
  labor_rate_weekend:          '120',
  // Parts
  parts_markup_pct:            '30',
  parts_low_stock_threshold:   '1',
  // Scheduling
  max_bookings_per_day:        '2',
  morning_slot_start:          '08:00',
  morning_slot_end:            '12:00',
  afternoon_slot_start:        '12:00',
  afternoon_slot_end:          '17:00',
  emergency_weekends:          'false',
  // Branding
  public_business_name:        'Cafe Works',
  logo_url:                    '',
  // Billing
  tax_rate:                    '0',
  invoice_due_days:            '0',
  invoice_footer_notes:        '',
  online_payments_enabled:     'true',
  // Service Area / Booking
  service_area:                '',
  booking_advance_days:        '0',
}

export type SiteSettings = Record<string, string>

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data } = await supabaseAdmin.from('site_settings').select('key, value')
    const result = { ...SETTING_DEFAULTS }
    for (const row of (data ?? [])) result[row.key] = row.value
    return result
  } catch {
    return { ...SETTING_DEFAULTS }
  }
}

export function getBool(s: SiteSettings, key: string): boolean {
  return (s[key] ?? SETTING_DEFAULTS[key]) === 'true'
}

export function getNum(s: SiteSettings, key: string): number {
  return Number(s[key] ?? SETTING_DEFAULTS[key]) || 0
}
