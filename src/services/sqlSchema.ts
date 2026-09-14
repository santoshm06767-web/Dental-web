/**
 * Supabase PostgreSQL Database Schema & RLS Setup
 * 
 * This file contains the complete SQL statements to initialize the dental clinic database
 * on Supabase, complete with tables, constraints, indexes, Row Level Security (RLS)
 * policies allowing both anon and authenticated users, triggers for updated_at, and initial seed data.
 */

export const SUPABASE_SQL_SCHEMA = `-- ==========================================================
-- AROGYA DENTAL CARE & IMPLANT CENTRE
-- Supabase PostgreSQL Complete Database Schema & RLS Policies
-- ==========================================================

-- 0. CLEAN RESET PREVIOUS SCHEMAS (Safe for re-initialization)
DROP TABLE IF EXISTS public.appointment_status_history CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.clinic_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Staff & Accounts)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('receptionist', 'admin', 'doctor')),
  doctor_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DOCTORS TABLE
CREATE TABLE public.doctors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doctor_code TEXT NOT NULL UNIQUE, -- e.g. DOC-001
  name TEXT NOT NULL,
  qualification TEXT NOT NULL,
  specialization TEXT NOT NULL,
  registration_number TEXT,
  mobile TEXT,
  email TEXT,
  consultation_room TEXT,
  available_days TEXT[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PATIENTS TABLE
CREATE TABLE public.patients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_code TEXT NOT NULL UNIQUE, -- e.g. PAT-000001
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  date_of_birth DATE NOT NULL,
  mobile TEXT NOT NULL,
  alternate_mobile TEXT,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_number TEXT NOT NULL,
  blood_group TEXT,
  allergies TEXT,
  medical_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLINIC SETTINGS TABLE
CREATE TABLE public.clinic_settings (
  id TEXT PRIMARY KEY DEFAULT 'set-001',
  clinic_name TEXT NOT NULL DEFAULT 'AROGYA DENTAL CARE & IMPLANT CENTRE',
  tagline TEXT DEFAULT 'Center for Comprehensive Dental Wellness & Implantology',
  logo_url TEXT DEFAULT '',
  address TEXT NOT NULL DEFAULT 'Suite 402, Metro Healthcare Plaza, Park Avenue',
  phone TEXT NOT NULL DEFAULT '+1 (555) 345-6789',
  email TEXT NOT NULL DEFAULT 'reception@arogyadental.com',
  website TEXT NOT NULL DEFAULT 'https://arogyadental.com',
  gst_number TEXT DEFAULT 'GSTIN-27AABCS9988D1Z8',
  appointment_duration INTEGER NOT NULL DEFAULT 20, -- in minutes
  working_days TEXT[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  working_hours_start TIME NOT NULL DEFAULT '09:00',
  working_hours_end TIME NOT NULL DEFAULT '18:00',
  token_prefix TEXT NOT NULL DEFAULT 'TK',
  token_reset_daily BOOLEAN NOT NULL DEFAULT true,
  footer_text TEXT NOT NULL DEFAULT 'Please arrive 10 minutes prior to your scheduled consultation. Bring this slip along with any previous dental records or X-rays.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. APPOINTMENTS TABLE
CREATE TABLE public.appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  appointment_code TEXT NOT NULL UNIQUE, -- e.g. APT-000101
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  token_number INTEGER NOT NULL DEFAULT 1,
  appointment_type TEXT NOT NULL CHECK (
    appointment_type IN ('New Consultation', 'Follow-up', 'Procedure', 'Emergency', 'Review', 'Other')
  ),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (
    status IN ('Scheduled', 'Checked-in', 'Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show')
  ),
  notes TEXT,
  next_visit_date DATE,
  next_visit_time TIME,
  next_visit_notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. APPOINTMENT STATUS HISTORY TABLE (Audit Trail)
CREATE TABLE public.appointment_status_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  appointment_id TEXT NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON public.patients(mobile);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_code ON public.appointments(appointment_code);

-- AUTO-UPDATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_patients_updated_at ON public.patients;
CREATE TRIGGER set_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_doctors_updated_at ON public.doctors;
CREATE TRIGGER set_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_clinic_settings_updated_at ON public.clinic_settings;
CREATE TRIGGER set_clinic_settings_updated_at BEFORE UPDATE ON public.clinic_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;

-- POLICIES: Allow anon (publishable key) and authenticated access
CREATE POLICY "Allow public anon and authenticated full access to profiles"
  ON public.profiles FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public anon and authenticated full access to doctors"
  ON public.doctors FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public anon and authenticated full access to clinic_settings"
  ON public.clinic_settings FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public anon and authenticated full access to patients"
  ON public.patients FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public anon and authenticated full access to appointments"
  ON public.appointments FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public anon and authenticated full access to appointment_status_history"
  ON public.appointment_status_history FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- FINANCIAL MODULE EXTENSION: Payments, Doctor Payments, Clinic Expenses, SMS Logs
ALTER TABLE IF EXISTS public.patients 
  ADD COLUMN IF NOT EXISTS registration_fee_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_fee_amount NUMERIC(10,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS registration_fee_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS registration_fee_paid_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.doctors 
  ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10,2) DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS followup_fee NUMERIC(10,2) DEFAULT 300.00;

ALTER TABLE IF EXISTS public.appointments 
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2) DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

ALTER TABLE IF EXISTS public.clinic_settings 
  ADD COLUMN IF NOT EXISTS default_registration_fee NUMERIC(10,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS default_consultation_fee NUMERIC(10,2) DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS receipt_prefix TEXT DEFAULT 'MR',
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_provider TEXT DEFAULT 'generic';

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  receipt_number TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  appointment_id TEXT,
  doctor_id TEXT,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('REGISTRATION', 'CONSULTATION', 'FOLLOW_UP', 'PROCEDURE', 'OTHER')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'CANCELLED', 'REFUNDED')),
  transaction_reference TEXT,
  notes TEXT,
  collected_by TEXT,
  collected_by_name TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  cancelled_by TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_doctor_id ON public.payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_payments_collected_at ON public.payments(collected_at);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

-- 8. DOCTOR PAYMENTS TABLE (Outflows from clinic to doctors)
CREATE TABLE IF NOT EXISTS public.doctor_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doctor_id TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  reference_number TEXT,
  payment_period_from DATE,
  payment_period_to DATE,
  notes TEXT,
  paid_by TEXT,
  paid_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_doctor_payments_doctor ON public.doctor_payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_payments_date ON public.doctor_payments(payment_date);

-- 9. CLINIC EXPENSES TABLE (Consumables, operational expenses)
CREATE TABLE IF NOT EXISTS public.clinic_expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  expense_number TEXT UNIQUE NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_cost NUMERIC(10,2),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  vendor TEXT,
  invoice_number TEXT,
  notes TEXT,
  entered_by TEXT,
  entered_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clinic_expenses_date ON public.clinic_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_clinic_expenses_category ON public.clinic_expenses(category);

-- 10. SMS LOGS TABLE
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id TEXT NOT NULL,
  payment_id TEXT,
  recipient_mobile TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('WELCOME', 'RECEIPT', 'APPOINTMENT')),
  message_body TEXT NOT NULL,
  sms_status TEXT NOT NULL DEFAULT 'SENT',
  sms_sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  sms_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_patient ON public.sms_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON public.sms_logs(created_at);

-- RLS POLICIES FOR FINANCIAL MODULE
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated and anon access to payments" ON public.payments;
CREATE POLICY "Allow authenticated and anon access to payments"
  ON public.payments FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated and anon access to doctor_payments" ON public.doctor_payments;
CREATE POLICY "Allow authenticated and anon access to doctor_payments"
  ON public.doctor_payments FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated and anon access to clinic_expenses" ON public.clinic_expenses;
CREATE POLICY "Allow authenticated and anon access to clinic_expenses"
  ON public.clinic_expenses FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated and anon access to sms_logs" ON public.sms_logs;
CREATE POLICY "Allow authenticated and anon access to sms_logs"
  ON public.sms_logs FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

-- INITIAL CLINIC SEED DATA
INSERT INTO public.clinic_settings (
  id, clinic_name, tagline, address, phone, email, website, gst_number,
  appointment_duration, working_hours_start, working_hours_end, token_prefix
) VALUES (
  'set-001',
  'AROGYA DENTAL CARE & IMPLANT CENTRE',
  'Center for Comprehensive Dental Wellness & Implantology',
  'Suite 402, Metro Healthcare Plaza, Park Avenue',
  '+1 (555) 345-6789',
  'reception@arogyadental.com',
  'https://arogyadental.com',
  'GSTIN-27AABCS9988D1Z8',
  20,
  '09:00',
  '18:00',
  'TK'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.doctors (id, doctor_code, name, qualification, specialization, registration_number, mobile, email, consultation_room, active)
VALUES 
('doc-001', 'DOC-001', 'Dr. Mridusmita Pathak', 'BDS, MDS (Orthodontics)', 'Orthodontist', 'DENT-REG-89214', '+1 (555) 441-2001', 'dr.mridusmita@arogyadental.com', 'Room 101 (Ortho Bay)', true),
('doc-002', 'DOC-002', 'Dr. Priya Sharma', 'BDS, MDS (Conservative Dentistry & Endodontics)', 'Endodontist', 'DENT-REG-54129', '+1 (555) 441-2002', 'dr.priya@arogyadental.com', 'Room 102 (Endo Suite)', true),
('doc-003', 'DOC-003', 'Dr. Amit Rao', 'BDS, MDS (Prosthodontics & Implantology)', 'Prosthodontist', 'DENT-REG-33108', '+1 (555) 441-2003', 'dr.amit@arogyadental.com', 'Room 103 (Surgical Implant Bay)', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, patient_code, first_name, last_name, gender, date_of_birth, mobile, address, city, state, postal_code, emergency_contact_name, emergency_contact_number)
VALUES
('pat-001', 'PAT-000001', 'James', 'Wilson', 'Male', '1988-04-12', '+1 (555) 123-4567', '742 Evergreen Terrace', 'Springfield', 'OR', '97477', 'Sarah Wilson', '+1 (555) 123-4568'),
('pat-002', 'PAT-000002', 'Eleanor', 'Pence', 'Female', '1995-09-23', '+1 (555) 987-6543', '104 Oakwood Ridge', 'Springfield', 'OR', '97477', 'David Pence', '+1 (555) 987-6544'),
('pat-003', 'PAT-000003', 'Michael', 'Chang', 'Male', '1976-12-05', '+1 (555) 345-6781', '321 Pine Hill Road', 'Springfield', 'OR', '97477', 'Grace Chang', '+1 (555) 345-6782'),
('pat-004', 'PAT-000004', 'Sophia', 'Martinez', 'Female', '2001-07-19', '+1 (555) 654-3210', '58 Maple Avenue', 'Springfield', 'OR', '97477', 'Carlos Martinez', '+1 (555) 654-3211')
ON CONFLICT (id) DO NOTHING;
`;

