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

-- ── Work Orders ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_orders (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_order_number   TEXT NOT NULL UNIQUE,
  customer_id         BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  equipment_id        BIGINT REFERENCES equipment_list(id) ON DELETE SET NULL,
  problem_description TEXT NOT NULL,
  technician_notes    TEXT,
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  labor_hours         NUMERIC(6,2) NOT NULL DEFAULT 0,
  labor_type          TEXT NOT NULL DEFAULT 'weekday'
                        CHECK (labor_type IN ('weekday', 'weekend')),
  labor_total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  parts_total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  grand_total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS work_order_parts (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_order_id  BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id        BIGINT NOT NULL REFERENCES parts_inventory(id) ON DELETE RESTRICT,
  quantity_used  INT NOT NULL DEFAULT 1,
  unit_price     NUMERIC(10,2) NOT NULL,
  total          NUMERIC(10,2) NOT NULL
);

-- ── Plan Settings ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_settings (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_key          TEXT NOT NULL UNIQUE CHECK (plan_key IN ('basic', 'standard', 'premium')),
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  price             NUMERIC(10,2) NOT NULL,
  features          JSONB NOT NULL DEFAULT '[]',
  stripe_price_id   TEXT NOT NULL DEFAULT '',
  stripe_product_id TEXT NOT NULL DEFAULT '',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-populate with current plans (idempotent)
INSERT INTO plan_settings (plan_key, name, description, price, features, stripe_price_id, stripe_product_id, is_active)
VALUES
  (
    'basic',
    'Basic Plan',
    'Monthly maintenance for light coffee equipment.',
    29.00,
    '["1 service visit / month","Standard inspection","Priority scheduling"]',
    'price_1TgrMlE3Rmn8MdLHoWctHAtV',
    'prod_UgDosB5M7lSejM',
    TRUE
  ),
  (
    'standard',
    'Standard Plan',
    'Regular maintenance for most coffee repair needs.',
    59.00,
    '["2 service visits / month","Detailed inspection","Parts diagnostics"]',
    'price_1TgrNZE3Rmn8MdLHPr9a8XHH',
    '',
    TRUE
  ),
  (
    'premium',
    'Premium Plan',
    'Full coverage with priority service and support.',
    99.00,
    '["Unlimited service visits","Priority response","Dedicated support line"]',
    'price_1TgrNvE3Rmn8MdLHLxWzzXdp',
    '',
    TRUE
  )
ON CONFLICT (plan_key) DO NOTHING;

-- ── Site Settings ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_settings (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed defaults (idempotent)
INSERT INTO site_settings (key, value) VALUES
  ('business_name',               'Cafe Works'),
  ('phone',                       ''),
  ('email',                       ''),
  ('address',                     ''),
  ('business_hours',              'Mon-Fri 8am-5pm'),
  ('emergency_phone',             ''),
  ('notify_email',                'tyson@zunacoffee.com'),
  ('notify_new_service_request',  'true'),
  ('notify_new_customer',         'true'),
  ('notify_low_stock',            'true'),
  ('notify_invoice_paid',         'true'),
  ('notify_work_order_completed', 'true'),
  ('labor_rate_weekday',          '80'),
  ('labor_rate_weekend',          '120'),
  ('parts_markup_pct',            '30'),
  ('parts_low_stock_threshold',   '1'),
  ('max_bookings_per_day',        '2'),
  ('morning_slot_start',          '08:00'),
  ('morning_slot_end',            '12:00'),
  ('afternoon_slot_start',        '12:00'),
  ('afternoon_slot_end',          '17:00'),
  ('emergency_weekends',          'false'),
  ('public_business_name',        'Cafe Works'),
  ('logo_url',                    '')
ON CONFLICT (key) DO NOTHING;
