import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  IndianRupee, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Printer, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Building2, 
  QrCode, 
  Banknote, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Stethoscope, 
  ShoppingBag, 
  MessageSquare, 
  Clock, 
  Send,
  Eye,
  FileSpreadsheet,
  Database,
  AlertTriangle
} from 'lucide-react';
import { 
  Payment, 
  DoctorPayment, 
  ClinicExpense, 
  SmsLog, 
  UserRole, 
  Profile, 
  ClinicSettings, 
  PaymentType, 
  PaymentMethod 
} from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { formatCurrency } from '../../utils/numberToWords';
import { CollectPaymentModal } from './CollectPaymentModal';
import { MoneyReceiptModal } from './MoneyReceiptModal';
import { RecordExpenseModal } from './RecordExpenseModal';
import { DoctorPaymentModal } from './DoctorPaymentModal';

interface FinanceModuleProps {
  userRole: UserRole;
  currentProfile: Profile;
  settings?: ClinicSettings;
  onRefresh?: () => void;
  onOpenSupabaseModal?: () => void;
  onCollectPayment?: () => void;
  onViewReceipt?: (p: Payment) => void;
}

type FinanceTab = 
  | 'daily_desk' 
  | 'payments_ledger' 
  | 'doctor_settlements' 
  | 'clinic_expenses' 
  | 'monthly_reports' 
  | 'sms_logs';

