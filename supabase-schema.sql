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
