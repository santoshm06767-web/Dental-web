import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  IndianRupee, 
  Calendar, 
  FileText, 
  Building 
} from 'lucide-react';
import { ClinicExpense, PaymentMethod } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { formatCurrency } from '../../utils/numberToWords';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: (expense: ClinicExpense) => void;
}

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseCreated,
}) => {
  const [category, setCategory] = useState('Dental Consumables');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const categories = [
    'Dental Consumables',
    'Cotton & Gauze',
    'Gloves & Masks (PPE)',
    'Sterilization & Disinfectants',
    'Dental Lab Charges',
    'Clinic Maintenance & Cleaning',
    'Stationery & Office Supplies',
    'Electricity & Utilities',
    'Tea & Refreshments',
    'Staff Welfare / Miscellaneous',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please enter expense description');
      return;
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const newExpense = clinicRepo.createClinicExpense({
        category,
        description: description.trim(),
        total_amount: Number(amount),
        payment_method: paymentMethod,
        vendor: vendorName.trim() || undefined,
        invoice_number: invoiceNumber.trim() || undefined,
        expense_date: expenseDate,
        notes: notes.trim() || undefined,
      });

      onExpenseCreated(newExpense);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Record Clinic Expense</h2>
              <p className="text-xs text-slate-500">Track petty cash & clinic procurement outflows</p>
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
              Expense Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Description / Item Purchased <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 5 boxes Nitrile gloves (M size), 2 rolls cotton rolls"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
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
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Paid Via <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
              >
                <option value="CASH">Petty Cash in Hand</option>
                <option value="UPI">Clinic UPI / QR</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Net Banking / NEFT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Vendor / Store Name
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Apex Dental Supplies / Medico Mart"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Bill / Invoice No.
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-99238"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Expense Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent stock replenishment"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
              className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : `Record Outflow of ${formatCurrency(amount)}`}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
