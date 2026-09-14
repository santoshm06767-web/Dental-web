import { 
  Patient, 
  Doctor, 
  Appointment, 
  ClinicSettings, 
  Profile, 
  AppointmentStatus, 
  AppointmentType, 
  AppointmentStatusHistory,
  DuplicatePatientCheckResult,
  Payment,
  DoctorPayment,
  ClinicExpense,
  SmsLog,
  PaymentMethod,
  PaymentType,
  PaymentStatus,
  DoctorPaymentMethod
} from '../types';
import { 
  INITIAL_PATIENTS, 
  INITIAL_DOCTORS, 
  INITIAL_APPOINTMENTS, 
  INITIAL_CLINIC_SETTINGS, 
  INITIAL_PROFILES,
  INITIAL_PAYMENTS,
  INITIAL_DOCTOR_PAYMENTS,
  INITIAL_CLINIC_EXPENSES,
  INITIAL_SMS_LOGS
} from './seedData';
import { drMriduBase64, drSwagatBase64, drNirmalBase64, resolveDoctorPhoto } from '../assets/images/doctors';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEYS = {
  PATIENTS: 'dental_patients_v1',
  DOCTORS: 'dental_doctors_v1',
  APPOINTMENTS: 'dental_appointments_v1',
  SETTINGS: 'dental_settings_v1',
  PROFILES: 'dental_profiles_v1',
  HISTORY: 'dental_history_v1',
  PAYMENTS: 'dental_payments_v1',
  DOCTOR_PAYMENTS: 'dental_doctor_payments_v1',
  CLINIC_EXPENSES: 'dental_clinic_expenses_v1',
  SMS_LOGS: 'dental_sms_logs_v1',
};

// In-memory / local storage fallback state
class ClinicRepository {
  private patients: Patient[] = [];
  private doctors: Doctor[] = [];
  private appointments: Appointment[] = [];
  private settings: ClinicSettings = INITIAL_CLINIC_SETTINGS;
  private profiles: Profile[] = [];
  private history: AppointmentStatusHistory[] = [];
  private payments: Payment[] = [];
  private doctorPayments: DoctorPayment[] = [];
  private clinicExpenses: ClinicExpense[] = [];
  private smsLogs: SmsLog[] = [];
  private currentProfile: Profile = INITIAL_PROFILES[0]; // Default: receptionist
  private missingSupabaseTables: Record<string, boolean> = {};

  constructor() {
    this.initData();
  }

  public isTableMissingInSupabase(tableName: string): boolean {
    return !!this.missingSupabaseTables[tableName];
  }

  public setMissingSupabaseTable(tableName: string, isMissing: boolean) {
    this.missingSupabaseTables[tableName] = isMissing;
  }

  public hasMissingFinancialTables(): boolean {
    return !!this.missingSupabaseTables['payments'] || !!this.missingSupabaseTables['doctor_payments'] || !!this.missingSupabaseTables['clinic_expenses'];
  }

  public deduplicateById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  public initData() {
    try {
      const savedPatients = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      this.patients = savedPatients ? this.deduplicateById(JSON.parse(savedPatients)) : [...INITIAL_PATIENTS];

      const savedDoctors = localStorage.getItem(STORAGE_KEYS.DOCTORS);
      this.doctors = savedDoctors ? this.deduplicateById(JSON.parse(savedDoctors)) : [...INITIAL_DOCTORS];

      // Update doctor records to match Arogya Dental Care clinic doctors with guaranteed base64 photos
      const doc001Idx = this.doctors.findIndex(d => d.id === 'doc-001' || d.name.toLowerCase().includes('mridu'));
      if (doc001Idx !== -1) {
        this.doctors[doc001Idx].name = 'Dr. Mridusmita Pathak';
        this.doctors[doc001Idx].qualification = 'BDS, MDS (Orthodontics & Dentofacial Orthopedics)';
        this.doctors[doc001Idx].specialization = 'Orthodontist';
        this.doctors[doc001Idx].email = 'dr.mridusmita@arogyadental.com';
        this.doctors[doc001Idx].photo_url = drMriduBase64;
      }

      const doc002Idx = this.doctors.findIndex(d => d.id === 'doc-002' || d.name.toLowerCase().includes('swagat'));
      if (doc002Idx !== -1) {
        this.doctors[doc002Idx].name = 'Dr. Swagat Kumar Mahanta';
        this.doctors[doc002Idx].qualification = 'BDS, MDS (Conservative Dentistry & Endodontics)';
        this.doctors[doc002Idx].specialization = 'Endodontist & Dental Surgeon';
        this.doctors[doc002Idx].email = 'dr.swagat@arogyadental.com';
        this.doctors[doc002Idx].photo_url = drSwagatBase64;
      }

      const doc003Idx = this.doctors.findIndex(d => d.id === 'doc-003' || d.name.toLowerCase().includes('nirmal'));
      if (doc003Idx !== -1) {
        this.doctors[doc003Idx].name = 'Dr. Nirmal Chandra Mahanta';
        this.doctors[doc003Idx].qualification = 'BDS, MDS (Oral & Maxillofacial Surgery, Oral Implantology)';
        this.doctors[doc003Idx].specialization = 'Clinic Director & Implantologist';
        this.doctors[doc003Idx].email = 'dr.nirmal@arogyadental.com';
        this.doctors[doc003Idx].photo_url = drNirmalBase64;
      }

      const savedAppointments = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      this.appointments = savedAppointments ? this.deduplicateById(JSON.parse(savedAppointments)) : [...INITIAL_APPOINTMENTS];

      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      let parsedSettings: Partial<ClinicSettings> | null = null;
      try {
        if (savedSettings && savedSettings !== 'undefined') {
          parsedSettings = JSON.parse(savedSettings);
        }
      } catch (err) {
        console.warn('Failed to parse settings from storage:', err);
      }
      this.settings = (parsedSettings && typeof parsedSettings === 'object' && parsedSettings.clinic_name)
        ? { ...INITIAL_CLINIC_SETTINGS, ...parsedSettings }
        : { ...INITIAL_CLINIC_SETTINGS };

      if (this.settings.clinic_name && this.settings.clinic_name.includes('SmileCraft')) {
        this.settings.clinic_name = 'AROGYA DENTAL CARE & IMPLANT CENTRE';
      }
      if (!this.settings.address || this.settings.address.includes('Metro Healthcare') || this.settings.address.includes('Park Avenue')) {
        this.settings.address = 'Pratima Medical Store, Khodasingi, Berhampur, 760001';
      }
      if (!this.settings.phone || this.settings.phone.includes('+1 (555)')) {
        this.settings.phone = '+91 94370 12345';
      }
      if (!this.settings.email || this.settings.email.includes('smilecraft')) {
        this.settings.email = 'contact@arogyadental.com';
      }
      this.persist();

      const savedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
      this.profiles = savedProfiles ? JSON.parse(savedProfiles) : [...INITIAL_PROFILES];

      const docProfileIdx = this.profiles.findIndex(p => p.doctor_id === 'doc-001' || p.id === 'user-doc-1' || p.id === 'user-doc-01');
      if (docProfileIdx !== -1) {
        this.profiles[docProfileIdx].full_name = 'Dr. Mridusmita Pathak';
        this.profiles[docProfileIdx].avatar_url = drMriduBase64;
      }

      const doc2ProfileIdx = this.profiles.findIndex(p => p.doctor_id === 'doc-002' || p.id === 'user-doc-2' || p.id === 'user-doc-02');
      if (doc2ProfileIdx !== -1) {
        this.profiles[doc2ProfileIdx].full_name = 'Dr. Swagat Kumar Mahanta';
        this.profiles[doc2ProfileIdx].avatar_url = drSwagatBase64;
      }

      const adminProfileIdx = this.profiles.findIndex(p => p.role === 'admin' || p.id === 'user-adm-1' || p.id === 'user-admin-01');
      if (adminProfileIdx !== -1) {
        this.profiles[adminProfileIdx].full_name = 'Dr. Nirmal Chandra Mahanta';
        this.profiles[adminProfileIdx].email = 'dr.nirmal@arogyadental.com';
        this.profiles[adminProfileIdx].doctor_id = 'doc-003';
        this.profiles[adminProfileIdx].avatar_url = drNirmalBase64;
      }

      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      this.history = savedHistory ? JSON.parse(savedHistory) : [];

      const savedPayments = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      this.payments = savedPayments ? JSON.parse(savedPayments) : [...INITIAL_PAYMENTS];

      const savedDocPayments = localStorage.getItem(STORAGE_KEYS.DOCTOR_PAYMENTS);
      this.doctorPayments = savedDocPayments ? JSON.parse(savedDocPayments) : [...INITIAL_DOCTOR_PAYMENTS];

      const savedExpenses = localStorage.getItem(STORAGE_KEYS.CLINIC_EXPENSES);
      this.clinicExpenses = savedExpenses ? JSON.parse(savedExpenses) : [...INITIAL_CLINIC_EXPENSES];

      const savedSms = localStorage.getItem(STORAGE_KEYS.SMS_LOGS);
      this.smsLogs = savedSms ? JSON.parse(savedSms) : [...INITIAL_SMS_LOGS];

      // Ensure doctor default fees
      this.doctors.forEach(d => {
        if (!d.consultation_fee) d.consultation_fee = 500;
        if (!d.followup_fee) d.followup_fee = 300;
      });

      // Ensure patients registration fee info
      this.patients.forEach(p => {
        if (p.registration_fee_required === undefined) p.registration_fee_required = true;
        if (p.registration_fee_paid === undefined) p.registration_fee_paid = true;
        if (!p.registration_fee_amount) p.registration_fee_amount = 100;
      });

      // Ensure clinic settings finance fields
      if (!this.settings.default_registration_fee) this.settings.default_registration_fee = 100;
      if (!this.settings.default_consultation_fee) this.settings.default_consultation_fee = 500;
      if (!this.settings.receipt_prefix) this.settings.receipt_prefix = 'MR';
      if (this.settings.sms_enabled === undefined) this.settings.sms_enabled = true;

      const savedCurrentProfileId = localStorage.getItem('dental_active_profile_id');
      if (savedCurrentProfileId) {
        const found = this.profiles.find(p => p.id === savedCurrentProfileId);
        if (found) this.currentProfile = found;
      }
      if (this.currentProfile && (this.currentProfile.full_name.includes('Sarah') || this.currentProfile.full_name.includes('Elena') || this.currentProfile.full_name.includes('Marcus') || this.currentProfile.full_name.includes('Sterling') || this.currentProfile.role === 'admin')) {
        this.currentProfile.full_name = 'Dr. Nirmal Chandra Mahanta';
        this.currentProfile.avatar_url = drNirmalBase64;
      }

      // Automatically fetch latest appointments from Supabase if configured
      if (typeof window !== 'undefined' && isSupabaseConfigured()) {
        setTimeout(() => {
          this.fetchFromSupabase().then((res) => {
            if (res.success && res.appointmentsCount > 0) {
              window.dispatchEvent(new CustomEvent('dental_repo_updated'));
            }
          }).catch(() => {});
        }, 500);
      }
    } catch (e) {
      console.error('Error loading clinic repository from localStorage:', e);
      this.patients = [...INITIAL_PATIENTS];
      this.doctors = [...INITIAL_DOCTORS];
      this.appointments = [...INITIAL_APPOINTMENTS];
      this.settings = { ...INITIAL_CLINIC_SETTINGS };
      this.profiles = [...INITIAL_PROFILES];
      this.history = [];
      this.payments = [...INITIAL_PAYMENTS];
      this.doctorPayments = [...INITIAL_DOCTOR_PAYMENTS];
      this.clinicExpenses = [...INITIAL_CLINIC_EXPENSES];
      this.smsLogs = [...INITIAL_SMS_LOGS];
    }
  }

