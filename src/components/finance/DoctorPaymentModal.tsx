import React, { useState } from 'react';
import { 
  X, 
  Stethoscope, 
  IndianRupee, 
  Calendar, 
  Building2, 
  CreditCard 
} from 'lucide-react';
import { DoctorPayment, PaymentMethod } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { formatCurrency } from '../../utils/numberToWords';

interface DoctorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: (payment: DoctorPayment) => void;
}

export const DoctorPaymentModal: React.FC<DoctorPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentRecorded,
}) => {
  const doctors = clinicRepo.getDoctors().filter(d => d.active);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || '');
  const [amount, setAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setError('Please select a doctor');
      return;
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid disbursement amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const docPayment = clinicRepo.createDoctorPayment({
        doctor_id: selectedDoctorId,
        amount: Number(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        payment_period_from: periodStart || undefined,
        payment_period_to: periodEnd || undefined,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onPaymentRecorded(docPayment);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record doctor disbursement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-800">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Doctor Disbursement / Payout</h2>
              <p className="text-xs text-slate-500">Record remuneration or consultation share settlements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select Doctor <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialization}) - Code: {d.doctor_code}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Disbursement Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Disbursement Mode <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
              >
                <option value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</option>
                <option value="UPI">UPI Transfer</option>
                <option value="CASH">Cash in Hand</option>
                <option value="CARD">Cheque / Demand Draft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Disbursement Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Transaction / UTR / Cheque No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR-20268841289"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Billing Cycle From
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Billing Cycle To
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Remarks / Settlement Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly consultation share payout for August 2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : `Record Payout of ${formatCurrency(amount)}`}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