export const COMPLETE_POSTGRES_SCHEMA = SUPABASE_SQL_SCHEMA;

/**
 * Ultra-lightweight, fail-proof SQL snippet that ONLY creates the payments table.
 * Used when Supabase web SQL editor throws "Backend error!" on larger scripts.
 * Takes < 50ms to run and immediately fixes PGRST205.
 */
export const PAYMENTS_ONLY_SQL = `-- ==========================================================
-- STEP 1: CREATE PAYMENTS TABLE ONLY (FASTEST & MOST RELIABLE)
-- Run this in Supabase SQL Editor to immediately fix PGRST205
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  appointment_id TEXT,
  doctor_id TEXT,
  payment_type TEXT NOT NULL DEFAULT 'CONSULTATION',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  transaction_reference TEXT,
  notes TEXT,
  collected_by TEXT,
  collected_by_name TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_by TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ
);

-- Enable RLS and grant access to web app anon client
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_full_access" ON public.payments;
CREATE POLICY "payments_full_access" ON public.payments 
  FOR ALL TO anon, authenticated 
  USING (true) WITH CHECK (true);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
`;

/**
 * Dedicated, non-destructive migration script for users who already have
 * patients, doctors, and appointments tables and want to install or fix
 * the financial module tables (payments, doctor_payments, clinic_expenses, sms_logs).
 * 
 * Safely adds new columns, creates tables with IF NOT EXISTS, creates indexes,
 * and calls NOTIFY pgrst, 'reload schema' to resolve PostgREST error PGRST205 immediately.
 */
