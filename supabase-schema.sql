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

-- Scheduling fields for repair_jobs (run these if adding calendar scheduling)
-- ALTER TABLE repair_jobs ADD COLUMN IF NOT EXISTS scheduled_date DATE;
-- ALTER TABLE repair_jobs ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
-- CHECK (priority IN ('normal', 'emergency'))
-- After adding scheduled_date, the calendar will use it instead of created_at.

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

-- ─── Invoicing & Parts Inventory ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parts_inventory (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             TEXT NOT NULL,
  part_number      TEXT,
  cost_price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  sell_price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity         INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_number       TEXT NOT NULL UNIQUE,
  customer_id          BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  repair_job_id        BIGINT REFERENCES repair_jobs(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','sent','paid')),
  subtotal             DECIMAL(10,2) NOT NULL DEFAULT 0,
  total                DECIMAL(10,2) NOT NULL DEFAULT 0,
  stripe_payment_link  TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx       ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id  BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('labor','part')),
  description TEXT NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total       DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_id_idx ON invoice_line_items(invoice_id);

-- ─── Scheduling & Availability System ───────────────────────────────────────

-- Dates blocked by admin (customers cannot book these)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date       DATE NOT NULL UNIQUE,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add scheduling fields to service_requests
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS time_slot TEXT CHECK (time_slot IN ('morning', 'afternoon'));
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add scheduling/notes fields to maintenance_plans
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS next_visit_date DATE;
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS next_visit_slot TEXT CHECK (next_visit_slot IN ('morning', 'afternoon'));
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes to repair_jobs
ALTER TABLE repair_jobs ADD COLUMN IF NOT EXISTS notes TEXT;
