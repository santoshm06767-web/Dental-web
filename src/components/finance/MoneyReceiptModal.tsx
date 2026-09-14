import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download,
  Share2, 
  CheckCircle2, 
  Phone, 
  Receipt, 
  Check, 
  Building2, 
  Send,
  MessageSquare,
  Copy,
  ExternalLink,
  Smartphone,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Payment, ClinicSettings, SmsLog } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { numberToWords, formatCurrency } from '../../utils/numberToWords';
import { downloadMoneyReceiptPDF } from '../../services/pdfGenerator';

interface MoneyReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  settings?: ClinicSettings;
  onSmsSent?: () => void;
}

export const MoneyReceiptModal: React.FC<MoneyReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  settings,
  onSmsSent,
}) => {
  const [smsSent, setSmsSent] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [isSmsPanelOpen, setIsSmsPanelOpen] = useState(true);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [copiedSms, setCopiedSms] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const clinic = settings || clinicRepo.getClinicSettings();
  const patient = payment ? (payment.patient || clinicRepo.getPatientById(payment.patient_id)) : null;
  const doctor = payment ? (payment.doctor || (payment.doctor_id ? clinicRepo.getDoctorById(payment.doctor_id) : undefined)) : undefined;

  useEffect(() => {
    if (patient?.mobile) {
      setRecipientPhone(patient.mobile);
    } else {
      setRecipientPhone('');
    }
    setSmsSent(false);
    setStatusMessage(null);
  }, [payment, patient]);

  if (!isOpen || !payment) return null;

  const formattedDate = new Date(payment.collected_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = new Date(payment.collected_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const amountInWords = numberToWords(payment.amount);
  const clinicName = clinic.clinic_name || 'AROGYA DENTAL CARE';
  const defaultSmsBody = `Dear ${patient?.first_name || 'Patient'}, received Rs.${payment.amount} (${payment.payment_method}) at ${clinicName}. Receipt No: ${payment.receipt_number}. Date: ${formattedDate}. Thank you for choosing us!`;

  // Check audit trail for prior SMS logs for this payment
  const paymentSmsHistory: SmsLog[] = clinicRepo
    .getSmsLogs()
    .filter(s => s.payment_id === payment.id || (s.message_body && s.message_body.includes(payment.receipt_number)));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    downloadMoneyReceiptPDF(payment, clinic);
  };

  const getCleanMobile = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.startsWith('91') && digits.length === 12) return digits;
    return digits;
  };

  const recordSmsAudit = (targetMobile: string, messageContent: string) => {
    if (!patient) return null;
    const log = clinicRepo.sendSms({
      patientId: patient.id,
      paymentId: payment.id,
      recipientMobile: targetMobile,
      messageType: 'RECEIPT',
      messageBody: messageContent,
    });
    if (onSmsSent) onSmsSent();
    return log;
  };

  const handleSendSms = () => {
    const targetPhone = recipientPhone.trim() || patient?.mobile;
    if (!targetPhone) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid recipient mobile number.' });
      return;
    }
    setSmsSending(true);
    setStatusMessage(null);

    setTimeout(() => {
      try {
        recordSmsAudit(targetPhone, defaultSmsBody);
        setSmsSending(false);
        setSmsSent(true);
        setStatusMessage({
          type: 'success',
          text: `SMS logged to clinic records & queued for delivery to ${targetPhone}!`
        });
        setTimeout(() => setSmsSent(false), 5000);
      } catch (err: any) {
        setSmsSending(false);
        setStatusMessage({ type: 'error', text: err?.message || 'Failed to dispatch SMS' });
      }
    }, 300);
  };

  const handleSendWhatsApp = () => {
    const targetPhone = recipientPhone.trim() || patient?.mobile;
    if (!targetPhone) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid recipient mobile number for WhatsApp.' });
      return;
    }
    const cleanPhone = getCleanMobile(targetPhone);
    recordSmsAudit(targetPhone, defaultSmsBody);
    
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(defaultSmsBody)}`;
    window.open(waUrl, '_blank');
    
    setStatusMessage({
      type: 'success',
      text: `WhatsApp launched with receipt text! Logged to clinic SMS audit records.`
    });
  };

  const handleOpenDeviceSms = () => {
    const targetPhone = recipientPhone.trim() || patient?.mobile;
    if (!targetPhone) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid recipient mobile number.' });
      return;
    }
    const cleanPhone = getCleanMobile(targetPhone);
    recordSmsAudit(targetPhone, defaultSmsBody);
    
    window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(defaultSmsBody)}`;
    setStatusMessage({
      type: 'success',
      text: `Opening your device SMS messenger. Logged to clinic SMS audit records.`
    });
  };

  const handleCopySms = () => {
    navigator.clipboard.writeText(defaultSmsBody);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  const getParticulars = () => {
    if (payment.payment_type === 'REGISTRATION') {
      return 'Patient Registration & Lifetime UHID Enrollment Fee';
    }
    if (payment.payment_type === 'CONSULTATION') {
      return `Doctor Consultation Fee - ${doctor ? doctor.name : 'Dental OPD'}`;
    }
    if (payment.payment_type === 'FOLLOW_UP') {
      return `Follow-Up Consultation Fee - ${doctor ? doctor.name : 'Dental OPD'}`;
    }
    if (payment.payment_type === 'PROCEDURE') {
      return payment.notes || 'Dental Clinical Procedure & Materials';
    }
    return payment.notes || 'Dental Care & Healthcare Services';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      
      {/* Modal Card */}
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Action Header Bar (Excluded during print via CSS) */}
        <div className="no-print flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Official Money Receipt</h3>
              <p className="text-xs text-slate-500 font-mono">Receipt No: {payment.receipt_number}</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Toggle SMS Panel Button */}
            <button
              onClick={() => setIsSmsPanelOpen(!isSmsPanelOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                isSmsPanelOpen
                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Toggle SMS & WhatsApp messaging center"
            >
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>SMS / WhatsApp</span>
              {paymentSmsHistory.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="SMS already sent" />
              )}
              {isSmsPanelOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              title="Download Money Receipt PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SMS & WHATSAPP DISPATCH CENTER (Excluded during print) */}
        {isSmsPanelOpen && (
          <div className="no-print bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-slate-50 border-b border-sky-200/80 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-sky-100 text-sky-800 rounded-md">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  Send Digital Receipt via SMS or WhatsApp
                </span>
              </div>

              {paymentSmsHistory.length > 0 ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Check className="w-3 h-3" />
                  <span>Dispatched ({paymentSmsHistory.length})</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium">
                  Instant receipt confirmation
                </span>
              )}
            </div>

            {/* Recipient Phone and Message */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Recipient Mobile
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Patient: <strong>{patient ? `${patient.first_name} ${patient.last_name}` : 'Guest'}</strong>
                </p>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    SMS Message Preview
                  </label>
                  <button
                    type="button"
                    onClick={handleCopySms}
                    className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedSms ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSms ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <div className="p-2 bg-white/90 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-mono leading-relaxed select-all">
                  {defaultSmsBody}
                </div>
              </div>
            </div>

            {/* Feedback notification if any */}
            {statusMessage && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : 'bg-sky-50 text-sky-900 border border-sky-200'
              }`}>
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Option 1: Log & Send SMS */}
              <button
                type="button"
                onClick={handleSendSms}
                disabled={smsSending}
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{smsSending ? 'Dispatching...' : 'Send SMS (Log to Audit)'}</span>
              </button>

              {/* Option 2: Share via WhatsApp */}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                title="Open WhatsApp with receipt message prefilled"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
              </button>

              {/* Option 3: Device SMS app */}
              <button
                type="button"
                onClick={handleOpenDeviceSms}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-300"
                title="Launch phone or browser SMS messenger app"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                <span>Open in SMS App</span>
              </button>
            </div>

            {/* Prior Dispatch History */}
            {paymentSmsHistory.length > 0 && (
              <div className="text-[10px] text-slate-500 pt-1 flex items-center space-x-2">
                <span className="font-semibold text-slate-700">Recent Delivery Log:</span>
                <span>
                  Sent to <strong>{paymentSmsHistory[0].recipient_mobile}</strong> on {new Date(paymentSmsHistory[0].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} ({paymentSmsHistory[0].sms_status})
                </span>
              </div>
            )}
          </div>
        )}

        {/* Printable Receipt Paper Container */}
        <div className="overflow-y-auto p-6 sm:p-8 bg-slate-100/60 flex justify-center">
          
          <div 
            ref={receiptRef}
            id="printable-money-receipt"
            className="w-full max-w-xl bg-white rounded-lg shadow-sm border border-slate-300/80 p-6 sm:p-8 text-slate-800 text-sm print:m-0 print:p-0 print:border-none print:shadow-none"
          >
            {/* Header: Clinic Identity */}
            <div className="text-center border-b-2 border-slate-800 pb-4">
              <div className="flex items-center justify-center space-x-2">
                <Building2 className="w-6 h-6 text-emerald-800" />
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {clinic.clinic_name}
                </h1>
              </div>
              {clinic.tagline && (
                <p className="text-xs font-medium text-slate-600 mt-0.5 italic">
                  {clinic.tagline}
                </p>
              )}
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                {clinic.address}
              </p>
              <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center justify-center gap-x-3">
                <span>Phone: {clinic.phone}</span>
                {clinic.email && <span>Email: {clinic.email}</span>}
                {clinic.gst_number && <span>GSTIN: <strong>{clinic.gst_number}</strong></span>}
              </div>
            </div>

            {/* Receipt Banner */}
            <div className="flex items-center justify-between mt-3 pb-2 border-b border-slate-200">
              <span className="px-3 py-1 bg-slate-800 text-white rounded text-xs font-bold uppercase tracking-wider">
                Money Receipt
              </span>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">
                  Receipt No: <span className="font-mono text-emerald-800 text-sm">{payment.receipt_number}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Date: {formattedDate} | {formattedTime}
                </div>
              </div>
            </div>

            {/* Patient & Doctor Meta Grid */}
            <div className="grid grid-cols-2 gap-3 my-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Received With Thanks From</span>
                <span className="font-bold text-slate-900 text-sm">
                  {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
                </span>
                <div className="text-slate-600 mt-0.5 space-y-0.5">
                  {patient?.patient_code && (
                    <div>UHID: <span className="font-mono font-bold text-slate-800">{patient.patient_code}</span></div>
                  )}
                  {patient?.mobile && <div>Phone: {patient.mobile}</div>}
                  {patient?.gender && (
                    <div>
                      Gender/Age: {patient.gender} {patient.age ? `/ ${patient.age} yrs` : ''}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-l border-slate-200 pl-3">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Consulting Doctor / OPD</span>
                <span className="font-bold text-slate-900">
                  {doctor ? doctor.name : 'Chief Dental OPD'}
                </span>
                {doctor?.qualification && (
                  <div className="text-[11px] text-slate-600 mt-0.5">{doctor.qualification}</div>
                )}
                {doctor?.specialization && (
                  <div className="text-[11px] text-emerald-800 font-medium">{doctor.specialization}</div>
                )}
                {payment.appointment && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Token: #{payment.appointment.token_number} ({payment.appointment.appointment_code})
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full border-collapse border border-slate-300 text-xs my-4">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 px-3 py-2 text-left w-10">#</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Description / Particulars</th>
                  <th className="border border-slate-300 px-3 py-2 text-center w-24">Type</th>
                  <th className="border border-slate-300 px-3 py-2 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-3 py-3 text-center align-top font-mono">1</td>
                  <td className="border border-slate-300 px-3 py-3 align-top">
                    <div className="font-bold text-slate-900">{getParticulars()}</div>
                    {payment.notes && payment.payment_type !== 'PROCEDURE' && (
                      <div className="text-[11px] text-slate-500 mt-0.5 italic">{payment.notes}</div>
                    )}
                    <div className="text-[11px] text-slate-500 mt-1">
                      Mode of Payment: <strong className="text-slate-800">{payment.payment_method}</strong>
                      {payment.transaction_reference && (
                        <span> (Ref/UTR: <span className="font-mono">{payment.transaction_reference}</span>)</span>
                      )}
                    </div>
                  </td>
                  <td className="border border-slate-300 px-3 py-3 text-center align-top">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-[10px]">
                      {payment.payment_type}
                    </span>
                  </td>
                  <td className="border border-slate-300 px-3 py-3 text-right align-top font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right text-slate-700">
                    Grand Total:
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-mono text-emerald-800 text-base">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Amount in words & status badge */}
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Amount In Words:</span>
                <span className="font-semibold text-slate-900 italic">{amountInWords}</span>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded text-xs">
                  {payment.payment_status}
                </span>
              </div>
            </div>

            {/* Signatures & Footer */}
            <div className="grid grid-cols-2 gap-8 mt-10 pt-4 text-xs">
              <div className="text-left">
                <div className="h-10"></div>
                <div className="border-t border-slate-400 pt-1 text-slate-600">
                  Patient / Attendant Signature
                </div>
              </div>
              <div className="text-right">
                <div className="h-10 flex items-end justify-end">
                  <span className="text-[11px] font-mono text-slate-500">
                    {payment.collected_by_name || 'Front Desk Cashier'}
                  </span>
                </div>
                <div className="border-t border-slate-400 pt-1 text-slate-600 font-semibold">
                  Authorized Signatory / Cashier
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center">
              {clinic.footer_text || 'Thank you for choosing Arogya Dental Care. Please preserve this receipt for tax & future consultations.'}
              <div className="mt-0.5">This is an authentic computer generated electronic money receipt.</div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="no-print px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Receipt status: <strong className="text-emerald-700 uppercase">{payment.payment_status}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Receipt
          </button>
        </div>

      </div>

    </div>
  );
};
