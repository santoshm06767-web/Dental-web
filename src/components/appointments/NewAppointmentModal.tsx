import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  CalendarPlus, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  Clock, 
  User, 
  Stethoscope,
  Calendar,
  Check,
  Database,
  UploadCloud
} from 'lucide-react';
import { Patient, Doctor, Appointment, AppointmentType, ClinicSettings, Profile } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { isSupabaseConfigured } from '../../services/supabaseClient';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentCreated: (appointment: Appointment) => void;
  onOpenNewPatientModal: () => void;
  onPrintSlip: (appointment: Appointment) => void;
  preselectedPatient?: Patient | null;
  settings: ClinicSettings;
  staffProfile?: Profile;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onAppointmentCreated,
  onOpenNewPatientModal,
  onPrintSlip,
  preselectedPatient,
  settings,
  staffProfile,
}) => {
  // Active doctors only (inactive doctors should not appear)
  const activeDoctors = clinicRepo.getDoctors(true);

  // Workflow state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preselectedPatient || null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(activeDoctors[0]?.id || '');
  const [appointmentDate, setAppointmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState<string>('09:00');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('New Consultation');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Confirmation state
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Validation / Warning state
  const [error, setError] = useState<string | null>(null);
  const [doubleBookingWarning, setDoubleBookingWarning] = useState<string | null>(null);

  // Suggested time slots based on clinic settings
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const [startH, startM] = (settings.working_hours_start || '09:00').split(':').map(Number);
    const [endH, endM] = (settings.working_hours_end || '18:00').split(':').map(Number);
    const interval = settings.appointment_duration || 20;

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes < endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      currentMinutes += interval;
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setSelectedPatient(preselectedPatient || null);
      setPatientSearchQuery('');
      setSelectedDoctorId(activeDoctors[0]?.id || '');
      setAppointmentDate(new Date().toISOString().split('T')[0]);
      setAppointmentTime(timeSlots[0] || '09:00');
      setAppointmentType('New Consultation');
      setReason('');
      setNotes('');
      setError(null);
      setDoubleBookingWarning(null);
      setConfirmedAppointment(null);
      setSyncState({ status: 'idle' });
    }
  }, [isOpen, preselectedPatient]);

  const [syncState, setSyncState] = useState<{ status: 'idle' | 'syncing' | 'synced' | 'error'; message?: string }>({ status: 'idle' });

  useEffect(() => {
    const handleSyncSuccess = (e: any) => {
      if (confirmedAppointment && e.detail?.appointmentId === confirmedAppointment.id) {
        setSyncState({ status: 'synced', message: 'Saved to Supabase appointments table' });
      }
    };
    const handleSyncError = (e: any) => {
      if (confirmedAppointment && e.detail?.appointmentId === confirmedAppointment.id) {
        const isUuidErr = e.detail?.error?.message?.toLowerCase().includes('uuid') || e.detail?.error?.code === '22P02';
        setSyncState({ 
          status: 'error', 
          message: isUuidErr
            ? 'Old UUID schema detected: Run updated SQL in Supabase SQL Editor' 
            : `Sync issue: ${e.detail?.error?.message || 'Error saving'}` 
        });
      }
    };

    window.addEventListener('dental_supabase_sync_success', handleSyncSuccess);
    window.addEventListener('dental_supabase_sync_error', handleSyncError);

    return () => {
      window.removeEventListener('dental_supabase_sync_success', handleSyncSuccess);
      window.removeEventListener('dental_supabase_sync_error', handleSyncError);
    };
  }, [confirmedAppointment]);

  // Check double-booking whenever doctor, date, or time changes
  useEffect(() => {
    if (selectedDoctorId && appointmentDate && appointmentTime) {
      const check = clinicRepo.checkDoubleBooking(selectedDoctorId, appointmentDate, appointmentTime);
      if (check.isBooked) {
        const doc = activeDoctors.find(d => d.id === selectedDoctorId);
        const patName = `${check.existingAppointment?.patient?.first_name || ''} ${check.existingAppointment?.patient?.last_name || ''}`.trim();
        setDoubleBookingWarning(
          `Time Slot Conflict: ${doc?.name || 'This doctor'} already has an appointment with ${patName || 'another patient'} at ${appointmentTime} on ${appointmentDate}.`
        );
      } else {
        setDoubleBookingWarning(null);
      }
    } else {
      setDoubleBookingWarning(null);
    }
  }, [selectedDoctorId, appointmentDate, appointmentTime]);

  if (!isOpen) return null;

  const searchedPatients = patientSearchQuery
    ? clinicRepo.searchPatients(patientSearchQuery)
    : clinicRepo.getPatients().slice(0, 5);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPatient) {
      setError('Please select or register a patient for the appointment.');
      return;
    }

    if (!selectedDoctorId) {
      setError('Please select a doctor.');
      return;
    }

    if (!appointmentDate) {
      setError('Appointment date is required.');
      return;
    }

    if (!appointmentTime) {
      setError('Appointment time is required.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide the reason for visit / chief complaint.');
      return;
    }

    try {
      const newApt = clinicRepo.createAppointment({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        appointment_type: appointmentType,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        status: 'Scheduled',
      });

      setConfirmedAppointment(newApt);
      onAppointmentCreated(newApt);
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule appointment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-sky-100 rounded-lg text-sky-700">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">
                {confirmedAppointment ? 'Appointment Confirmed' : 'New Patient Appointment Booking'}
              </h2>
              <p className="text-xs text-slate-500">
                Reception workflow: Select patient, allocate doctor, set schedule & print slip
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 8 & 9: CONFIRMATION VIEW */}
        {confirmedAppointment ? (
          <div className="p-8 text-center space-y-6 flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">
                Appointment Successfully Booked!
              </h3>
              <p className="text-xs text-slate-500">
                Token generated and queue allocated for reception check-in.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-lg mx-auto text-left text-xs space-y-3 shadow-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">Appointment Code:</span>
                <span className="font-mono font-bold text-sky-700 text-sm">{confirmedAppointment.appointment_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Daily Queue Token:</span>
                <span className="font-bold text-slate-900 px-2.5 py-0.5 rounded bg-sky-100 text-sky-800 text-xs">
                  {settings.token_prefix ? settings.token_prefix + '-' : ''}{String(confirmedAppointment.token_number).padStart(2, '0')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">
                  {confirmedAppointment.patient?.first_name} {confirmedAppointment.patient?.last_name} ({confirmedAppointment.patient?.patient_code})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Doctor Allocated:</span>
                <span className="font-bold text-slate-900">
                  {confirmedAppointment.doctor?.name} ({confirmedAppointment.doctor?.specialization})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-semibold text-slate-800">
                  {confirmedAppointment.appointment_date} at {confirmedAppointment.appointment_time}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Appointment Type:</span>
                <span className="font-medium text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {confirmedAppointment.appointment_type}
                </span>
              </div>

              {isSupabaseConfigured() && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-xs">
                  <span className="text-slate-500 flex items-center space-x-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    <span>Supabase Cloud:</span>
                  </span>
                  {syncState.status === 'synced' ? (
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Synced to appointments table</span>
                    </span>
                  ) : syncState.status === 'error' ? (
                    <span className="text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded font-medium text-[11px] max-w-[240px] text-right">
                      {syncState.message}
                    </span>
                  ) : (
                    <span className="text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full font-medium flex items-center space-x-1">
                      <UploadCloud className="w-3 h-3 animate-pulse" />
                      <span>Syncing to Supabase...</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-200">
              <button
                id="btn-print-slip-after-booking"
                onClick={() => {
                  onPrintSlip(confirmedAppointment);
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center space-x-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Consultation Slip</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* BOOKING FORM */
          <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Error banner */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Double-Booking Warning Banner */}
            {doubleBookingWarning && (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-amber-950">Double-Booking Collision Detected!</strong>
                  <span>{doubleBookingWarning}</span>
                </div>
              </div>
            )}

            {/* STEP 1: PATIENT SELECTION / SEARCH */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  <span>Step 1: Patient Selection <span className="text-red-500">*</span></span>
                </label>

                <button
                  type="button"
                  id="btn-register-patient-from-booking"
                  onClick={onOpenNewPatientModal}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center space-x-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Register New Patient</span>
                </button>
              </div>

              {selectedPatient ? (
                <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                      {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </div>
                      <div className="text-xs text-slate-600">
                        UHID: <span className="font-mono font-semibold">{selectedPatient.patient_code}</span> • Mobile: <span className="font-mono">{selectedPatient.mobile}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      placeholder="Search patient by Name, Mobile number, or UHID (e.g. PAT-000001)..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Patient Quick Selector Cards */}
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {searchedPatients.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No patient found matching search. Click "+ Register New Patient" above.
                      </div>
                    ) : (
                      searchedPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPatient(p)}
                          className="p-2.5 hover:bg-sky-50/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{p.first_name} {p.last_name}</span>{' '}
                            <span className="font-mono text-sky-700 font-semibold">({p.patient_code})</span>
                            <div className="text-slate-500 text-[11px]">
                              Mobile: {p.mobile} | {p.gender}, {p.age || '—'} yrs
                            </div>
                          </div>
                          <span className="text-xs text-sky-600 font-semibold">Select</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2 & 3: DOCTOR & DATE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Doctor Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center space-x-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                  <span>Step 2: Select Doctor <span className="text-red-500">*</span></span>
                </label>
                <select
                  id="select-appointment-doctor"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {activeDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} — {doc.specialization} ({doc.consultation_room || 'General Bay'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Appointment Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>Step 3: Appointment Date <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="date"
                  id="input-appointment-date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

            </div>

            {/* STEP 4 & 5: TIME SLOT & APPOINTMENT TYPE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Time Slot */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Step 4: Available Time Slot <span className="text-red-500">*</span></span>
                </label>
                <select
                  id="select-appointment-time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              {/* Appointment Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Step 5: Appointment Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-appointment-type"
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="New Consultation">New Consultation</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Procedure">Procedure</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Review">Review</option>
                  <option value="Other">Other</option>
                </select>
              </div>

            </div>

            {/* STEP 6: REASON / NOTES */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Step 6: Reason for Visit / Chief Complaint <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-appointment-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Toothache lower molar, Braces checkup, Routine dental cleaning..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reception Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special accommodations, previous records brought, or insurance notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Daily queue token will be auto-assigned upon booking.
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-appointment"
                  disabled={Boolean(doubleBookingWarning)}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    doubleBookingWarning
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Appointment</span>
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