export const FinanceModule: React.FC<FinanceModuleProps> = ({
  userRole,
  currentProfile,
  settings,
  onRefresh,
  onOpenSupabaseModal,
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('daily_desk');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Modals state
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [isRecordExpenseOpen, setIsRecordExpenseOpen] = useState(false);
  const [isDoctorPaymentOpen, setIsDoctorPaymentOpen] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data queries
  const allPayments = clinicRepo.getPayments();
  const allExpenses = clinicRepo.getClinicExpenses();
  const allDoctorPayments = clinicRepo.getDoctorPayments();
  const allSmsLogs = clinicRepo.getSmsLogs();
  const doctors = clinicRepo.getDoctors();
  const dailySummary = clinicRepo.getDailyCollectionSummary(selectedDate);
  const doctorWiseCollections = clinicRepo.getDoctorWiseCollection();
  const monthlyReport = clinicRepo.getMonthlyCollectionReport();

  // Filtered Payments for General Ledger
  const filteredPayments = useMemo(() => {
    return allPayments.filter(p => {
      // Date filter
      if (dateFrom && p.collected_at.split('T')[0] < dateFrom) return false;
      if (dateTo && p.collected_at.split('T')[0] > dateTo) return false;
      
      // Type filter
      if (selectedTypeFilter !== 'ALL' && p.payment_type !== selectedTypeFilter) return false;
      
      // Method filter
      if (selectedMethodFilter !== 'ALL' && p.payment_method !== selectedMethodFilter) return false;

      // Doctor filter
      if (selectedDoctorFilter !== 'ALL' && p.doctor_id !== selectedDoctorFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = p.patient ? `${p.patient.first_name} ${p.patient.last_name}`.toLowerCase() : '';
        const pCode = p.patient?.patient_code?.toLowerCase() || '';
        const recNum = p.receipt_number.toLowerCase();
        const utr = (p.transaction_reference || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        if (!pName.includes(q) && !pCode.includes(q) && !recNum.includes(q) && !utr.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allPayments, dateFrom, dateTo, selectedTypeFilter, selectedMethodFilter, selectedDoctorFilter, searchQuery]);

  // Today's Payments for Daily Desk
  const todayPayments = useMemo(() => {
    return allPayments.filter(p => p.collected_at.split('T')[0] === selectedDate);
  }, [allPayments, selectedDate]);

  // Today's Expenses
  const todayExpenses = useMemo(() => {
    return allExpenses.filter(e => e.expense_date === selectedDate);
  }, [allExpenses, selectedDate]);

  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);
  const netCashInHand = (dailySummary.cashTotal || 0) - todayExpenses.filter(e => e.payment_method === 'CASH').reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

  const handlePrintDailySheet = () => {
    window.print();
  };

  const handleCancelPayment = (id: string) => {
    const reason = window.prompt('Enter reason for cancelling this payment receipt:');
    if (reason && reason.trim()) {
      clinicRepo.cancelPayment(id, reason.trim());
      if (onRefresh) onRefresh();
    }
  };

  const handleRefundPayment = (id: string) => {
    const reason = window.prompt('Enter reason for refunding this payment:');
    if (reason && reason.trim()) {
      clinicRepo.refundPayment(id, reason.trim());
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Notice Banner: Missing payments table in Supabase (PGRST205) */}
      {clinicRepo.isTableMissingInSupabase('payments') && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-lg shrink-0 mt-0.5 sm:mt-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <strong className="font-bold text-xs">Supabase Cloud Sync Notice (Error PGRST205)</strong>
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[10px] font-mono font-bold">payments table pending</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                All patient receipts, doctor payouts, and expenses are currently stored safely in your local browser ledger. To sync to Supabase, run the 1-Click Financial Migration SQL.
              </p>
            </div>
          </div>
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs flex items-center justify-center space-x-1"
            >
              <span>View 1-Click Migration SQL</span>
            </button>
          )}
        </div>
      )}

      {/* Top Banner & Quick Metrics */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-[16px] font-black tracking-tight text-white">
                  Cash / Account Desk
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Live Terminal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time collection registers, doctor disbursements, operational expenses & financial audit
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCollectPaymentOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Collect Fee / New Receipt</span>
            </button>

            <button
              onClick={() => setIsRecordExpenseOpen(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => setIsDoctorPaymentOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Doctor Payout</span>
              </button>
            )}

            <button
              onClick={handlePrintDailySheet}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Print collection summary"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Date Selector & 4 Metric Cards */}
        <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-semibold">Active Accounting Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-4xl">
            {/* Card 1: Today's Total Collection */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Collection ({selectedDate})
              </div>
              <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
                {formatCurrency(dailySummary.totalCollection)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {dailySummary.transactionCount} receipt(s) issued
              </div>
            </div>

            {/* Card 2: Cash Collection */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cash Inflow</span>
              </div>
              <div className="text-xl font-black text-white mt-0.5 font-mono">
                {formatCurrency(dailySummary.cashTotal)}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">
                Physical Cash in Drawer
              </div>
            </div>

            {/* Card 3: Digital / UPI */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <QrCode className="w-3.5 h-3.5 text-sky-400" />
                <span>UPI / Digital Inflow</span>
              </div>
              <div className="text-xl font-black text-white mt-0.5 font-mono">
                {formatCurrency(dailySummary.upiTotal)}
              </div>
              <div className="text-[10px] text-sky-400 mt-1">
                Direct Clinic Bank Credit
              </div>
            </div>

            {/* Card 4: Net Cash in Hand */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Net Cash in Drawer
              </div>
              <div className="text-xl font-black text-amber-400 mt-0.5 font-mono">
                {formatCurrency(netCashInHand)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                After petty expenses (₹{todayExpenseTotal})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 overflow-x-auto space-x-1 shadow-xs">
        <button
          onClick={() => setActiveTab('daily_desk')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-2 ${
            activeTab === 'daily_desk'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Daily Cash Desk ({selectedDate})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments_ledger')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-2 ${
            activeTab === 'payments_ledger'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Complete Payments Ledger</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
            {allPayments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('doctor_settlements')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-2 ${
            activeTab === 'doctor_settlements'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Doctor Collections & Disbursements</span>
        </button>

        <button
          onClick={() => setActiveTab('clinic_expenses')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-2 ${
            activeTab === 'clinic_expenses'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Clinic Expenses ({allExpenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly_reports')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-2 ${
            activeTab === 'monthly_reports'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Monthly Audit & Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('sms_logs')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-2 ${
            activeTab === 'sms_logs'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS Audit Logs</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
            {allSmsLogs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: DAILY CASH DESK */}
      {activeTab === 'daily_desk' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Daily Cash Desk Register & Money Receipts for {selectedDate}
              </h2>
              <p className="text-xs text-slate-500">
                Chronological list of all fee transactions collected today at the front desk
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600">Breakdown:</span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
                Reg: {formatCurrency(dailySummary.registrationTotal || 0)}
              </span>
              <span className="px-2.5 py-1 bg-sky-50 text-sky-800 rounded-lg text-xs font-bold border border-sky-200">
                Consult: {formatCurrency(dailySummary.consultationTotal || 0)}
              </span>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg text-xs font-bold border border-indigo-200">
                Procedure: {formatCurrency(dailySummary.procedureTotal || 0)}
              </span>
            </div>
          </div>

          {todayPayments.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-bold text-sm">No fee collections recorded for {selectedDate}</p>
              <p className="text-slate-500 text-xs mt-1">Click "Collect Fee / New Receipt" above to issue a receipt.</p>
              <button
                onClick={() => setIsCollectPaymentOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                + Issue First Receipt
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Receipt No</th>
                    <th className="py-3 px-3">Time</th>
                    <th className="py-3 px-3">Patient Name / UHID</th>
                    <th className="py-3 px-3">Doctor</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3 text-right">Amount (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Receipt Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayPayments.map((p) => {
                    const pat = p.patient || clinicRepo.getPatientById(p.patient_id);
                    const doc = p.doctor || (p.doctor_id ? clinicRepo.getDoctorById(p.doctor_id) : undefined);
                    const timeStr = new Date(p.collected_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {p.receipt_number}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{timeStr}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {pat ? `${pat.first_name} ${pat.last_name}` : 'Unknown Patient'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {pat?.patient_code} | {pat?.mobile}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {doc ? (
                            <span className="font-medium text-slate-800">{doc.name}</span>
                          ) : (
                            <span className="text-slate-400">Clinic General</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {p.payment_type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {p.payment_method === 'CASH' ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                              <Banknote className="w-3 h-3" />
                              <span>CASH</span>
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center space-x-1 text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[10px]">
                                <QrCode className="w-3 h-3" />
                                <span>{p.payment_method}</span>
                              </span>
                              {p.transaction_reference && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[130px]" title={p.transaction_reference}>
                                  Ref: {p.transaction_reference}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {p.payment_status === 'PAID' && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                              PAID
                            </span>
                          )}
                          {p.payment_status === 'CANCELLED' && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                              CANCELLED
                            </span>
                          )}
                          {p.payment_status === 'REFUNDED' && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                              REFUNDED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setActiveReceiptPayment(p)}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Send SMS / WhatsApp Receipt to patient"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                              <span>SMS</span>
                            </button>

                            <button
                              onClick={() => setActiveReceiptPayment(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                              title="View & Print Money Receipt"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Receipt</span>
                            </button>

                            {userRole === 'admin' && p.payment_status === 'PAID' && (
                              <button
                                onClick={() => handleCancelPayment(p.id)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Cancel receipt"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={6} className="py-3 px-3 text-right text-slate-700 uppercase">
                      Total Collections Today:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800 text-base">
                      {formatCurrency(dailySummary.totalCollection)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPLETE PAYMENTS LEDGER */}
      {activeTab === 'payments_ledger' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-5">
          
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">Search Records</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Patient name, phone, UHID, receipt no, UTR..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Fee Type</label>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Types</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="REGISTRATION">Registration</option>
                <option value="FOLLOW_UP">Follow-Up</option>
                <option value="PROCEDURE">Procedure</option>
              </select>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Payment Mode</label>
              <select
                value={selectedMethodFilter}
                onChange={(e) => setSelectedMethodFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Modes</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            {/* Doctor */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Doctor</label>
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing <strong>{filteredPayments.length}</strong> payment transactions</span>
            <span>
              Total Filtered Sum:{' '}
              <strong className="text-emerald-700 text-sm font-mono font-bold">
                {formatCurrency(filteredPayments.filter(p => p.payment_status === 'PAID').reduce((s, p) => s + p.amount, 0))}
              </strong>
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Receipt No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Doctor</th>
                  <th className="py-3 px-3">Particulars</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map(p => {
                  const pat = p.patient || clinicRepo.getPatientById(p.patient_id);
                  const doc = p.doctor || (p.doctor_id ? clinicRepo.getDoctorById(p.doctor_id) : undefined);
                  const dateFormatted = new Date(p.collected_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{p.receipt_number}</td>
                      <td className="py-3 px-3 text-slate-500">{dateFormatted}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{pat ? `${pat.first_name} ${pat.last_name}` : 'Unknown'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{pat?.patient_code}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{doc ? doc.name : 'OPD'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">
                          {p.payment_type}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.payment_method === 'CASH' ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'
                        }`}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setActiveReceiptPayment(p)}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                            title="Send SMS / WhatsApp Receipt"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                            <span>SMS</span>
                          </button>
                          <button
                            onClick={() => setActiveReceiptPayment(p)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-700" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: DOCTOR COLLECTIONS & SETTLEMENTS */}
      {activeTab === 'doctor_settlements' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Doctor Collections, Patients Attended & Payout Settlements
              </h2>
              <p className="text-xs text-slate-500">
                Performance breakdown and consultation share disbursements for all clinic specialists
              </p>
            </div>

            {userRole === 'admin' && (
              <button
                onClick={() => setIsDoctorPaymentOpen(true)}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Record Doctor Disbursement</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctorWiseCollections.map(doc => {
              const docDisbursements = allDoctorPayments
                .filter(dp => dp.doctor_id === doc.doctorId)
                .reduce((sum, dp) => sum + (Number(dp.amount) || 0), 0);
              
              const netBalance = doc.totalAmount - docDisbursements;

              return (
                <div key={doc.doctorId} className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{doc.doctorName}</h3>
                        <p className="text-xs text-indigo-700 font-medium">{doc.specialization}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold rounded">
                        {doc.doctorCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 my-4 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Patients Seen</span>
                        <span className="text-lg font-black text-slate-800 mt-0.5 block">{doc.patientCount}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Collection</span>
                        <span className="text-lg font-black text-emerald-700 mt-0.5 block font-mono">{formatCurrency(doc.totalAmount)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Cash Collection</span>
                        <span className="text-sm font-bold text-slate-700 font-mono">{formatCurrency(doc.cashAmount)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">UPI / Digital</span>
                        <span className="text-sm font-bold text-sky-700 font-mono">{formatCurrency(doc.upiAmount)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Total Clinic Disbursed:</span>
                        <span className="font-mono font-bold text-indigo-800">{formatCurrency(docDisbursements)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-900 font-bold pt-1 border-t border-slate-100">
                        <span>Net Account Balance:</span>
                        <span className="font-mono text-emerald-700">{formatCurrency(netBalance)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-end">
                    <button
                      onClick={() => {
                        setSelectedDoctorFilter(doc.doctorId);
                        setActiveTab('payments_ledger');
                      }}
                      className="text-xs text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
                    >
                      View All Patient Receipts →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recorded Doctor Disbursements Table */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Recorded Doctor Disbursements & Remuneration Outflow
            </h3>
            {allDoctorPayments.length === 0 ? (
              <p className="text-xs text-slate-500">No doctor disbursements recorded yet.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Doctor</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Reference / UTR</th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allDoctorPayments.map(dp => {
                      const doc = doctors.find(d => d.id === dp.doctor_id);
                      return (
                        <tr key={dp.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-600">{dp.payment_date}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{doc?.name || 'Doctor'}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-semibold text-[10px]">
                              {dp.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{dp.reference_number || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {dp.payment_period_from && dp.payment_period_to ? `${dp.payment_period_from} to ${dp.payment_period_to}` : 'Current'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{dp.notes || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-800">
                            {formatCurrency(dp.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 4: CLINIC EXPENSES */}
      {activeTab === 'clinic_expenses' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Clinic Operational & Material Expense Register
              </h2>
              <p className="text-xs text-slate-500">
                Audit track for dental consumables, PPE, sterilisation, stationery & clinic petty cash
              </p>
            </div>

            <button
              onClick={() => setIsRecordExpenseOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Clinic Expense</span>
            </button>
          </div>

          {allExpenses.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-bold text-sm">No clinic expenses recorded yet</p>
              <p className="text-slate-500 text-xs mt-1">Record petty cash outflows and vendor invoices easily.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Description / Item</th>
                    <th className="py-3 px-3">Vendor / Invoice</th>
                    <th className="py-3 px-3">Paid Via</th>
                    <th className="py-3 px-3">Recorded By</th>
                    <th className="py-3 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{exp.expense_date}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{exp.description}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {exp.vendor || 'Direct Store'}
                        {exp.invoice_number && (
                          <div className="font-mono text-[10px] text-slate-400">Inv: {exp.invoice_number}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold">
                          {exp.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{exp.entered_by_name || 'Staff'}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 text-sm">
                        {formatCurrency(exp.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                  <tr>
                    <td colSpan={6} className="py-3 px-3 text-right text-slate-700 uppercase">
                      Total Clinic Expenses:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-800 text-base">
                      {formatCurrency(allExpenses.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

        </div>
      )}

      {/* TAB 5: MONTHLY FINANCIAL REPORTS & AUDIT */}
      {activeTab === 'monthly_reports' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Monthly Financial Audit & Performance Statements ({monthlyReport.monthStr})
              </h2>
              <p className="text-xs text-slate-500">
                Gross Collections, Operational Overhead & Net Clinic Financial Health
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs font-bold uppercase">Total Clinic Collections</span>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {formatCurrency(monthlyReport.totalCollection)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Cash: {formatCurrency(monthlyReport.cashTotal)} | UPI: {formatCurrency(monthlyReport.upiTotal)}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs font-bold uppercase">Doctor Disbursements</span>
              <div className="text-2xl font-black text-indigo-700 font-mono mt-1">
                {formatCurrency(monthlyReport.monthlyDoctorPayments)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Doctor consultation share</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs font-bold uppercase">Clinic Overheads</span>
              <div className="text-2xl font-black text-amber-700 font-mono mt-1">
                {formatCurrency(monthlyReport.monthlyExpenses)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Consumables & operations</span>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
              <span className="text-emerald-400 text-xs font-bold uppercase">Net Operating Surplus</span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {formatCurrency(monthlyReport.netSurplus)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Retained clinic revenue</span>
            </div>
          </div>

          {/* Revenue Stream Breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">
              Revenue Stream Breakdown this Month
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Registration Fees</span>
                <span className="font-bold text-slate-900 text-base font-mono">{formatCurrency(monthlyReport.registrationTotal)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Consultation Fees</span>
                <span className="font-bold text-slate-900 text-base font-mono">{formatCurrency(monthlyReport.consultationTotal)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Dental Procedures</span>
                <span className="font-bold text-slate-900 text-base font-mono">{formatCurrency(monthlyReport.procedureTotal)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Other Collections</span>
                <span className="font-bold text-slate-900 text-base font-mono">{formatCurrency(monthlyReport.otherTotal)}</span>
              </div>
            </div>
          </div>

          {/* Doctor Performance this month */}
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Doctor Performance Breakdown for Month
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Doctor</th>
                    <th className="py-3 px-3">Specialization</th>
                    <th className="py-3 px-3 text-center">Patients Seen</th>
                    <th className="py-3 px-3 text-right">Cash (₹)</th>
                    <th className="py-3 px-3 text-right">UPI (₹)</th>
                    <th className="py-3 px-3 text-right">Gross Generated (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyReport.doctorBreakdown.map(d => (
                    <tr key={d.doctorId} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{d.doctorName}</td>
                      <td className="py-3 px-3 text-slate-600">{d.specialization}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{d.patientCount}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">{formatCurrency(d.cashAmount)}</td>
                      <td className="py-3 px-3 text-right font-mono text-sky-700">{formatCurrency(d.upiAmount)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">{formatCurrency(d.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: SMS LOGS */}
      {activeTab === 'sms_logs' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Patient SMS Notification Logs & Audit Trail
              </h2>
              <p className="text-xs text-slate-500">
                Automated SMS dispatch register for fee receipts, UHID registration & clinic updates
              </p>
            </div>
          </div>

          {allSmsLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No SMS logs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Recipient Mobile</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Message Content</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allSmsLogs.map(sms => (
                    <tr key={sms.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(sms.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{sms.recipient_mobile}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded font-semibold text-[10px]">
                          {sms.message_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-md truncate" title={sms.message_body}>
                        {sms.message_body}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                          {sms.sms_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS LAYER ================= */}

      {/* 1. Collect Fee Modal */}
      <CollectPaymentModal
        isOpen={isCollectPaymentOpen}
        onClose={() => setIsCollectPaymentOpen(false)}
        onPaymentSuccess={(newPayment) => {
          setActiveReceiptPayment(newPayment);
          if (onRefresh) onRefresh();
        }}
      />

      {/* 2. Official Printable Money Receipt Modal */}
      <MoneyReceiptModal
        isOpen={Boolean(activeReceiptPayment)}
        onClose={() => setActiveReceiptPayment(null)}
        payment={activeReceiptPayment}
        settings={settings}
        onSmsSent={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* 3. Record Clinic Expense Modal */}
      <RecordExpenseModal
        isOpen={isRecordExpenseOpen}
        onClose={() => setIsRecordExpenseOpen(false)}
        onExpenseCreated={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* 4. Doctor Disbursement Modal */}
      <DoctorPaymentModal
        isOpen={isDoctorPaymentOpen}
        onClose={() => setIsDoctorPaymentOpen(false)}
        onPaymentRecorded={() => {
          if (onRefresh) onRefresh();
        }}
      />

    </div>
  );
};
