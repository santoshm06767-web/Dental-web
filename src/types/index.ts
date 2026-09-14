export type UserRole = 'receptionist' | 'admin' | 'doctor';

export type AppointmentType =
  | 'New Consultation'
  | 'Follow-up'
  | 'Procedure'
  | 'Emergency'
  | 'Review'
  | 'Other';

export type AppointmentStatus =
  | 'Scheduled'
  | 'Checked-in'
  | 'Waiting'
  | 'In Consultation'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  doctor_id?: string; // If role is doctor, links to specific doctor
  avatar_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  patient_code: string; // e.g. PAT-000001
  first_name: string;
  last_name: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth: string; // YYYY-MM-DD
  age?: number;
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  blood_group?: string;
  allergies?: string;
  medical_notes?: string;
  active: boolean;
  registration_fee_required?: boolean;
  registration_fee_paid?: boolean;
  registration_fee_amount?: number;
  registration_fee_payment_id?: string;
  registration_fee_paid_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  doctor_code: string; // e.g. DOC-001
  name: string;
  qualification: string;
  specialization: string;
  registration_number?: string;
  mobile?: string;
  email?: string;
  photo_url?: string;
  consultation_room?: string;
  available_days: string[]; // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  start_time: string; // e.g. "09:00"
  end_time: string; // e.g. "17:00"
  consultation_fee?: number;
  followup_fee?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  appointment_code: string; // e.g. APT-000101
  patient_id: string;
  doctor_id: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM (24h or 12h formatted)
  token_number: number; // Daily sequential queue token
  appointment_type: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  next_visit_date?: string;
  next_visit_time?: string;
  next_visit_notes?: string;
  fee_amount?: number;
  payment_status?: 'PAID' | 'UNPAID' | 'PARTIAL' | 'EXEMPT';
  payment_id?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;

  // Joined fields for UI convenience
  patient?: Patient;
  doctor?: Doctor;
}

export interface AppointmentStatusHistory {
  id: string;
  appointment_id: string;
  old_status: AppointmentStatus | null;
  new_status: AppointmentStatus;
  changed_by: string;
  changed_by_name?: string;
  changed_at: string;
  notes?: string;
}

export interface ClinicSettings {
  id: string;
  clinic_name: string;
  tagline?: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gst_number?: string;
  appointment_duration: number; // in minutes (e.g. 15, 30)
  working_days: string[];
  working_hours_start: string;
  working_hours_end: string;
  token_prefix: string; // e.g. "TK" or empty for pure numbers
  token_reset_daily: boolean;
  footer_text: string;
  default_registration_fee?: number;
  default_consultation_fee?: number;
  receipt_prefix?: string;
  sms_enabled?: boolean;
  sms_provider?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentType =
  | 'REGISTRATION'
  | 'CONSULTATION'
  | 'FOLLOW_UP'
  | 'PROCEDURE'
  | 'OTHER';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'OTHER';

export type PaymentStatus = 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface Payment {
  id: string;
  receipt_number: string; // e.g. MR-000001
  patient_id: string;
  appointment_id?: string;
  doctor_id?: string;
  payment_type: PaymentType;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_reference?: string; // UPI UTR or ref ID
  notes?: string;
  collected_by: string;
  collected_by_name?: string;
  collected_at: string;
  created_at: string;
  updated_at: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  cancelled_at?: string;

  // Joined relations
  patient?: Patient;
  doctor?: Doctor;
  appointment?: Appointment;
}

export type DoctorPaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CHEQUE'
  | 'OTHER';

export interface DoctorPayment {
  id: string;
  doctor_id: string;
  payment_date: string;
  amount: number;
  payment_method: DoctorPaymentMethod;
  reference_number?: string;
  payment_period_from?: string;
  payment_period_to?: string;
  notes?: string;
  paid_by: string;
  paid_by_name?: string;
  created_at: string;
  updated_at: string;

  doctor?: Doctor;
}

export type ClinicExpenseCategory =
  | 'Gloves'
  | 'Cotton'
  | 'Masks'
  | 'Dental Consumables'
  | 'Equipment'
  | 'Cleaning'
  | 'Stationery'
  | 'Other';

export interface ClinicExpense {
  id: string;
  expense_number: string; // e.g. EXP-000001
  expense_date: string;
  category: string;
  description: string;
  quantity?: number;
  unit_cost?: number;
  total_amount: number;
  payment_method: PaymentMethod;
  vendor?: string;
  invoice_number?: string;
  notes?: string;
  entered_by: string;
  entered_by_name?: string;
  created_at: string;
  updated_at: string;
}

export type SmsStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface SmsLog {
  id: string;
  patient_id: string;
  payment_id?: string;
  recipient_mobile: string;
  message_type: 'WELCOME' | 'RECEIPT' | 'APPOINTMENT';
  message_body: string;
  sms_status: SmsStatus;
  sms_sent_at?: string;
  sms_error?: string;
  created_at: string;
}

export interface DuplicatePatientCheckResult {
  isDuplicate: boolean;
  matchedBy: ('mobile' | 'patient_code' | 'name_dob')[];
  matchedPatients: Patient[];
}
