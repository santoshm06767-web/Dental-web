import React, { useState } from 'react';
import { 
  X, 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  Clock, 
  Stethoscope, 
  FileText, 
  AlertCircle, 
  CalendarPlus, 
  CheckCircle,
  Printer,
  Receipt,
  IndianRupee,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Patient, Appointment, UserRole, Payment } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { formatCurrency } from '../../utils/numberToWords';

interface PatientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  userRole: UserRole;
  onBookAppointment: (patient: Patient) => void;
  onPrintSlip: (appointment: Appointment) => void;
  onCollectPayment?: (patient: Patient) => void;
  onViewReceipt?: (payment: Payment) => void;
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({
  isOpen,
  onClose,
  patient,
  userRole,
  onBookAppointment,
  onPrintSlip,
  onCollectPayment,
  onViewReceipt,
}) => {
  if (!isOpen || !patient) return null;

  const appointments = clinicRepo.getAppointmentsByPatient(patient.id);
  const payments = clinicRepo.getPaymentsByPatientId(patient.id);
  const nowStr = new Date().toISOString().split('T')[0];

  const pastAppointments = appointments.filter(a => a.appointment_date < nowStr || a.status === 'Completed' || a.status === 'Cancelled');
  const upcomingAppointments = appointments.filter(a => a.appointment_date >= nowStr && a.status !== 'Completed' && a.status !== 'Cancelled');

  // Unique doctors visited
  const visitedDoctorsMap = new Map<string, string>();
  appointments.forEach(a => {
    if (a.doctor) {
      visitedDoctorsMap.set(a.doctor.id, `${a.doctor.name} (${a.doctor.specialization})`);
    }
  });
  const visitedDoctors = Array.from(visitedDoctorsMap.values());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Checked-in':
      case 'Waiting':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'In Consultation':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelled':
      case 'No Show':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Scheduled':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-slate-900 text-xl">
                  {patient.first_name} {patient.last_name}
                </h2>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                  {patient.patient_code}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Registered on: {new Date(patient.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onBookAppointment(patient);
                onClose();
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>+ Book Appointment</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Demographics Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center space-x-1.5 text-sky-800">
                <User className="w-3.5 h-3.5" />
                <span>Demographics</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gender / Age:</span>
                <span className="font-medium text-slate-800">{patient.gender} • {patient.age || 'N/A'} yrs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date of Birth:</span>
                <span className="font-medium text-slate-800">{patient.date_of_birth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Blood Group:</span>
                <span className="font-medium text-slate-800">{patient.blood_group || 'Not recorded'}</span>
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center space-x-1.5 text-sky-800">
                <Phone className="w-3.5 h-3.5" />
                <span>Contact & Address</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile:</span>
                <span className="font-semibold text-slate-900 font-mono">{patient.mobile}</span>
              </div>
              {patient.alternate_mobile && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Alt Mobile:</span>
                  <span className="font-mono text-slate-700">{patient.alternate_mobile}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-700 truncate max-w-[140px]">{patient.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">City / Postal:</span>
                <span className="text-slate-800">{patient.city}, {patient.postal_code}</span>
              </div>
            </div>

            {/* Emergency & Doctors Visited */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center space-x-1.5 text-sky-800">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Emergency & Doctors</span>
              </div>
              <div>
                <span className="text-slate-500 block">Emergency Contact:</span>
                <span className="font-medium text-slate-800">{patient.emergency_contact_name} ({patient.emergency_contact_number})</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 block">Previously Visited Doctors:</span>
                {visitedDoctors.length > 0 ? (
                  <ul className="list-disc list-inside text-slate-700 space-y-0.5 mt-0.5">
                    {visitedDoctors.map((doc, i) => (
                      <li key={i} className="truncate">{doc}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400 italic">No prior visits</span>
                )}
              </div>
            </div>

          </div>

          {/* Allergies & Medical Notes Banner */}
          {(patient.allergies || patient.medical_notes) && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                {patient.allergies && (
                  <div>
                    <span className="font-bold text-red-800">Known Allergies: </span>
                    <span className="text-slate-800 font-medium">{patient.allergies}</span>
                  </div>
                )}
                {patient.medical_notes && (
                  <div>
                    <span className="font-bold text-amber-900">Clinical / Dental Notes: </span>
                    <span className="text-slate-700">{patient.medical_notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registration Fee & Financial Status Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${patient.registration_fee_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {patient.registration_fee_paid ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registration Fee</span>
                    {patient.registration_fee_paid ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        PAID (₹{patient.registration_fee_amount || 100})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                        UNPAID (₹{patient.registration_fee_amount || 100})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {patient.registration_fee_paid
                      ? `Paid once on ${patient.registration_fee_paid_at ? new Date(patient.registration_fee_paid_at).toLocaleDateString() : 'registration'}. Never charged again.`
                      : 'Lifetime UHID registration fee pending. Payable once per patient.'}
                  </p>
                </div>
              </div>

              {!patient.registration_fee_paid && onCollectPayment && (
                <button
                  type="button"
                  onClick={() => onCollectPayment(patient)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Collect Registration Fee (₹100)</span>
                </button>
              )}
            </div>
          </div>

          {/* Financial History & Money Receipts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Financial History & Money Receipts
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Total Receipts: {payments.length}
              </span>
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No payment transactions recorded for this patient.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                      <th className="pb-2">Receipt No</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Mode</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-mono font-bold text-slate-800">{p.receipt_number}</td>
                        <td className="py-2.5 text-slate-600">{new Date(p.collected_at).toLocaleDateString()}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            {p.payment_type}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.payment_method === 'CASH' ? 'bg-amber-50 text-amber-800' : 'bg-purple-50 text-purple-800'}`}>
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-right text-emerald-700">{formatCurrency(p.amount)}</td>
                        <td className="py-2.5 text-right">
                          {onViewReceipt && (
                            <button
                              onClick={() => onViewReceipt(p)}
                              className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline cursor-pointer"
                            >
                              View Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Timeline / Appointment History */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Complete Appointment Timeline & History
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Total Visits: {appointments.length}
              </span>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No appointment records found for this patient yet.
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div 
                    key={apt.id}
                    className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors bg-white shadow-2xs text-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 font-mono">{apt.appointment_date}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium text-slate-700">{apt.appointment_time}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-sky-800">{apt.doctor?.name || 'Doctor'}</span>
                        <span className="text-slate-500">({apt.doctor?.specialization})</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(apt.status)}`}>
                          {apt.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {apt.appointment_type}
                        </span>
                        <button
                          onClick={() => onPrintSlip(apt)}
                          className="p-1 text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                          title="Print Consultation Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col sm:flex-row sm:justify-between gap-1">
                      <div>
                        <strong>Reason:</strong> {apt.reason}
                        {apt.notes && <span className="block text-slate-500 mt-0.5"><strong>Notes:</strong> {apt.notes}</span>}
                      </div>

                      {apt.next_visit_date && (
                        <div className="text-emerald-700 font-medium flex items-center space-x-1 sm:text-right">
                          <span>Next Visit: {apt.next_visit_date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            UHID: <strong className="font-mono text-slate-700">{patient.patient_code}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
