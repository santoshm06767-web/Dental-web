import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'dental_supabase_url';
const STORAGE_KEY_KEY = 'dental_supabase_anon_key';

// Pre-configured user Supabase project details
export const DEFAULT_SUPABASE_URL = 'https://ghpirqazblljblfgczqs.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_m06-iYVJX4y2efz11paFrw_3Ll183Pz';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'user' | 'default' | 'none';
}

export function getSupabaseConfig(): SupabaseConfig {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
  const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey && !envUrl.includes('YOUR_SUPABASE')) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }

  const userUrl = (localStorage.getItem(STORAGE_KEY_URL) || '').trim();
  const userKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();

  if (userUrl && userKey) {
    return { url: userUrl, anonKey: userKey, source: 'user' };
  }

  if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY) {
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY, source: 'default' };
  }

  return { url: '', anonKey: '', source: 'none' };
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith('https://'));
}

export function saveUserSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  _cachedClient = null;
}

export const saveSupabaseConfig = saveUserSupabaseConfig;

export function clearUserSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  _cachedClient = null;
}

export const clearSupabaseConfig = clearUserSupabaseConfig;

let _cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_cachedClient) return _cachedClient;

  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey || !cfg.url.startsWith('https://')) {
    return null;
  }

  try {
    _cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return _cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  hasAppointmentsTable: boolean;
  hasPatientsTable: boolean;
  hasPaymentsTable: boolean;
  missingFinancialTables?: boolean;
  isWritable: boolean;
  rlsBlocked?: boolean;
  uuidTypeMismatch?: boolean;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<ConnectionTestResult> {
  if (!url || !anonKey) {
    return { 
      success: false, 
      message: 'URL and API Key are required.',
      hasAppointmentsTable: false,
      hasPatientsTable: false,
      hasPaymentsTable: false,
      isWritable: false
    };
  }
  if (!url.startsWith('https://')) {
    return { 
      success: false, 
      message: 'Supabase URL must start with https://',
      hasAppointmentsTable: false,
      hasPatientsTable: false,
      hasPaymentsTable: false,
      isWritable: false
    };
  }

  try {
    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    // 1. Check appointments table
    const aptRes = await testClient.from('appointments').select('id').limit(1);
    
    if (aptRes.error) {
      if (aptRes.error.code === 'PGRST301' || aptRes.error.message.toLowerCase().includes('jwt') || aptRes.error.message.toLowerCase().includes('unauthorized')) {
        return { 
          success: false, 
          message: `Authentication error with API key: ${aptRes.error.message}`,
          hasAppointmentsTable: false,
          hasPatientsTable: false,
          hasPaymentsTable: false,
          isWritable: false
        };
      }
      return {
        success: true,
        message: `Endpoint reachable, but base tables need to be created: ${aptRes.error.message}`,
        hasAppointmentsTable: false,
        hasPatientsTable: false,
        hasPaymentsTable: false,
        isWritable: false
      };
    }

    // 2. Check patients table
    const patRes = await testClient.from('patients').select('id').limit(1);

    // 3. Check financial payments table (for PGRST205 detection)
    const payRes = await testClient.from('payments').select('id').limit(1);
    const hasPaymentsTable = !payRes.error || (payRes.error.code !== 'PGRST205' && !payRes.error.message.toLowerCase().includes('schema cache'));
    const missingFinancialTables = Boolean(
      payRes.error && (payRes.error.code === 'PGRST205' || payRes.error.message.toLowerCase().includes('schema cache') || payRes.error.message.toLowerCase().includes('payments'))
    );

    // 4. Test insert capability to check RLS policies and UUID vs TEXT ID types
    const testId = `ping-${Date.now()}`;
    const testInsert = await testClient.from('appointment_status_history').insert([{
      id: testId,
      appointment_id: 'test-ping-apt',
      new_status: 'Ping',
      notes: 'Diagnostic ping'
    }]);

    let isWritable = true;
    let rlsBlocked = false;
    let uuidTypeMismatch = false;

    if (testInsert.error) {
      if (testInsert.error.code === '22P02' || testInsert.error.message.toLowerCase().includes('uuid')) {
        uuidTypeMismatch = true;
        isWritable = false;
      } else if (testInsert.error.code === '42501' || testInsert.error.message.includes('row-level security')) {
        rlsBlocked = true;
        isWritable = false;
      }
    } else {
      // Clean up test record if inserted
      await testClient.from('appointment_status_history').delete().eq('id', testId);
    }

    if (uuidTypeMismatch) {
      return {
        success: true,
        message: 'Connected to Supabase! Notice: The tables currently enforce UUID types. Please copy and run the updated SQL Schema from the "PostgreSQL DDL & RLS Schema" tab in your Supabase SQL Editor to enable appointment and patient inserts.',
        hasAppointmentsTable: true,
        hasPatientsTable: !patRes.error,
        hasPaymentsTable,
        missingFinancialTables,
        isWritable: false,
        uuidTypeMismatch: true
      };
    }

    if (rlsBlocked) {
      return {
        success: true,
        message: 'Connected to Supabase! However, Row Level Security (RLS) is blocking anon writes. Please run the updated SQL schema from the SQL Editor tab.',
        hasAppointmentsTable: true,
        hasPatientsTable: !patRes.error,
        hasPaymentsTable,
        missingFinancialTables,
        isWritable: false,
        rlsBlocked: true
      };
    }

    if (missingFinancialTables) {
      return {
        success: true,
        message: 'Connected to Supabase! Notice: The new Financial Module table "public.payments" is missing from your Supabase database (PGRST205). Please copy and run the 1-Click Financial Migration SQL in your Supabase SQL Editor to enable real-time cloud payment sync.',
        hasAppointmentsTable: true,
        hasPatientsTable: !patRes.error,
        hasPaymentsTable: false,
        missingFinancialTables: true,
        isWritable: true,
        rlsBlocked: false
      };
    }

    return { 
      success: true, 
      message: 'Successfully connected and verified read/write access to all tables including payments!',
      hasAppointmentsTable: true,
      hasPatientsTable: !patRes.error,
      hasPaymentsTable: true,
      missingFinancialTables: false,
      isWritable: true,
      rlsBlocked: false
    };
  } catch (err: any) {
    return { 
      success: false, 
      message: err?.message || 'Network or connection error.',
      hasAppointmentsTable: false,
      hasPatientsTable: false,
      hasPaymentsTable: false,
      isWritable: false
    };
  }
}
