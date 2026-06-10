-- Supabase schema for the new equipment_list table
-- Run this SQL in your Supabase SQL editor to create the table.

CREATE TABLE IF NOT EXISTS equipment_list (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS equipment_list_customer_id_idx ON equipment_list(customer_id);

-- Add notes and completed_at to repair_jobs (if not already present)
-- ALTER TABLE repair_jobs ADD COLUMN notes TEXT;
-- ALTER TABLE repair_jobs ADD COLUMN completed_at TIMESTAMPTZ;

-- Add Stripe integration columns to maintenance_plans (if not already present)
-- Run these ALTER TABLE statements if the columns don't exist:
-- ALTER TABLE maintenance_plans ADD COLUMN stripe_subscription_id TEXT;
-- ALTER TABLE maintenance_plans ADD COLUMN stripe_customer_id TEXT;
-- CREATE INDEX IF NOT EXISTS maintenance_plans_stripe_subscription_id_idx ON maintenance_plans(stripe_subscription_id);

-- Service requests table (public form submissions, no auth required)
CREATE TABLE IF NOT EXISTS service_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  contact_preference TEXT NOT NULL CHECK (contact_preference IN ('email', 'phone')),
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow public inserts (no auth required for the form)
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a service request"
  ON service_requests FOR INSERT
  WITH CHECK (true);