  private persist() {
    try {
      this.patients = this.deduplicateById(this.patients);
      this.doctors = this.deduplicateById(this.doctors);
      this.appointments = this.deduplicateById(this.appointments);

      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(this.patients));
      localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(this.doctors));
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(this.appointments));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(this.profiles));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.history));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(this.payments));
      localStorage.setItem(STORAGE_KEYS.DOCTOR_PAYMENTS, JSON.stringify(this.doctorPayments));
      localStorage.setItem(STORAGE_KEYS.CLINIC_EXPENSES, JSON.stringify(this.clinicExpenses));
      localStorage.setItem(STORAGE_KEYS.SMS_LOGS, JSON.stringify(this.smsLogs));
      localStorage.setItem('dental_active_profile_id', this.currentProfile.id);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  public resetAllToDemo() {
    this.patients = [...INITIAL_PATIENTS];
    this.doctors = [...INITIAL_DOCTORS];
    this.appointments = [...INITIAL_APPOINTMENTS];
    this.settings = { ...INITIAL_CLINIC_SETTINGS };
    this.profiles = [...INITIAL_PROFILES];
    this.history = [];
    this.currentProfile = INITIAL_PROFILES[0];
    this.persist();
  }

  // Active user / profile
  public getCurrentProfile(): Profile {
    return this.currentProfile;
  }

  public setCurrentProfile(profileId: string) {
    const profile = this.profiles.find(p => p.id === profileId);
    if (profile) {
      this.currentProfile = profile;
      this.persist();
    }
  }

  public getProfiles(): Profile[] {
    return [...this.profiles];
  }

  // Settings
  public getClinicSettings(): ClinicSettings {
    if (!this.settings || !this.settings.clinic_name) {
      this.settings = { ...INITIAL_CLINIC_SETTINGS, ...(this.settings || {}) };
    }
    return { ...this.settings };
  }

  public getSettings(): ClinicSettings {
    return this.getClinicSettings();
  }

  public updateClinicSettings(updates: Partial<ClinicSettings>): ClinicSettings {
    this.settings = {
      ...this.settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();

    // Async sync with Supabase if configured
    const client = getSupabaseClient();
    if (client) {
      client.from('clinic_settings').upsert({
        ...this.settings,
      }).then(({ error }) => {
        if (error) console.warn('Supabase settings sync error:', error);
      });
    }

    return { ...this.settings };
  }

  public updateSettings(updates: Partial<ClinicSettings>): ClinicSettings {
    return this.updateClinicSettings(updates);
  }

  // Data Sanitization for Supabase PostgreSQL schema compatibility
  public cleanAppointmentForSupabase(apt: Appointment) {
    return {
      id: apt.id,
      appointment_code: apt.appointment_code,
      patient_id: apt.patient_id,
      doctor_id: apt.doctor_id,
      appointment_date: apt.appointment_date,
      appointment_time: apt.appointment_time,
      token_number: apt.token_number,
      appointment_type: apt.appointment_type,
      reason: apt.reason,
      status: apt.status,
      notes: apt.notes || null,
      next_visit_date: apt.next_visit_date || null,
      next_visit_time: apt.next_visit_time || null,
      next_visit_notes: apt.next_visit_notes || null,
      created_by: apt.created_by || null,
      created_at: apt.created_at,
      updated_at: apt.updated_at,
    };
  }

  public cleanPatientForSupabase(pat: Patient) {
    const { age, ...clean } = pat;
    return {
      id: clean.id,
      patient_code: clean.patient_code,
      first_name: clean.first_name,
      last_name: clean.last_name,
      gender: clean.gender,
      date_of_birth: clean.date_of_birth,
      mobile: clean.mobile,
      alternate_mobile: clean.alternate_mobile || null,
      email: clean.email || null,
      address: clean.address,
      city: clean.city,
      state: clean.state,
      postal_code: clean.postal_code,
      emergency_contact_name: clean.emergency_contact_name,
      emergency_contact_number: clean.emergency_contact_number,
      blood_group: clean.blood_group || null,
      allergies: clean.allergies || null,
      medical_notes: clean.medical_notes || null,
      active: clean.active !== false,
      created_by: clean.created_by || null,
      created_at: clean.created_at,
      updated_at: clean.updated_at,
    };
  }

  public cleanDoctorForSupabase(doc: Doctor) {
    return {
      id: doc.id,
      doctor_code: doc.doctor_code,
      name: doc.name,
      qualification: doc.qualification,
      specialization: doc.specialization,
      registration_number: doc.registration_number || null,
      mobile: doc.mobile || null,
      email: doc.email || null,
      consultation_room: doc.consultation_room || null,
      available_days: doc.available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: doc.start_time || '09:00',
      end_time: doc.end_time || '17:00',
      active: doc.active !== false,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }

  public cleanSettingsForSupabase(settings: ClinicSettings) {
    return {
      id: settings.id || 'set-001',
      clinic_name: settings.clinic_name,
      tagline: settings.tagline || null,
      logo_url: settings.logo_url || null,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      gst_number: settings.gst_number || null,
      appointment_duration: settings.appointment_duration || 20,
      working_days: settings.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      working_hours_start: settings.working_hours_start || '09:00',
      working_hours_end: settings.working_hours_end || '18:00',
      token_prefix: settings.token_prefix || 'TK',
      token_reset_daily: settings.token_reset_daily !== false,
      footer_text: settings.footer_text || 'Please arrive 10 minutes early.',
    };
  }

  public async syncAppointmentToSupabase(apt: Appointment): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase client not configured' };

    try {
      // 1. Ensure foreign key: Doctor exists in Supabase
      const doc = this.getDoctorById(apt.doctor_id);
      if (doc) {
        const { error: docErr } = await client.from('doctors').upsert(this.cleanDoctorForSupabase(doc));
        if (docErr) console.warn('Supabase doctor sync warning:', docErr);
      }

      // 2. Ensure foreign key: Patient exists in Supabase
      const pat = this.getPatientById(apt.patient_id);
      if (pat) {
        const { error: patErr } = await client.from('patients').upsert(this.cleanPatientForSupabase(pat));
        if (patErr) console.warn('Supabase patient sync warning:', patErr);
      }

      // 3. Upsert clean appointment
      const cleanApt = this.cleanAppointmentForSupabase(apt);
      const { error: aptErr } = await client.from('appointments').upsert(cleanApt);
      if (aptErr) {
        console.error('Supabase appointment insert failed:', aptErr);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dental_supabase_sync_error', { 
            detail: { message: aptErr.message, code: aptErr.code, table: 'appointments' } 
          }));
        }
        return { success: false, error: aptErr.message };
      }

      // 4. Record audit status history in Supabase
      await client.from('appointment_status_history').upsert({
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        appointment_id: apt.id,
        old_status: null,
        new_status: apt.status,
        changed_by: apt.created_by || null,
        notes: 'Initial appointment booking'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dental_supabase_sync_success', { 
          detail: { appointment_code: apt.appointment_code, id: apt.id } 
        }));
      }

      return { success: true };
    } catch (err: any) {
      console.error('Supabase appointment sync exception:', err);
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  public async syncWithSupabase(): Promise<{ 
    success: boolean; 
    message: string; 
    counts?: { doctors: number; patients: number; appointments: number; payments?: number };
    error?: string;
  }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase client not configured' };

    try {
      // 1. Settings
      const { error: setErr } = await client.from('clinic_settings').upsert(this.cleanSettingsForSupabase(this.settings));
      if (setErr) {
        console.error('Supabase settings sync error:', setErr);
        return { success: false, message: `Failed to sync clinic settings: ${setErr.message}`, error: setErr.message };
      }

      // 2. Doctors
      for (const doc of this.doctors) {
        const { error: docErr } = await client.from('doctors').upsert(this.cleanDoctorForSupabase(doc));
        if (docErr) {
          console.error('Supabase doctor sync error:', docErr);
          return { success: false, message: `Failed to sync doctor (${doc.name}): ${docErr.message}`, error: docErr.message };
        }
      }

      // 3. Patients
      for (const pat of this.patients) {
        const { error: patErr } = await client.from('patients').upsert(this.cleanPatientForSupabase(pat));
        if (patErr) {
          console.error('Supabase patient sync error:', patErr);
          return { success: false, message: `Failed to sync patient (${pat.first_name} ${pat.last_name}): ${patErr.message}`, error: patErr.message };
        }
      }

      // 4. Appointments
      for (const apt of this.appointments) {
        const { error: aptErr } = await client.from('appointments').upsert(this.cleanAppointmentForSupabase(apt));
        if (aptErr) {
          console.error('Supabase appointment sync error:', aptErr);
          return { success: false, message: `Failed to sync appointment (${apt.appointment_code}): ${aptErr.message}`, error: aptErr.message };
        }
      }

      // 5. Payments (Financial Ledger) - Non-blocking if table not migrated yet
      let paymentsSynced = 0;
      let financialWarning: string | undefined;

      if (this.payments.length > 0) {
        for (const p of this.payments) {
          const { error: payErr } = await client.from('payments').upsert({
            id: p.id,
            receipt_number: p.receipt_number,
            patient_id: p.patient_id,
            appointment_id: p.appointment_id || null,
            doctor_id: p.doctor_id || null,
            payment_type: p.payment_type,
            amount: p.amount,
            payment_method: p.payment_method,
            payment_status: p.payment_status,
            transaction_reference: p.transaction_reference || null,
            notes: p.notes || null,
            collected_by: p.collected_by || null,
            collected_by_name: p.collected_by_name || null,
            collected_at: p.collected_at,
            created_at: p.created_at,
            updated_at: p.updated_at,
          });

          if (payErr) {
            if (payErr.code === 'PGRST205' || payErr.message?.includes('schema cache')) {
              this.setMissingSupabaseTable('payments', true);
              financialWarning = 'Note: The "public.payments" table is not yet created in Supabase (PGRST205). Run the 1-Click Financial Migration SQL from Supabase Setup modal.';
              break;
            } else {
              console.warn('Supabase payment sync warning:', payErr.message);
            }
          } else {
            paymentsSynced++;
            this.setMissingSupabaseTable('payments', false);
          }
        }
      }

      return { 
        success: true, 
        message: financialWarning 
          ? `Base data synchronized (${this.doctors.length} doctors, ${this.patients.length} patients, ${this.appointments.length} appointments). ${financialWarning}`
          : `Successfully synchronized ${this.doctors.length} doctors, ${this.patients.length} patients, ${this.appointments.length} appointments, and ${paymentsSynced} payment receipts to Supabase!`,
        counts: {
          doctors: this.doctors.length,
          patients: this.patients.length,
          appointments: this.appointments.length,
          payments: paymentsSynced,
        }
      };
    } catch (err: any) {
      console.error('Supabase full sync exception:', err);
      return { success: false, message: err?.message || 'Sync failed due to unexpected error', error: err?.message };
    }
  }

  public async fetchFromSupabase(): Promise<{ success: boolean; appointmentsCount: number; message: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, appointmentsCount: 0, message: 'Supabase client not configured' };

    try {
      // 1. Fetch clinic settings
      const { data: setRows } = await client.from('clinic_settings').select('*').limit(1);
      if (setRows && setRows[0]) {
        this.settings = { ...this.settings, ...setRows[0] };
      }

      // 2. Fetch doctors
      const { data: docRows } = await client.from('doctors').select('*');
      if (docRows && docRows.length > 0) {
        for (const d of docRows) {
          const idx = this.doctors.findIndex(item => item.id === d.id);
          const resolvedPhoto = resolveDoctorPhoto(d.photo_url, d.name, d.id);
          if (idx === -1) {
            this.doctors.push({
              ...d,
              photo_url: resolvedPhoto || undefined,
            });
          } else {
            this.doctors[idx] = { 
              ...this.doctors[idx], 
              ...d,
              photo_url: resolvedPhoto || this.doctors[idx].photo_url || undefined,
            };
          }
        }
      }

      // 3. Fetch patients
      const { data: patRows } = await client.from('patients').select('*');
      if (patRows && patRows.length > 0) {
        for (const p of patRows) {
          const age = this.calculateAge(p.date_of_birth);
          const fullPatient = { ...p, age };
          const idx = this.patients.findIndex(item => item.id === p.id);
          if (idx === -1) {
            this.patients.unshift(fullPatient);
          } else {
            this.patients[idx] = { ...this.patients[idx], ...fullPatient };
          }
        }
      }

      // 4. Fetch appointments
      const { data: aptRows, error: aptErr } = await client.from('appointments').select('*').order('created_at', { ascending: false });
      if (aptErr) {
        return { success: false, appointmentsCount: 0, message: aptErr.message };
      }

      if (aptRows && aptRows.length > 0) {
        for (const a of aptRows) {
          const patient = this.getPatientById(a.patient_id);
          const doctor = this.getDoctorById(a.doctor_id);
          const fullApt: Appointment = {
            ...a,
            patient,
            doctor,
            created_by_name: this.profiles.find(p => p.id === a.created_by)?.full_name || 'Staff'
          };
          const idx = this.appointments.findIndex(item => item.id === a.id);
          if (idx === -1) {
            this.appointments.unshift(fullApt);
          } else {
            this.appointments[idx] = { ...this.appointments[idx], ...fullApt };
          }
        }
        this.appointments = this.deduplicateById(this.appointments);
        this.persist();
      }

      // 5. Fetch payments (graceful skip if table not created yet)
      let paymentsLoaded = 0;
      const { data: payRows, error: payErr } = await client.from('payments').select('*').order('collected_at', { ascending: false });
      if (payErr) {
        if (payErr.code === 'PGRST205' || payErr.message?.includes('schema cache')) {
          this.setMissingSupabaseTable('payments', true);
        }
      } else if (payRows && payRows.length > 0) {
        this.setMissingSupabaseTable('payments', false);
        for (const p of payRows) {
          const idx = this.payments.findIndex(item => item.id === p.id);
          if (idx === -1) {
            this.payments.unshift(p);
          } else {
            this.payments[idx] = { ...this.payments[idx], ...p };
          }
        }
        this.payments = this.deduplicateById(this.payments);
        paymentsLoaded = payRows.length;
        this.persist();
      }

      return { 
        success: true, 
        appointmentsCount: aptRows?.length || 0, 
        message: `Successfully loaded ${aptRows?.length || 0} appointments${paymentsLoaded > 0 ? ` and ${paymentsLoaded} payments` : ''} from Supabase.` 
      };
    } catch (err: any) {
      return { success: false, appointmentsCount: 0, message: err?.message || 'Failed to fetch from Supabase' };
    }
  }

  // Patients
  public getPatients(): Patient[] {
    return [...this.patients].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getPatientById(id: string): Patient | undefined {
    return this.patients.find(p => p.id === id);
  }

  public searchPatients(query: string): Patient[] {
    if (!query || !query.trim()) return this.getPatients();
    const q = query.trim().toLowerCase();
    const cleanNumber = q.replace(/[\s\-\(\)\+]/g, '');

    return this.patients.filter(p => {
      const patientCode = p.patient_code.toLowerCase();
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      const mobileClean = p.mobile.replace(/[\s\-\(\)\+]/g, '');
      const email = (p.email || '').toLowerCase();

      return (
        patientCode.includes(q) ||
        fullName.includes(q) ||
        (cleanNumber && mobileClean.includes(cleanNumber)) ||
        email.includes(q)
      );
    });
  }

  public checkDuplicatePatient(
    patientData: { mobile: string; first_name: string; last_name: string; date_of_birth: string; patient_code?: string },
    excludeId?: string
  ): DuplicatePatientCheckResult {
    const matchedBy: ('mobile' | 'patient_code' | 'name_dob')[] = [];
    const matchedPatientsMap = new Map<string, Patient>();

    const targetMobile = patientData.mobile.replace(/[\s\-\(\)\+]/g, '');
    const targetName = `${patientData.first_name} ${patientData.last_name}`.trim().toLowerCase();
    const targetDob = patientData.date_of_birth;

    for (const p of this.patients) {
      if (excludeId && p.id === excludeId) continue;

      const pMobile = p.mobile.replace(/[\s\-\(\)\+]/g, '');
      const pName = `${p.first_name} ${p.last_name}`.trim().toLowerCase();

      let matchedThis = false;

      // 1. Mobile number match
      if (targetMobile && pMobile && targetMobile === pMobile) {
        if (!matchedBy.includes('mobile')) matchedBy.push('mobile');
        matchedThis = true;
      }

      // 2. Patient ID match (if provided)
      if (patientData.patient_code && p.patient_code.toLowerCase() === patientData.patient_code.toLowerCase()) {
        if (!matchedBy.includes('patient_code')) matchedBy.push('patient_code');
        matchedThis = true;
      }

      // 3. Name + DOB match
      if (targetName && targetDob && pName === targetName && p.date_of_birth === targetDob) {
        if (!matchedBy.includes('name_dob')) matchedBy.push('name_dob');
        matchedThis = true;
      }

      if (matchedThis) {
        matchedPatientsMap.set(p.id, p);
      }
    }

    return {
      isDuplicate: matchedPatientsMap.size > 0,
      matchedBy,
      matchedPatients: Array.from(matchedPatientsMap.values()),
    };
  }

  public calculateAge(dateOfBirth?: string): number | undefined {
    if (!dateOfBirth) return undefined;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : undefined;
  }

  public generatePatientCode(): string {
    const maxNum = this.patients.reduce((acc, p) => {
      const match = p.patient_code.match(/PAT-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > acc ? num : acc;
      }
      return acc;
    }, 0);
    const nextNum = maxNum + 1;
    return `PAT-${String(nextNum).padStart(6, '0')}`;
  }

  public createPatient(patientData: Omit<Patient, 'id' | 'patient_code' | 'created_at' | 'updated_at'> & { patient_code?: string }): Patient {
    const code = patientData.patient_code || this.generatePatientCode();
    
    // Calculate age if not set
    let age = patientData.age;
    if (!age && patientData.date_of_birth) {
      const dob = new Date(patientData.date_of_birth);
      const diffMs = Date.now() - dob.getTime();
      const ageDt = new Date(diffMs);
      age = Math.abs(ageDt.getUTCFullYear() - 1970);
    }

    const newPatient: Patient = {
      ...patientData,
      id: `pat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      patient_code: code,
      age,
      created_by: this.currentProfile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.patients.unshift(newPatient);
    this.persist();

    // Async sync to Supabase
    const client = getSupabaseClient();
    if (client) {
      client.from('patients').upsert([this.cleanPatientForSupabase(newPatient)]).then(({ error }) => {
        if (error) console.warn('Supabase patient insert error:', error);
      });
    }

    return newPatient;
  }

  public updatePatient(id: string, updates: Partial<Patient>): Patient {
    const idx = this.patients.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Patient not found');

    const updated: Patient = {
      ...this.patients[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.patients[idx] = updated;
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('patients').upsert([this.cleanPatientForSupabase(updated)]).then(({ error }) => {
        if (error) console.warn('Supabase patient update error:', error);
      });
    }

    return updated;
  }

  // Doctors
  public getDoctors(activeOnly: boolean = false): Doctor[] {
    if (activeOnly) {
      return this.doctors.filter(d => d.active);
    }
    return [...this.doctors];
  }

  public getDoctorById(id: string): Doctor | undefined {
    return this.doctors.find(d => d.id === id);
  }

  public generateDoctorCode(): string {
    const maxNum = this.doctors.reduce((acc, d) => {
      const match = d.doctor_code.match(/DOC-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > acc ? num : acc;
      }
      return acc;
    }, 0);
    const nextNum = maxNum + 1;
    return `DOC-${String(nextNum).padStart(3, '0')}`;
  }

  public createDoctor(doctorData: Omit<Doctor, 'id' | 'doctor_code' | 'created_at' | 'updated_at'> & { doctor_code?: string }): Doctor {
    const code = doctorData.doctor_code || this.generateDoctorCode();
    const newDoctor: Doctor = {
      ...doctorData,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      doctor_code: code,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.doctors.push(newDoctor);
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('doctors').upsert([this.cleanDoctorForSupabase(newDoctor)]).then(({ error }) => {
        if (error) console.warn('Supabase doctor insert error:', error);
      });
    }

    return newDoctor;
  }

  public updateDoctor(id: string, updates: Partial<Doctor>): Doctor {
    const idx = this.doctors.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Doctor not found');

    const updated: Doctor = {
      ...this.doctors[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.doctors[idx] = updated;
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('doctors').update(updates).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase doctor update error:', error);
      });
    }

    return updated;
  }

  public toggleDoctorStatus(id: string): Doctor {
    const doc = this.getDoctorById(id);
    if (!doc) throw new Error('Doctor not found');
    return this.updateDoctor(id, { active: !doc.active });
  }

  // Appointments
  public getAppointments(): Appointment[] {
    const uniqueAppointments = this.deduplicateById(this.appointments);
    return uniqueAppointments.map(apt => ({
      ...apt,
      patient: this.getPatientById(apt.patient_id),
      doctor: this.getDoctorById(apt.doctor_id),
    })).sort((a, b) => {
      // Sort by date then time
      if (a.appointment_date !== b.appointment_date) {
        return a.appointment_date.localeCompare(b.appointment_date);
      }
      return a.appointment_time.localeCompare(b.appointment_time);
    });
  }

  public getAppointmentById(id: string): Appointment | undefined {
    const apt = this.appointments.find(a => a.id === id);
    if (!apt) return undefined;
    return {
      ...apt,
      patient: this.getPatientById(apt.patient_id),
      doctor: this.getDoctorById(apt.doctor_id),
    };
  }

  public getTodayAppointments(dateStr?: string): Appointment[] {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    return this.getAppointments().filter(apt => apt.appointment_date === targetDate);
  }

  public getAppointmentsByPatient(patientId: string): Appointment[] {
    return this.getAppointments()
      .filter(apt => apt.patient_id === patientId)
      .sort((a, b) => {
        // Sort descending by date
        const dtA = `${a.appointment_date}T${a.appointment_time}`;
        const dtB = `${b.appointment_date}T${b.appointment_time}`;
        return dtB.localeCompare(dtA);
      });
  }

  public getAppointmentsByDoctor(doctorId: string, dateStr?: string): Appointment[] {
    return this.getAppointments().filter(apt => {
      if (apt.doctor_id !== doctorId) return false;
      if (dateStr && apt.appointment_date !== dateStr) return false;
      return true;
    });
  }

  public checkDoubleBooking(doctorId: string, dateStr: string, timeStr: string, excludeAppointmentId?: string): { isBooked: boolean; existingAppointment?: Appointment } {
    const existing = this.appointments.find(apt => {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
      if (apt.doctor_id !== doctorId) return false;
      if (apt.appointment_date !== dateStr) return false;
      if (apt.status === 'Cancelled') return false; // Cancelled appointments free up the slot

      // Normalize time comparison (e.g. 09:00 vs 9:00)
      const t1 = apt.appointment_time.padStart(5, '0');
      const t2 = timeStr.padStart(5, '0');
      return t1 === t2;
    });

    if (existing) {
      return {
        isBooked: true,
        existingAppointment: {
          ...existing,
          patient: this.getPatientById(existing.patient_id),
          doctor: this.getDoctorById(existing.doctor_id),
        },
      };
    }

    return { isBooked: false };
  }

  public generateAppointmentCode(): string {
    const maxNum = this.appointments.reduce((acc, a) => {
      const match = a.appointment_code.match(/APT-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > acc ? num : acc;
      }
      return acc;
    }, 100);
    const nextNum = maxNum + 1;
    return `APT-${String(nextNum).padStart(6, '0')}`;
  }

  public getNextTokenForDate(dateStr: string): number {
    const dailyAppointments = this.appointments.filter(a => a.appointment_date === dateStr);
    const maxToken = dailyAppointments.reduce((acc, a) => (a.token_number > acc ? a.token_number : acc), 0);
    return maxToken + 1;
  }

  public createAppointment(data: {
    patient_id: string;
    doctor_id: string;
    appointment_date: string;
    appointment_time: string;
    appointment_type: AppointmentType;
    reason: string;
    notes?: string;
    next_visit_date?: string;
    status?: AppointmentStatus;
  }): Appointment {
    // 1. Double-booking check
    const doubleBooking = this.checkDoubleBooking(data.doctor_id, data.appointment_date, data.appointment_time);
    if (doubleBooking.isBooked) {
      const docName = doubleBooking.existingAppointment?.doctor?.name || 'Selected doctor';
      const patientName = `${doubleBooking.existingAppointment?.patient?.first_name || ''} ${doubleBooking.existingAppointment?.patient?.last_name || ''}`.trim();
      throw new Error(
        `Doctor Double-Booking Conflict: ${docName} already has an appointment scheduled at ${data.appointment_time} on ${data.appointment_date} with patient ${patientName || 'another patient'}. Please choose a different time slot or doctor.`
      );
    }

    // 2. Doctor active check
    const doc = this.getDoctorById(data.doctor_id);
    if (!doc || !doc.active) {
      throw new Error('Appointments cannot be booked with an inactive or non-existent doctor.');
    }

    const aptCode = this.generateAppointmentCode();
    const token = this.getNextTokenForDate(data.appointment_date);
    const initialStatus: AppointmentStatus = data.status || 'Scheduled';

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      appointment_code: aptCode,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      token_number: token,
      appointment_type: data.appointment_type,
      reason: data.reason,
      status: initialStatus,
      notes: data.notes || '',
      next_visit_date: data.next_visit_date,
      created_by: this.currentProfile.id,
      created_by_name: this.currentProfile.full_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.appointments.unshift(newAppointment);

    // Record initial status history
    this.recordStatusHistory(newAppointment.id, null, initialStatus, 'Initial appointment created');
    this.persist();

    // Sync to Supabase in background with error handling and dependency resolution
    this.syncAppointmentToSupabase(newAppointment);

    return {
      ...newAppointment,
      patient: this.getPatientById(newAppointment.patient_id),
      doctor: doc,
    };
  }

  public updateAppointmentStatus(appointmentId: string, newStatus: AppointmentStatus, notes?: string): Appointment {
    const idx = this.appointments.findIndex(a => a.id === appointmentId);
    if (idx === -1) throw new Error('Appointment not found');

    const old = this.appointments[idx];
    const oldStatus = old.status;

    const updated: Appointment = {
      ...old,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    this.appointments[idx] = updated;
    this.recordStatusHistory(appointmentId, oldStatus, newStatus, notes);
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('appointments').update({
        status: newStatus,
        updated_at: updated.updated_at,
      }).eq('id', appointmentId).then(({ error }) => {
        if (error) console.warn('Supabase status update error:', error);
      });

      client.from('appointment_status_history').insert([{
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        appointment_id: appointmentId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: this.currentProfile.id,
        notes: notes || null,
      }]).then(({ error }) => {
        if (error) console.warn('Supabase status history insert error:', error);
      });
    }

    return {
      ...updated,
      patient: this.getPatientById(updated.patient_id),
      doctor: this.getDoctorById(updated.doctor_id),
    };
  }

  public rescheduleAppointment(appointmentId: string, newDate: string, newTime: string, reason?: string): Appointment {
    const idx = this.appointments.findIndex(a => a.id === appointmentId);
    if (idx === -1) throw new Error('Appointment not found');

    const old = this.appointments[idx];

    // Check double booking
    const doubleBooking = this.checkDoubleBooking(old.doctor_id, newDate, newTime, appointmentId);
    if (doubleBooking.isBooked) {
      throw new Error(`The doctor already has an appointment at ${newTime} on ${newDate}.`);
    }

    const token = this.getNextTokenForDate(newDate);

    const updated: Appointment = {
      ...old,
      appointment_date: newDate,
      appointment_time: newTime,
      token_number: token,
      status: 'Scheduled',
      notes: reason ? `${old.notes ? old.notes + ' | ' : ''}Rescheduled: ${reason}` : old.notes,
      updated_at: new Date().toISOString(),
    };

    this.appointments[idx] = updated;
    this.recordStatusHistory(appointmentId, old.status, 'Scheduled', `Rescheduled to ${newDate} at ${newTime}. ${reason || ''}`);
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('appointments').update({
        appointment_date: newDate,
        appointment_time: newTime,
        token_number: token,
        status: 'Scheduled',
        notes: updated.notes || null,
        updated_at: updated.updated_at,
      }).eq('id', appointmentId).then(({ error }) => {
        if (error) console.warn('Supabase reschedule update error:', error);
      });

      client.from('appointment_status_history').insert([{
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        appointment_id: appointmentId,
        old_status: old.status,
        new_status: 'Scheduled',
        changed_by: this.currentProfile.id,
        notes: `Rescheduled to ${newDate} at ${newTime}. ${reason || ''}`,
      }]).then(({ error }) => {
        if (error) console.warn('Supabase status history insert error:', error);
      });
    }

    return {
      ...updated,
      patient: this.getPatientById(updated.patient_id),
      doctor: this.getDoctorById(updated.doctor_id),
    };
  }

  public scheduleNextVisit(params: {
    previousAppointmentId: string;
    nextVisitDate: string;
    nextVisitTime: string;
    doctorId: string;
    appointmentType: AppointmentType;
    notes?: string;
  }): { newAppointment: Appointment; updatedPreviousAppointment: Appointment } {
    const prev = this.appointments.find(a => a.id === params.previousAppointmentId);
    if (!prev) throw new Error('Previous appointment not found');

    // 1. Create the new appointment for the next visit
    const newApt = this.createAppointment({
      patient_id: prev.patient_id,
      doctor_id: params.doctorId,
      appointment_date: params.nextVisitDate,
      appointment_time: params.nextVisitTime,
      appointment_type: params.appointmentType,
      reason: `Follow-up visit following appointment ${prev.appointment_code}`,
      notes: params.notes,
      status: 'Scheduled',
    });

    // 2. Update the previous appointment with reference (re-query index since createAppointment modified array)
    const currentPrevIdx = this.appointments.findIndex(a => a.id === params.previousAppointmentId);
    const updatedPrevious: Appointment = {
      ...prev,
      next_visit_date: params.nextVisitDate,
      next_visit_time: params.nextVisitTime,
      next_visit_notes: params.notes,
      updated_at: new Date().toISOString(),
    };

    if (currentPrevIdx !== -1) {
      this.appointments[currentPrevIdx] = updatedPrevious;
    }
    this.appointments = this.deduplicateById(this.appointments);
    this.persist();

    // Also update Supabase if client is available
    const client = getSupabaseClient();
    if (client) {
      client.from('appointments').update({
        next_visit_date: params.nextVisitDate,
        next_visit_time: params.nextVisitTime,
        next_visit_notes: params.notes || null,
        updated_at: updatedPrevious.updated_at,
      }).eq('id', params.previousAppointmentId).then(({ error }) => {
        if (error) console.warn('Supabase next visit update error:', error);
      });
    }

    return {
      newAppointment: newApt,
      updatedPreviousAppointment: {
        ...updatedPrevious,
        patient: this.getPatientById(updatedPrevious.patient_id),
        doctor: this.getDoctorById(updatedPrevious.doctor_id),
      },
    };
  }

  private recordStatusHistory(
    appointmentId: string,
    oldStatus: AppointmentStatus | null,
    newStatus: AppointmentStatus,
    notes?: string
  ) {
    const historyItem: AppointmentStatusHistory = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      appointment_id: appointmentId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: this.currentProfile.id,
      changed_by_name: this.currentProfile.full_name,
      changed_at: new Date().toISOString(),
      notes,
    };
    this.history.unshift(historyItem);
  }

  public getAppointmentHistory(appointmentId: string): AppointmentStatusHistory[] {
    return this.history.filter(h => h.appointment_id === appointmentId);
  }

  // ==========================================
  // FINANCIAL MODULE: PAYMENTS & RECEIPTS
  // ==========================================

  public generateNextReceiptNumber(): string {
    const prefix = this.settings.receipt_prefix || 'MR';
    let maxNum = 0;
    for (const p of this.payments) {
      if (p.receipt_number && p.receipt_number.startsWith(prefix)) {
        const numPart = p.receipt_number.replace(`${prefix}-`, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    const nextNum = maxNum + 1;
    return `${prefix}-${nextNum.toString().padStart(6, '0')}`;
  }

  public getPayments(filters?: {
    patientId?: string;
    appointmentId?: string;
    doctorId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: PaymentMethod | 'ALL';
    paymentType?: PaymentType | 'ALL';
    status?: PaymentStatus | 'ALL';
    search?: string;
  }): Payment[] {
    let result = [...this.payments];

    if (filters?.patientId) {
      result = result.filter(p => p.patient_id === filters.patientId);
    }
    if (filters?.appointmentId) {
      result = result.filter(p => p.appointment_id === filters.appointmentId);
    }
    if (filters?.doctorId && filters.doctorId !== 'ALL') {
      result = result.filter(p => p.doctor_id === filters.doctorId);
    }
    if (filters?.startDate) {
      result = result.filter(p => p.collected_at.split('T')[0] >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter(p => p.collected_at.split('T')[0] <= filters.endDate!);
    }
    if (filters?.paymentMethod && filters.paymentMethod !== 'ALL') {
      result = result.filter(p => p.payment_method === filters.paymentMethod);
    }
    if (filters?.paymentType && filters.paymentType !== 'ALL') {
      result = result.filter(p => p.payment_type === filters.paymentType);
    }
    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter(p => p.payment_status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(p => {
        const pat = this.getPatientById(p.patient_id);
        const doc = p.doctor_id ? this.getDoctorById(p.doctor_id) : null;
        return (
          p.receipt_number.toLowerCase().includes(q) ||
          (p.transaction_reference && p.transaction_reference.toLowerCase().includes(q)) ||
          (pat && `${pat.first_name} ${pat.last_name} ${pat.mobile} ${pat.patient_code}`.toLowerCase().includes(q)) ||
          (doc && doc.name.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
        );
      });
    }

    // Attach joined models and sort latest first
    return result
      .map(p => ({
        ...p,
        patient: this.getPatientById(p.patient_id),
        doctor: p.doctor_id ? this.getDoctorById(p.doctor_id) : undefined,
        appointment: p.appointment_id ? this.getAppointmentById(p.appointment_id) : undefined,
      }))
      .sort((a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime());
  }

  public getPaymentById(id: string): Payment | undefined {
    const p = this.payments.find(item => item.id === id);
    if (!p) return undefined;
    return {
      ...p,
      patient: this.getPatientById(p.patient_id),
      doctor: p.doctor_id ? this.getDoctorById(p.doctor_id) : undefined,
      appointment: p.appointment_id ? this.getAppointmentById(p.appointment_id) : undefined,
    };
  }

  public getPaymentByReceiptNumber(receiptNo: string): Payment | undefined {
    const p = this.payments.find(item => item.receipt_number.toUpperCase() === receiptNo.trim().toUpperCase());
    if (!p) return undefined;
    return {
      ...p,
      patient: this.getPatientById(p.patient_id),
      doctor: p.doctor_id ? this.getDoctorById(p.doctor_id) : undefined,
      appointment: p.appointment_id ? this.getAppointmentById(p.appointment_id) : undefined,
    };
  }

  public getPaymentsByAppointmentId(appointmentId: string): Payment[] {
    return this.getPayments({ appointmentId });
  }

  public getPaymentsByPatientId(patientId: string): Payment[] {
    return this.getPayments({ patientId });
  }

  public getDailyFinancialSummary(dateStr?: string) {
    const report = this.getDailyCollectionSummary(dateStr);
    return {
      date: report.date,
      totalCollection: report.totalCollection,
      cashCollection: report.cashTotal,
      upiCollection: report.upiTotal,
      cardCollection: report.cardTotal,
      registrationCollection: report.registrationTotal,
      consultationCollection: report.consultationTotal,
      procedureCollection: report.procedureTotal,
      doctorPaymentsCash: report.doctorPaymentsCash,
      expensesCash: report.expensesCash,
      totalCashOutflow: report.totalCashOutflow,
      closingCash: report.closingCash,
      transactionCount: report.transactionCount,
      patientCount: report.patientCount,
      payments: report.payments,
    };
  }

  public createPayment(data: {
    patient_id: string;
    appointment_id?: string;
    doctor_id?: string;
    payment_type: PaymentType;
    amount: number;
    payment_method: PaymentMethod;
    transaction_reference?: string;
    notes?: string;
    collected_at?: string;
  }): Payment {
    const now = new Date().toISOString();
    const receiptNumber = this.generateNextReceiptNumber();
    const newPaymentId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const newPayment: Payment = {
      id: newPaymentId,
      receipt_number: receiptNumber,
      patient_id: data.patient_id,
      appointment_id: data.appointment_id || undefined,
      doctor_id: data.doctor_id || undefined,
      payment_type: data.payment_type,
      amount: Number(data.amount),
      payment_method: data.payment_method,
      payment_status: 'PAID',
      transaction_reference: data.transaction_reference || undefined,
      notes: data.notes || undefined,
      collected_by: this.currentProfile.id,
      collected_by_name: this.currentProfile.full_name,
      collected_at: data.collected_at || now,
      created_at: now,
      updated_at: now,
    };

    this.payments.unshift(newPayment);

    // If registration fee payment, update patient record
    if (data.payment_type === 'REGISTRATION') {
      const patIdx = this.patients.findIndex(p => p.id === data.patient_id);
      if (patIdx !== -1) {
        this.patients[patIdx] = {
          ...this.patients[patIdx],
          registration_fee_paid: true,
          registration_fee_amount: Number(data.amount),
          registration_fee_payment_id: newPayment.id,
          registration_fee_paid_at: newPayment.collected_at,
          updated_at: now,
        };
      }
    }

    // If linked to an appointment, mark appointment paid
    if (data.appointment_id) {
      const aptIdx = this.appointments.findIndex(a => a.id === data.appointment_id);
      if (aptIdx !== -1) {
        this.appointments[aptIdx] = {
          ...this.appointments[aptIdx],
          payment_status: 'PAID',
          payment_id: newPayment.id,
          updated_at: now,
        };
      }
    }

    this.persist();

    // Send automated receipt SMS log if SMS enabled
    if (this.settings.sms_enabled) {
      const patient = this.getPatientById(data.patient_id);
      if (patient && patient.mobile) {
        const clinicName = this.settings.clinic_name || 'AROGYA DENTAL CARE';
        let smsText = `Dear ${patient.first_name}, received Rs.${Number(data.amount)} (${data.payment_method}) at ${clinicName}. Receipt No: ${receiptNumber}.`;
        if (data.payment_type === 'REGISTRATION') {
          smsText = `Dear ${patient.first_name}, registration fee Rs.${Number(data.amount)} received at ${clinicName}. Welcome to our care! Receipt: ${receiptNumber}.`;
        }
        this.sendSms({
          patientId: patient.id,
          paymentId: newPayment.id,
          recipientMobile: patient.mobile,
          messageType: 'RECEIPT',
          messageBody: smsText,
        });
      }
    }

    // Supabase async persistence if client available
    const client = getSupabaseClient();
    if (client) {
      client.from('payments').insert({
        id: newPayment.id,
        receipt_number: newPayment.receipt_number,
        patient_id: newPayment.patient_id,
        appointment_id: newPayment.appointment_id || null,
        doctor_id: newPayment.doctor_id || null,
        payment_type: newPayment.payment_type,
        amount: newPayment.amount,
        payment_method: newPayment.payment_method,
        payment_status: newPayment.payment_status,
        transaction_reference: newPayment.transaction_reference || null,
        notes: newPayment.notes || null,
        collected_by: newPayment.collected_by || null,
        collected_by_name: newPayment.collected_by_name || null,
        collected_at: newPayment.collected_at,
        created_at: newPayment.created_at,
        updated_at: newPayment.updated_at,
      }).then(({ error }) => {
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('Could not find the table')) {
            this.setMissingSupabaseTable('payments', true);
            console.info('ℹ️ Supabase note: Table "public.payments" is not yet created in Supabase (PGRST205). Record safely saved in local storage. Copy the 1-Click Financial Migration SQL from Supabase Setup to sync.');
          } else {
            console.warn('Supabase create payment error:', error);
          }
        } else {
          this.setMissingSupabaseTable('payments', false);
        }
      });
    }

    return {
      ...newPayment,
      patient: this.getPatientById(newPayment.patient_id),
      doctor: newPayment.doctor_id ? this.getDoctorById(newPayment.doctor_id) : undefined,
      appointment: newPayment.appointment_id ? this.getAppointmentById(newPayment.appointment_id) : undefined,
    };
  }

  public cancelPayment(paymentId: string, reason: string): Payment {
    const idx = this.payments.findIndex(p => p.id === paymentId);
    if (idx === -1) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const now = new Date().toISOString();
    const existing = this.payments[idx];
    const updated: Payment = {
      ...existing,
      payment_status: 'CANCELLED',
      cancellation_reason: reason,
      cancelled_by: this.currentProfile.id,
      cancelled_at: now,
      updated_at: now,
    };

    this.payments[idx] = updated;

    // If was registration fee, revert patient registration_fee_paid status
    if (existing.payment_type === 'REGISTRATION') {
      const patIdx = this.patients.findIndex(p => p.id === existing.patient_id);
      if (patIdx !== -1) {
        this.patients[patIdx] = {
          ...this.patients[patIdx],
          registration_fee_paid: false,
          registration_fee_payment_id: undefined,
          updated_at: now,
        };
      }
    }

    // If was linked to appointment, revert appointment payment_status
    if (existing.appointment_id) {
      const aptIdx = this.appointments.findIndex(a => a.id === existing.appointment_id);
      if (aptIdx !== -1) {
        this.appointments[aptIdx] = {
          ...this.appointments[aptIdx],
          payment_status: 'UNPAID',
          payment_id: undefined,
          updated_at: now,
        };
      }
    }

    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('payments').update({
        payment_status: 'CANCELLED',
        cancellation_reason: reason,
        cancelled_by: this.currentProfile.id,
        cancelled_at: now,
        updated_at: now,
      }).eq('id', paymentId).then(({ error }) => {
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            this.setMissingSupabaseTable('payments', true);
          } else {
            console.warn('Supabase cancel payment error:', error);
          }
        }
      });
    }

    return {
      ...updated,
      patient: this.getPatientById(updated.patient_id),
      doctor: updated.doctor_id ? this.getDoctorById(updated.doctor_id) : undefined,
    };
  }

  public refundPayment(paymentId: string, reason: string): Payment {
    const idx = this.payments.findIndex(p => p.id === paymentId);
    if (idx === -1) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const now = new Date().toISOString();
    const existing = this.payments[idx];
    const updated: Payment = {
      ...existing,
      payment_status: 'REFUNDED',
      cancellation_reason: reason,
      cancelled_by: this.currentProfile.id,
      cancelled_at: now,
      updated_at: now,
    };

    this.payments[idx] = updated;
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('payments').update({
        payment_status: 'REFUNDED',
        cancellation_reason: reason,
        cancelled_by: this.currentProfile.id,
        cancelled_at: now,
        updated_at: now,
      }).eq('id', paymentId).then(({ error }) => {
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            this.setMissingSupabaseTable('payments', true);
          } else {
            console.warn('Supabase refund payment error:', error);
          }
        }
      });
    }

    return {
      ...updated,
      patient: this.getPatientById(updated.patient_id),
      doctor: updated.doctor_id ? this.getDoctorById(updated.doctor_id) : undefined,
    };
  }

  // ==========================================
  // DOCTOR PAYMENTS & DISBURSEMENTS
  // ==========================================

  public getDoctorPayments(filters?: {
    doctorId?: string;
    startDate?: string;
    endDate?: string;
  }): DoctorPayment[] {
    let result = [...this.doctorPayments];
    if (filters?.doctorId && filters.doctorId !== 'ALL') {
      result = result.filter(dp => dp.doctor_id === filters.doctorId);
    }
    if (filters?.startDate) {
      result = result.filter(dp => dp.payment_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter(dp => dp.payment_date <= filters.endDate!);
    }
    return result
      .map(dp => ({
        ...dp,
        doctor: this.getDoctorById(dp.doctor_id),
      }))
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }

  public createDoctorPayment(data: {
    doctor_id: string;
    payment_date: string;
    amount: number;
    payment_method: DoctorPaymentMethod;
    reference_number?: string;
    payment_period_from?: string;
    payment_period_to?: string;
    notes?: string;
  }): DoctorPayment {
    const now = new Date().toISOString();
    const newDocPay: DoctorPayment = {
      id: `doc-pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      doctor_id: data.doctor_id,
      payment_date: data.payment_date || now.split('T')[0],
      amount: Number(data.amount),
      payment_method: data.payment_method,
      reference_number: data.reference_number || undefined,
      payment_period_from: data.payment_period_from || undefined,
      payment_period_to: data.payment_period_to || undefined,
      notes: data.notes || undefined,
      paid_by: this.currentProfile.id,
      paid_by_name: this.currentProfile.full_name,
      created_at: now,
      updated_at: now,
    };

    this.doctorPayments.unshift(newDocPay);
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('doctor_payments').insert({
        id: newDocPay.id,
        doctor_id: newDocPay.doctor_id,
        payment_date: newDocPay.payment_date,
        amount: newDocPay.amount,
        payment_method: newDocPay.payment_method,
        reference_number: newDocPay.reference_number || null,
        payment_period_from: newDocPay.payment_period_from || null,
        payment_period_to: newDocPay.payment_period_to || null,
        notes: newDocPay.notes || null,
        paid_by: newDocPay.paid_by || null,
        paid_by_name: newDocPay.paid_by_name || null,
        created_at: newDocPay.created_at,
        updated_at: newDocPay.updated_at,
      }).then(({ error }) => {
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            this.setMissingSupabaseTable('doctor_payments', true);
          } else {
            console.warn('Supabase create doctor payment error:', error);
          }
        }
      });
    }

    return {
      ...newDocPay,
      doctor: this.getDoctorById(newDocPay.doctor_id),
    };
  }

  // ==========================================
  // CLINIC EXPENSES
  // ==========================================

  public generateNextExpenseNumber(): string {
    let maxNum = 0;
    for (const e of this.clinicExpenses) {
      if (e.expense_number && e.expense_number.startsWith('EXP-')) {
        const numPart = e.expense_number.replace('EXP-', '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    const nextNum = maxNum + 1;
    return `EXP-${nextNum.toString().padStart(6, '0')}`;
  }

  public getClinicExpenses(filters?: {
    category?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: PaymentMethod | 'ALL';
  }): ClinicExpense[] {
    let result = [...this.clinicExpenses];
    if (filters?.category && filters.category !== 'ALL') {
      result = result.filter(e => e.category === filters.category);
    }
    if (filters?.startDate) {
      result = result.filter(e => e.expense_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter(e => e.expense_date <= filters.endDate!);
    }
    if (filters?.paymentMethod && filters.paymentMethod !== 'ALL') {
      result = result.filter(e => e.payment_method === filters.paymentMethod);
    }
    return result.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  }

  public createClinicExpense(data: {
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
  }): ClinicExpense {
    const now = new Date().toISOString();
    const expenseNumber = this.generateNextExpenseNumber();

    const newExpense: ClinicExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      expense_number: expenseNumber,
      expense_date: data.expense_date || now.split('T')[0],
      category: data.category,
      description: data.description,
      quantity: data.quantity !== undefined ? Number(data.quantity) : 1,
      unit_cost: data.unit_cost !== undefined ? Number(data.unit_cost) : undefined,
      total_amount: Number(data.total_amount),
      payment_method: data.payment_method || 'CASH',
      vendor: data.vendor || undefined,
      invoice_number: data.invoice_number || undefined,
      notes: data.notes || undefined,
      entered_by: this.currentProfile.id,
      entered_by_name: this.currentProfile.full_name,
      created_at: now,
      updated_at: now,
    };

    this.clinicExpenses.unshift(newExpense);
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('clinic_expenses').insert({
        id: newExpense.id,
        expense_number: newExpense.expense_number,
        expense_date: newExpense.expense_date,
        category: newExpense.category,
        description: newExpense.description,
        quantity: newExpense.quantity || 1,
        unit_cost: newExpense.unit_cost || null,
        total_amount: newExpense.total_amount,
        payment_method: newExpense.payment_method,
        vendor: newExpense.vendor || null,
        invoice_number: newExpense.invoice_number || null,
        notes: newExpense.notes || null,
        entered_by: newExpense.entered_by || null,
        entered_by_name: newExpense.entered_by_name || null,
        created_at: newExpense.created_at,
        updated_at: newExpense.updated_at,
      }).then(({ error }) => {
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            this.setMissingSupabaseTable('clinic_expenses', true);
          } else {
            console.warn('Supabase create expense error:', error);
          }
        }
      });
    }

    return newExpense;
  }

  // ==========================================
  // SMS LOGS & MESSAGING INTEGRATION
  // ==========================================

  public getSmsLogs(patientId?: string): SmsLog[] {
    let result = [...this.smsLogs];
    if (patientId) {
      result = result.filter(s => s.patient_id === patientId);
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public sendSms(data: {
    patientId: string;
    paymentId?: string;
    recipientMobile: string;
    messageType: 'WELCOME' | 'RECEIPT' | 'APPOINTMENT';
    messageBody: string;
  }): SmsLog {
    const now = new Date().toISOString();
    const newLog: SmsLog = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      patient_id: data.patientId,
      payment_id: data.paymentId || undefined,
      recipient_mobile: data.recipientMobile,
      message_type: data.messageType,
      message_body: data.messageBody,
      sms_status: 'SENT',
      sms_sent_at: now,
      created_at: now,
    };

    this.smsLogs.unshift(newLog);
    this.persist();

    const client = getSupabaseClient();
    if (client) {
      client.from('sms_logs').insert({
        id: newLog.id,
        patient_id: newLog.patient_id,
        payment_id: newLog.payment_id || null,
        recipient_mobile: newLog.recipient_mobile,
        message_type: newLog.message_type,
        message_body: newLog.message_body,
        sms_status: newLog.sms_status,
        sms_sent_at: newLog.sms_sent_at,
        created_at: newLog.created_at,
      }).then(({ error }) => {
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            this.setMissingSupabaseTable('sms_logs', true);
          } else {
            console.warn('Supabase sms_log insert error:', error);
          }
        }
      });
    }

    return newLog;
  }

  // ==========================================
  // FINANCIAL REPORTS & METRICS
  // ==========================================

  public getDailyCollectionSummary(dateStr?: string, doctorId?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    let payments = this.payments.filter(
      p => p.collected_at.split('T')[0] === targetDate && p.payment_status === 'PAID'
    );

    if (doctorId && doctorId !== 'ALL') {
      payments = payments.filter(p => p.doctor_id === doctorId);
    }

    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let otherTotal = 0;

    let registrationTotal = 0;
    let consultationTotal = 0;
    let procedureTotal = 0;
    let miscTypeTotal = 0;

    const patientIds = new Set<string>();

    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.payment_method === 'CASH') cashTotal += amt;
      else if (p.payment_method === 'UPI') upiTotal += amt;
      else if (p.payment_method === 'CARD') cardTotal += amt;
      else otherTotal += amt;

      if (p.payment_type === 'REGISTRATION') registrationTotal += amt;
      else if (p.payment_type === 'CONSULTATION') consultationTotal += amt;
      else if (p.payment_type === 'PROCEDURE') procedureTotal += amt;
      else miscTypeTotal += amt;

      if (p.patient_id) patientIds.add(p.patient_id);
    });

    const totalCollection = cashTotal + upiTotal + cardTotal + otherTotal;

    // Day Cash Outflows: Doctor cash disbursements and cash clinic expenses
    const doctorPaymentsCash = this.doctorPayments
      .filter(dp => dp.payment_date === targetDate && dp.payment_method === 'CASH')
      .reduce((sum, dp) => sum + (Number(dp.amount) || 0), 0);

    const expensesCash = this.clinicExpenses
      .filter(e => e.expense_date === targetDate && e.payment_method === 'CASH')
      .reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

    const totalCashOutflow = doctorPaymentsCash + expensesCash;
    const closingCash = cashTotal - totalCashOutflow;

    return {
      date: targetDate,
      totalCollection,
      cashTotal,
      upiTotal,
      cardTotal,
      otherTotal,
      registrationTotal,
      consultationTotal,
      procedureTotal,
      miscTypeTotal,
      transactionCount: payments.length,
      patientCount: patientIds.size,
      doctorPaymentsCash,
      expensesCash,
      totalCashOutflow,
      closingCash,
      payments: payments.map(p => ({
        ...p,
        patient: this.getPatientById(p.patient_id),
        doctor: p.doctor_id ? this.getDoctorById(p.doctor_id) : undefined,
      })),
    };
  }

  public getDoctorWiseCollection(startDate?: string, endDate?: string, filterDoctorId?: string) {
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;

    let validPayments = this.payments.filter(p => {
      const pDate = p.collected_at.split('T')[0];
      return pDate >= start && pDate <= end && p.payment_status === 'PAID';
    });

    if (filterDoctorId && filterDoctorId !== 'ALL') {
      validPayments = validPayments.filter(p => p.doctor_id === filterDoctorId);
    }

    const doctorsList = this.doctors.filter(d => 
      filterDoctorId && filterDoctorId !== 'ALL' ? d.id === filterDoctorId : true
    );

    return doctorsList.map(doc => {
      const docPayments = validPayments.filter(p => p.doctor_id === doc.id);
      let cashAmount = 0;
      let upiAmount = 0;
      let totalAmount = 0;
      const patientSet = new Set<string>();

      docPayments.forEach(p => {
        const amt = Number(p.amount) || 0;
        totalAmount += amt;
        if (p.payment_method === 'CASH') cashAmount += amt;
        else if (p.payment_method === 'UPI') upiAmount += amt;
        if (p.patient_id) patientSet.add(p.patient_id);
      });

      return {
        doctorId: doc.id,
        doctorName: doc.name,
        doctorCode: doc.doctor_code,
        specialization: doc.specialization,
        photoUrl: doc.photo_url,
        patientCount: patientSet.size,
        transactionCount: docPayments.length,
        cashAmount,
        upiAmount,
        totalAmount,
        payments: docPayments,
      };
    });
  }

  public getMonthlyCollectionReport(year?: number, month?: number, filterDoctorId?: string) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month !== undefined ? month : now.getMonth() + 1; // 1-12
    const prefix = `${y}-${m.toString().padStart(2, '0')}`;

    let payments = this.payments.filter(
      p => p.collected_at.startsWith(prefix) && p.payment_status === 'PAID'
    );

    if (filterDoctorId && filterDoctorId !== 'ALL') {
      payments = payments.filter(p => p.doctor_id === filterDoctorId);
    }

    let cashTotal = 0;
    let upiTotal = 0;
    let registrationTotal = 0;
    let consultationTotal = 0;
    let procedureTotal = 0;
    let otherTotal = 0;

    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.payment_method === 'CASH') cashTotal += amt;
      else if (p.payment_method === 'UPI') upiTotal += amt;

      if (p.payment_type === 'REGISTRATION') registrationTotal += amt;
      else if (p.payment_type === 'CONSULTATION') consultationTotal += amt;
      else if (p.payment_type === 'PROCEDURE') procedureTotal += amt;
      else otherTotal += amt;
    });

    const totalCollection = cashTotal + upiTotal;

    // Monthly expenses
    const monthlyExpenses = this.clinicExpenses
      .filter(e => e.expense_date.startsWith(prefix))
      .reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

    // Monthly doctor payments
    const monthlyDoctorPayments = this.doctorPayments
      .filter(dp => dp.payment_date.startsWith(prefix))
      .reduce((sum, dp) => sum + (Number(dp.amount) || 0), 0);

    const netSurplus = totalCollection - (monthlyExpenses + monthlyDoctorPayments);

    return {
      monthStr: prefix,
      totalCollection,
      cashTotal,
      upiTotal,
      registrationTotal,
      consultationTotal,
      procedureTotal,
      otherTotal,
      monthlyExpenses,
      monthlyDoctorPayments,
      netSurplus,
      transactionCount: payments.length,
      doctorBreakdown: this.getDoctorWiseCollection(`${prefix}-01`, `${prefix}-31`, filterDoctorId),
    };
  }

  public getPatientFinancialHistory(patientId: string) {
    const patient = this.getPatientById(patientId);
    const payments = this.getPayments({ patientId });
    const totalPaid = payments
      .filter(p => p.payment_status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const registrationPayment = payments.find(p => p.payment_type === 'REGISTRATION' && p.payment_status === 'PAID');

    return {
      patient,
      payments,
      totalPaid,
      registrationFeePaid: !!patient?.registration_fee_paid || !!registrationPayment,
      registrationReceiptNumber: registrationPayment?.receipt_number,
      registrationFeeAmount: patient?.registration_fee_amount || registrationPayment?.amount || 100,
    };
  }
}

export const clinicRepo = new ClinicRepository();

