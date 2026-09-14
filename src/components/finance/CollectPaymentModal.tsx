import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Stethoscope, 
  IndianRupee, 
  QrCode, 
  Banknote,
  CalendarDays,
  MessageSquare
} from 'lucide-react';
import { Patient, Doctor, Appointment, Payment, PaymentType, PaymentMethod } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { formatCurrency } from '../../utils/numberToWords';

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPatient?: Patient | null;
  preselectedAppointment?: Appointment | null;
  onPaymentSuccess: (payment: Payment) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedPatient,
  preselectedAppointment,
  onPaymentSuccess,
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('CONSULTATION');
  const [amount, setAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [sendSmsNotification, setSendSmsNotification] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const settings = clinicRepo.getClinicSettings();
  const doctors = clinicRepo.getDoctors().filter(d => d.active);
  const allPatients = clinicRepo.getPatients();

  // Initialize or prefill fields on open
  useEffect(() => {
    if (isOpen) {
      const activePatient = preselectedPatient || (preselectedAppointment ? preselectedAppointment.patient : null);
      if (activePatient) {
        setSelectedPatientId(activePatient.id);
        setPatientSearch(`${activePatient.first_name} ${activePatient.last_name} (${activePatient.patient_code})`);
      } else {
        setSelectedPatientId('');
        setPatientSearch('');
      }

      if (preselectedAppointment) {
        setSelectedDoctorId(preselectedAppointment.doctor_id);
        const doc = clinicRepo.getDoctorById(preselectedAppointment.doctor_id);
        const defaultFee = preselectedAppointment.appointment_type === 'Follow-up'
          ? (doc?.followup_fee || 300)
          : (doc?.consultation_fee || settings.default_consultation_fee || 500);
        setPaymentType(preselectedAppointment.appointment_type === 'Follow-up' ? 'FOLLOW_UP' : 'CONSULTATION');
        setAmount(defaultFee);
        setNotes(`Appointment ${preselectedAppointment.appointment_code} - Token #${preselectedAppointment.token_number}`);
      } else {
        const firstDoc = doctors[0];
        setSelectedDoctorId(firstDoc ? firstDoc.id : '');
        setPaymentType('CONSULTATION');
        setAmount(firstDoc?.consultation_fee || settings.default_consultation_fee || 500);
        setNotes('');
      }

      setPaymentMethod('CASH');
      setTransactionReference('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, preselectedPatient, preselectedAppointment]);

  // Adjust amount when doctor or payment type changes
  const handleDoctorChange = (docId: string) => {
    setSelectedDoctorId(docId);
    const doc = doctors.find(d => d.id === docId);
    if (doc) {
      if (paymentType === 'CONSULTATION') {
        setAmount(doc.consultation_fee || settings.default_consultation_fee || 500);
      } else if (paymentType === 'FOLLOW_UP') {
        setAmount(doc.followup_fee || 300);
      }
    }
  };

  const handleTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    const doc = doctors.find(d => d.id === selectedDoctorId);
    if (type === 'REGISTRATION') {
      setAmount(settings.default_registration_fee || 100);
    } else if (type === 'CONSULTATION') {
      setAmount(doc?.consultation_fee || settings.default_consultation_fee || 500);
    } else if (type === 'FOLLOW_UP') {
      setAmount(doc?.followup_fee || 300);
    } else if (type === 'PROCEDURE') {
      setAmount(1500);
    }
  };

  if (!isOpen) return null;

  const currentPatient = selectedPatientId ? clinicRepo.getPatientById(selectedPatientId) : null;
  const filteredPatients = patientSearch && !selectedPatientId
    ? clinicRepo.searchPatients(patientSearch).slice(0, 6)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!selectedPatientId) {
      newErrors.patient = 'Please select a patient';
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Please enter a valid payment amount';
    }
    if (paymentMethod === 'UPI' && !transactionReference.trim()) {
      newErrors.ref = 'Please enter UPI reference / UTR number for audit';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payment = clinicRepo.createPayment({
        patient_id: selectedPatientId,
        doctor_id: selectedDoctorId || undefined,
        appointment_id: preselectedAppointment?.id || undefined,
        payment_type: paymentType,
        amount: Number(amount),
        payment_method: paymentMethod,
        transaction_reference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (sendSmsNotification) {
        const patientObj = clinicRepo.getPatientById(selectedPatientId);
        if (patientObj && patientObj.mobile) {
          const clinicName = settings.clinic_name || 'AROGYA DENTAL CARE';
          const msg = `Dear ${patientObj.first_name}, received Rs.${payment.amount} (${payment.payment_method}) at ${clinicName}. Receipt No: ${payment.receipt_number}. Thank you.`;
          try {
            clinicRepo.sendSms({
              patientId: patientObj.id,
              paymentId: payment.id,
              recipientMobile: patientObj.mobile,
              messageType: 'RECEIPT',
              messageBody: msg,
            });
          } catch (smsErr) {
            console.warn('SMS dispatch failed during fee collection:', smsErr);
          }
        }
      }

      onPaymentSuccess(payment);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Error collecting payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      
      <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Collect Fee & Generate Receipt</h2>
              <p className="text-xs text-slate-500">Fast front desk payment desk entry</p>
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
          
          {/* Patient Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select Patient <span className="text-rose-500">*</span>
            </label>

            {currentPatient ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-300 rounded-lg">
                <div>
                  <div className="font-bold text-slate-900">
                    {currentPatient.first_name} {currentPatient.last_name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    UHID: {currentPatient.patient_code} | Mobile: {currentPatient.mobile}
                  </div>
                  {currentPatient.registration_fee_paid ? (
                    <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 font-medium mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Registration Fee Paid</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-[11px] text-amber-700 font-medium mt-0.5">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>Registration fee pending (₹100)</span>
                    </span>
                  )}
                </div>

                {!preselectedPatient && !preselectedAppointment && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatientId('');
                      setPatientSearch('');
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600 font-semibold cursor-pointer underline"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Type patient name, phone, or UHID..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                {filteredPatients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 overflow-hidden">
                    {filteredPatients.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearch(`${p.first_name} ${p.last_name} (${p.patient_code})`);
                        }}
                        className="px-3 py-2 hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{p.first_name} {p.last_name}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{p.patient_code} | {p.mobile}</div>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.patient && <p className="text-rose-500 text-xs mt-1">{errors.patient}</p>}
          </div>

          {/* Quick Registration Fee Prompt if unpaid */}
          {currentPatient && !currentPatient.registration_fee_paid && paymentType !== 'REGISTRATION' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Patient has not paid one-time registration fee yet.</span>
              </div>
              <button
                type="button"
                onClick={() => handleTypeChange('REGISTRATION')}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs transition-colors cursor-pointer"
              >
                Switch to Registration
              </button>
            </div>
          )}

          {/* Fee / Particular Type & Doctor in 2 Cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Fee Particulars <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentType}
                onChange={(e) => handleTypeChange(e.target.value as PaymentType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="CONSULTATION">Consultation Fee</option>
                <option value="REGISTRATION">Registration Fee</option>
                <option value="FOLLOW_UP">Follow-Up Visit Fee</option>
                <option value="PROCEDURE">Procedure / Treatment</option>
                <option value="OTHER">Other / Consumables</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Consulting Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- General Clinic / OPD --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount and Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              {errors.amount && <p className="text-rose-500 text-xs mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['CASH', 'UPI', 'CARD'] as PaymentMethod[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMethod(mode)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                      paymentMethod === mode
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'CASH' && <Banknote className="w-3.5 h-3.5" />}
                    {mode === 'UPI' && <QrCode className="w-3.5 h-3.5" />}
                    {mode === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* UPI Reference Number field if UPI */}
          {paymentMethod === 'UPI' && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
              <label className="block text-xs font-bold text-sky-900 uppercase mb-1">
                UPI Reference / UTR Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="e.g. 12-digit UTR (e.g. UPI/2026/091104882193)"
                className="w-full px-3 py-2 border border-sky-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <p className="text-[11px] text-sky-700 mt-1">
                Ask patient for UPI transaction reference or check your soundbox / UPI terminal.
              </p>
              {errors.ref && <p className="text-rose-500 text-xs mt-1">{errors.ref}</p>}
            </div>
          )}

          {/* Notes / Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Remarks / Procedure Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Routine consultation, Scaling & Polishing, Teeth cleaning"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* SMS Notification Toggle */}
          <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-lg flex items-center justify-between">
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendSmsNotification}
                onChange={(e) => setSendSmsNotification(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
              />
              <div className="flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Send SMS receipt confirmation to patient automatically
                </span>
              </div>
            </label>
            <span className="text-[10px] text-sky-700 font-bold bg-sky-100 px-2 py-0.5 rounded-full">
              Audit Trail
            </span>
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
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Receipt className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : `Collect ${formatCurrency(amount)} & Issue Receipt`}</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
