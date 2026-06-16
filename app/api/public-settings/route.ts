import { NextResponse } from 'next/server'
import { getSiteSettings } from '../../../lib/siteSettings'

const PUBLIC_KEYS = ['public_business_name', 'phone', 'email', 'address', 'business_hours', 'service_area', 'booking_advance_days']

export async function GET() {
  const settings = await getSiteSettings()
  const pub: Record<string, string> = {}
  for (const key of PUBLIC_KEYS) pub[key] = settings[key] ?? ''
  return NextResponse.json({ settings: pub })
}
