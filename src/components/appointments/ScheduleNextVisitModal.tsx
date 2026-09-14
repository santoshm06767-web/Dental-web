import React, { useState, useEffect } from 'react';
import { 
  X, 
  CalendarPlus, 
  Calendar, 
  Clock, 
  Stethoscope, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { Appointment, AppointmentType, ClinicSettings, Doctor } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';

interface ScheduleNextVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  settings: ClinicSettings;
  onNextVisitScheduled: (newApt: Appointment, updatedPrevApt: Appointment) => void;
}

export const ScheduleNextVisitModal: React.FC<ScheduleNextVisitModalProps> = ({
  isOpen,
  onClose,
  appointment,
  settings,
  onNextVisitScheduled,
}) => {
  const activeDoctors = clinicRepo.getDoctors(true);

  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('10:30');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('Follow-up');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doubleBookingWarning, setDoubleBookingWarning] = useState<string | null>(null);

  // Initialize date to 2 weeks from appointment date by default
  useEffect(() => {
    if (isOpen && appointment) {
      const baseDate = new Date(appointment.appointment_date);
      baseDate.setDate(baseDate.getDate() + 14); // default 2 weeks out
      setNextDate(baseDate.toISOString().split('T')[0]);
      setNextTime('10:30');
      setDoctorId(appointment.doctor_id || activeDoctors[0]?.id || '');
      setAppointmentType('Follow-up');
      setNotes(`Post-${appointment.appointment_type.toLowerCase()} progress review`);
      setError(null);
      setDoubleBookingWarning(null);
    }
  }, [isOpen, appointment]);

  // Check double-booking
  useEffect(() => {
    if (doctorId && nextDate && nextTime) {
      const check = clinicRepo.checkDoubleBooking(doctorId, nextDate, nextTime);
      if (check.isBooked) {
        setDoubleBookingWarning(`Doctor already has a booking at ${nextTime} on ${nextDate}.`);
      } else {
        setDoubleBookingWarning(null);
      }
    }
  }, [doctorId, nextDate, nextTime]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nextDate) {
      setError('Please select the next visit date.');
      return;
    }
    if (!nextTime) {
      setError('Please select the next visit time.');
      return;
    }
    if (!doctorId) {
      setError('Please select the doctor.');
      return;
    }

    try {
      const result = clinicRepo.scheduleNextVisit({
        previousAppointmentId: appointment.id,
        nextVisitDate: nextDate,
        nextVisitTime: nextTime,
        doctorId,
        appointmentType,
        notes: notes.trim() || undefined,
      });

      onNextVisitScheduled(result.newAppointment, result.updatedPreviousAppointment);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule next visit');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Schedule Patient's Next Visit</h2>
              <p className="text-xs text-slate-500">
                Patient: {appointment.patient?.first_name} {appointment.patient?.last_name} ({appointment.patient?.patient_code})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {doubleBookingWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{doubleBookingWarning}</span>
            </div>
          )}

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Doctor for Next Visit
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {activeDoctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          {/* Next Visit Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Visit Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="input-next-visit-date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Visit Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="input-next-visit-time"
                value={nextTime}
                onChange={(e) => setNextTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Appointment Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Appointment Type
            </label>
            <select
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="Follow-up">Follow-up</option>
              <option value="Review">Review</option>
              <option value="Procedure">Procedure</option>
              <option value="New Consultation">New Consultation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Next Visit Clinical / Reception Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Suture removal, archwire change, crown fitting..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-confirm-next-visit"
              disabled={Boolean(doubleBookingWarning)}
              className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                doubleBookingWarning
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Allocate Next Visit</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
