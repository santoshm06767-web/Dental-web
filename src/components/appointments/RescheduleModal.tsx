import React, { useState, useEffect } from 'react';
import { 
  X, 
  CalendarClock, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { Appointment, ClinicSettings } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  settings: ClinicSettings;
  onAppointmentRescheduled: (updatedApt: Appointment) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  appointment,
  settings,
  onAppointmentRescheduled,
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doubleBookingWarning, setDoubleBookingWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && appointment) {
      setNewDate(appointment.appointment_date);
      setNewTime(appointment.appointment_time);
      setReason('');
      setError(null);
      setDoubleBookingWarning(null);
    }
  }, [isOpen, appointment]);

  useEffect(() => {
    if (appointment && newDate && newTime) {
      const check = clinicRepo.checkDoubleBooking(appointment.doctor_id, newDate, newTime, appointment.id);
      if (check.isBooked) {
        setDoubleBookingWarning(`Doctor already has another appointment at ${newTime} on ${newDate}.`);
      } else {
        setDoubleBookingWarning(null);
      }
    }
  }, [appointment, newDate, newTime]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDate || !newTime) {
      setError('Date and Time are required.');
      return;
    }

    try {
      const updated = clinicRepo.rescheduleAppointment(
        appointment.id,
        newDate,
        newTime,
        reason.trim() || undefined
      );
      onAppointmentRescheduled(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reschedule appointment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Reschedule Appointment</h2>
              <p className="text-xs text-slate-500 font-mono">
                {appointment.appointment_code} • {appointment.patient?.first_name} {appointment.patient?.last_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

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

          <div>
            <span className="text-xs text-slate-500">Doctor:</span>
            <div className="font-bold text-slate-900 text-sm">{appointment.doctor?.name} ({appointment.doctor?.specialization})</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Rescheduling
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patient requested morning slot, Doctor delayed..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(doubleBookingWarning)}
              className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                doubleBookingWarning
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Reschedule</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
