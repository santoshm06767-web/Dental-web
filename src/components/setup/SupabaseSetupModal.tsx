import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection, 
  isSupabaseConfigured,
  ConnectionTestResult,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY
} from '../../services/supabaseClient';
import { COMPLETE_POSTGRES_SCHEMA, FINANCIAL_MIGRATION_SQL, PAYMENTS_ONLY_SQL } from '../../services/sqlSchema';
import { clinicRepo } from '../../services/clinicRepository';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
  defaultTab?: 'connect' | 'guide' | 'sql' | 'financial_migration';
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  defaultTab,
}) => {
  const [url, setUrl] = useState(DEFAULT_SUPABASE_URL);
  const [anonKey, setAnonKey] = useState(DEFAULT_SUPABASE_ANON_KEY);
  const [activeTab, setActiveTab] = useState<'connect' | 'guide' | 'sql' | 'financial_migration'>(
    defaultTab || (clinicRepo.hasMissingFinancialTables() ? 'financial_migration' : 'connect')
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedMigrationSql, setCopiedMigrationSql] = useState(false);
  const [copiedQuickSql, setCopiedQuickSql] = useState(false);
  const [migrationMode, setMigrationMode] = useState<'quick' | 'full'>('quick');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url || DEFAULT_SUPABASE_URL);
      setAnonKey(config.anonKey || DEFAULT_SUPABASE_ANON_KEY);
      setTestResult(null);
      setSyncStatus(null);
      setPullStatus(null);
      if (defaultTab) {
        setActiveTab(defaultTab);
      } else if (clinicRepo.hasMissingFinancialTables()) {
        setActiveTab('financial_migration');
      }
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Supabase Project URL and Anon/Public API Key.',
        hasAppointmentsTable: false,
        hasPatientsTable: false,
        isWritable: false,
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setSyncStatus(null);

    const res = await testSupabaseConnection(url.trim(), anonKey.trim());
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      saveSupabaseConfig(url.trim(), anonKey.trim());
      onConnected();
    }
  };

  const handleManualPush = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const res = await clinicRepo.syncWithSupabase();
    setIsSyncing(false);
    setSyncStatus(res);
    if (res.success) {
      onConnected();
    }
  };

  const handleManualPull = async () => {
    setIsPulling(true);
    setPullStatus(null);
    const res = await clinicRepo.fetchFromSupabase();
    setIsPulling(false);
    setPullStatus(res);
    if (res.success) {
      onConnected();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(COMPLETE_POSTGRES_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyMigrationSql = () => {
    navigator.clipboard.writeText(FINANCIAL_MIGRATION_SQL);
    setCopiedMigrationSql(true);
    setTimeout(() => setCopiedMigrationSql(false), 2500);
  };

  const handleCopyQuickSql = () => {
    navigator.clipboard.writeText(PAYMENTS_ONLY_SQL);
    setCopiedQuickSql(true);
    setTimeout(() => setCopiedQuickSql(false), 2500);
  };

  const currentlyConnected = isSupabaseConfigured();
  const hasMissingPayments = clinicRepo.isTableMissingInSupabase('payments') || testResult?.hasPaymentsTable === false || testResult?.missingFinancialTables;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-slate-900 text-base">Supabase PostgreSQL Integration</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  currentlyConnected 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {currentlyConnected ? 'Connected to Project' : 'Offline / Local Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Arogya Dental Care & Implant Centre Database Synchronization
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50 space-x-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'connect' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Connection Settings
          </button>
          <button
            onClick={() => setActiveTab('financial_migration')}
            className={`pb-2.5 border-b-2 cursor-pointer transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'financial_migration' ? 'border-amber-600 text-amber-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Financial Migration (Fix PGRST205)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
              hasMissingPayments ? 'bg-amber-200 text-amber-900 animate-pulse' : 'bg-slate-200 text-slate-700'
            }`}>
              {hasMissingPayments ? 'Action Needed' : 'SQL'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 border-b-2 cursor-pointer transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'sql' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Full PostgreSQL Schema</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-bold">Complete</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'guide' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            5-Step Setup Guide
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* TAB 1: CONNECTION */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              
              {/* Missing payments table banner (PGRST205) */}
              {hasMissingPayments && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 space-y-2.5">
                  <div className="flex items-start space-x-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <strong className="block font-bold text-sm">Supabase Notice: Table &apos;public.payments&apos; Not in Schema Cache (PGRST205)</strong>
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-mono text-[10px] font-bold">PGRST205</span>
                      </div>
                      <p className="text-xs text-amber-800 mt-1">
                        Your clinic app has added real-time financial tracking (patient collection receipts, doctor disbursements, operational expenses). However, your remote Supabase database does not have the <code>public.payments</code> table yet, which triggers warning <code>PGRST205</code>.
                      </p>
                      <p className="text-xs text-amber-800 mt-1 font-medium">
                        ✅ Your payments are <strong>safely saved in local storage</strong>. To enable two-way cloud sync with Supabase, run the 1-Click Financial Migration SQL.
                      </p>
                    </div>
                  </div>
                  <div className="pl-7 pt-1 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyMigrationSql();
                        setActiveTab('financial_migration');
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedMigrationSql ? 'Copied!' : 'Copy Financial Migration SQL & Open Tab'}</span>
                    </button>
                    <span className="text-[11px] text-amber-700">Paste and click <strong>Run</strong> in Supabase SQL Editor.</span>
                  </div>
                </div>
              )}

              {/* Important Banner about UUID vs TEXT schema */}
              {testResult?.uuidTypeMismatch && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 space-y-2.5">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-sm">Action Required: Update Supabase Schema</strong>
                      <p className="text-xs text-amber-800 mt-1">
                        Your Supabase tables currently enforce strict <code>UUID</code> primary keys. The clinic reception system uses formatted clinic codes (e.g. <code>DOC-001</code>, <code>PAT-000001</code>, <code>APT-000101</code>). Because of this mismatch, Postgres rejected previous appointment inserts.
                      </p>
                    </div>
                  </div>
                  <div className="pl-7 pt-1 flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopySql();
                        setActiveTab('sql');
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Updated SQL Schema & Go to SQL Tab</span>
                    </button>
                    <span className="text-[11px] text-amber-700">Paste and click <strong>Run</strong> in Supabase SQL Editor.</span>
                  </div>
                </div>
              )}

              {testResult && !testResult.uuidTypeMismatch && (
                <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
                  testResult.success && testResult.isWritable
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                    : testResult.success && !testResult.isWritable
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  {testResult.success && testResult.isWritable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-bold">
                      {testResult.success && testResult.isWritable 
                        ? 'Supabase Read/Write Verified!' 
                        : testResult.success 
                        ? 'Supabase Reachable (Write Check Notice)' 
                        : 'Connection Failed'}
                    </strong>
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* Sync Status Banner */}
              {syncStatus && (
                <div className={`p-3 rounded-xl border flex items-center space-x-2 ${
                  syncStatus.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  {syncStatus.success ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{syncStatus.message}</span>
                </div>
              )}

              {/* Pull Status Banner */}
              {pullStatus && (
                <div className={`p-3 rounded-xl border flex items-center space-x-2 ${
                  pullStatus.success ? 'bg-sky-50 border-sky-300 text-sky-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  {pullStatus.success ? <Check className="w-4 h-4 text-sky-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{pullStatus.message}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supabase Project URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    id="input-supabase-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://ghpirqazblljblfgczqs.supabase.co"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Found in Supabase Dashboard → Settings → API → Project URL
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supabase Anon / Public Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="input-supabase-key"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="sb_publishable_m06-iYVJX4y2efz11paFrw_3Ll183Pz..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Found in Supabase Dashboard → Settings → API → Project API Keys (anon / public)
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('sql')}
                  className="text-sky-700 hover:text-sky-900 font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <span>View Updated SQL Schema</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="btn-test-supabase-connection"
                    onClick={handleTestAndSave}
                    disabled={isTesting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Test & Save Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Data Synchronization Tools */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-slate-900">Cloud Data Synchronization Tools</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  You can push all existing local patients, doctors, and appointments to Supabase in one click, or fetch cloud records down to this browser:
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleManualPush}
                    disabled={isSyncing}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>{isSyncing ? 'Pushing Data...' : 'Push Local Data to Supabase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualPull}
                    disabled={isPulling}
                    className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isPulling ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span>{isPulling ? 'Fetching Data...' : 'Fetch from Supabase'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: FINANCIAL MODULE MIGRATION (PGRST205 FIX) */}
          {activeTab === 'financial_migration' && (
            <div className="space-y-4">
              
              {/* Alert for Backend Error in Supabase SQL Editor */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-950 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Fix Supabase &quot;Backend error! Retry your query&quot; &amp; PGRST205</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  If Supabase returned <strong>&quot;Backend error! Retry your query&quot;</strong>, the Supabase web dashboard proxy timed out running the entire multi-table batch. Use <strong>Option 1 (Quick Fix: Payments Table Only)</strong> below — it is only 15 lines, executes in &lt;100ms, and fixes the error instantly!
                </p>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setMigrationMode('quick')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                    migrationMode === 'quick'
                      ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Option 1: Quick Fix (Payments Table Only — 15 Lines)</span>
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[10px] rounded font-bold">Recommended</span>
                </button>
                <button
                  onClick={() => setMigrationMode('full')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                    migrationMode === 'full'
                      ? 'bg-white text-amber-800 shadow-xs border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                  <span>Option 2: Full Financial Suite (All 4 Tables)</span>
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-xs">
                  {migrationMode === 'quick' ? 'Quick Payments Table SQL:' : 'Complete Financial Migration SQL:'}
                </span>
                <div className="flex items-center space-x-2">
                  {migrationMode === 'quick' ? (
                    <button
                      onClick={handleCopyQuickSql}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
                    >
                      {copiedQuickSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedQuickSql ? 'Copied Quick SQL!' : 'Copy Quick Payments SQL (15 Lines)'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCopyMigrationSql}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
                    >
                      {copiedMigrationSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMigrationSql ? 'Copied Full SQL!' : 'Copy Full Migration SQL'}</span>
                    </button>
                  )}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1 transition-colors"
                  >
                    <span>Supabase Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Quick 3-Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-900 block">Step 1: Copy SQL</span>
                  <span className="text-slate-600">Click the button above to copy the {migrationMode === 'quick' ? 'Quick' : 'Full'} script.</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-900 block">Step 2: Run in Supabase</span>
                  <span className="text-slate-600">In Supabase Dashboard → SQL Editor, click <strong>+ New query</strong>, paste and hit <strong>Run</strong>.</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-900 block">Step 3: Test & Sync</span>
                  <span className="text-slate-600">Return to Connection Settings and click <strong>Test & Save Connection</strong>.</span>
                </div>
              </div>

              <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-[320px] border border-slate-800">
                <pre>{migrationMode === 'quick' ? PAYMENTS_ONLY_SQL : FINANCIAL_MIGRATION_SQL}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: COMPLETE SQL SCHEMA CODE */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-sky-950 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-xs text-sky-900">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span>Compatible with String Clinic Codes & Anon Public Key</span>
                </div>
                <p className="text-[11px] text-sky-800">
                  This updated schema safely drops previous tables and recreates them with <code>TEXT</code> primary keys (for <code>DOC-001</code>, <code>PAT-000001</code>, <code>APT-000101</code>) and configures full Row Level Security (RLS) policies for anon publishable keys.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-xs">
                  Copy and paste into Supabase Dashboard → <strong>SQL Editor</strong>:
                </span>
                <button
                  onClick={handleCopySql}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-[350px] border border-slate-800">
                <pre>{COMPLETE_POSTGRES_SCHEMA}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="space-y-3">
                
                {/* Step 1 */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">1</span>
                      <span>Open Supabase Project</span>
                    </span>
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sky-600 hover:text-sky-800 font-semibold flex items-center space-x-1 text-[11px]"
                    >
                      <span>supabase.com/dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-600 text-[11px] pl-7">
                    Open your project <strong>ghpirqazblljblfgczqs</strong>.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Go to SQL Editor & Paste Schema</span>
                  </span>
                  <p className="text-slate-600 text-[11px] pl-7">
                    Click <strong>SQL Editor</strong> on the left sidebar. Click <strong>+ New query</strong>, paste the script from the <strong>PostgreSQL DDL & RLS Schema</strong> tab, and click <strong>Run</strong>.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Check Table Editor</span>
                  </span>
                  <p className="text-slate-600 text-[11px] pl-7">
                    Navigate to <strong>Table Editor</strong> to view <code>appointments</code>, <code>patients</code>, <code>doctors</code>, and <code>clinic_settings</code> populated with seed data.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Book Appointments in App</span>
                  </span>
                  <p className="text-slate-600 text-[11px] pl-7">
                    Whenever you register a patient or book an appointment in the app, it instantly inserts the row directly into your Supabase table!
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