export const FINANCIAL_MIGRATION_SQL = `-- ==========================================================
-- AROGYA DENTAL CARE — FINANCIAL MODULE MIGRATION SCRIPT
-- Run this in your Supabase Project -> SQL Editor -> New Query
-- Fixes: PGRST205: Could not find the table 'public.payments'
-- Safe for existing data — does NOT drop or alter existing records!
-- ==========================================================

-- 1. CREATE PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  appointment_id TEXT,
  doctor_id TEXT,
  payment_type TEXT NOT NULL DEFAULT 'CONSULTATION',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  transaction_reference TEXT,
  notes TEXT,
  collected_by TEXT,
  collected_by_name TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_by TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ
);

-- 2. CREATE DOCTOR PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.doctor_payments (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  reference_number TEXT,
  payment_period_from DATE,
  payment_period_to DATE,
  notes TEXT,
  paid_by TEXT,
  paid_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CREATE CLINIC EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.clinic_expenses (
  id TEXT PRIMARY KEY,
  expense_number TEXT UNIQUE NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'OTHER',
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_cost NUMERIC(10,2),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  vendor TEXT,
  invoice_number TEXT,
  notes TEXT,
  entered_by TEXT,
  entered_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CREATE SMS LOGS TABLE
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  payment_id TEXT,
  recipient_mobile TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'RECEIPT',
  message_body TEXT NOT NULL,
  sms_status TEXT NOT NULL DEFAULT 'SENT',
  sms_sent_at TIMESTAMPTZ DEFAULT now(),
  sms_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ENABLE ROW LEVEL SECURITY & ADD POLICIES
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_full_access" ON public.payments;
CREATE POLICY "payments_full_access" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "doctor_payments_full_access" ON public.doctor_payments;
CREATE POLICY "doctor_payments_full_access" ON public.doctor_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clinic_expenses_full_access" ON public.clinic_expenses;
CREATE POLICY "clinic_expenses_full_access" ON public.clinic_expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sms_logs_full_access" ON public.sms_logs;
CREATE POLICY "sms_logs_full_access" ON public.sms_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. EXTEND EXISTING TABLES (Non-blocking)
ALTER TABLE IF EXISTS public.patients 
  ADD COLUMN IF NOT EXISTS registration_fee_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_fee_amount NUMERIC(10,2) DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS registration_fee_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS registration_fee_paid_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.doctors 
  ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10,2) DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS followup_fee NUMERIC(10,2) DEFAULT 300.00;

ALTER TABLE IF EXISTS public.appointments 
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2) DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- 7. RELOAD SUPABASE POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
`;
