import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Printer, 
  CalendarPlus, 
  CalendarClock, 
  Clock, 
  User, 
  Stethoscope,
  ChevronRight,
  RefreshCw,
  Receipt,
  IndianRupee
} from 'lucide-react';
import { Appointment, Doctor, AppointmentStatus, AppointmentType, ClinicSettings, UserRole, Payment } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { DoctorAvatar } from '../common/DoctorAvatar';

interface AppointmentsListProps {
  userRole: UserRole;
  settings: ClinicSettings;
  onOpenNewAppointment: () => void;
  onOpenPatientProfile: (patientId: string) => void;
  onPrintSlip: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onScheduleNextVisit: (appointment: Appointment) => void;
  onStatusUpdated: () => void;
  onCollectPayment?: (appointment: Appointment) => void;
  onViewReceipt?: (payment: Payment) => void;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  userRole,
  settings,
  onOpenNewAppointment,
  onOpenPatientProfile,
  onPrintSlip,
  onReschedule,
  onScheduleNextVisit,
  onStatusUpdated,
  onCollectPayment,
  onViewReceipt,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const appointments = clinicRepo.getAppointments();
  const doctors = clinicRepo.getDoctors();

  const filtered = appointments.filter((apt) => {
    if (selectedDate && apt.appointment_date !== selectedDate) return false;
    if (selectedDoctor !== 'ALL' && apt.doctor_id !== selectedDoctor) return false;
    if (selectedStatus !== 'ALL' && apt.status !== selectedStatus) return false;
    if (selectedType !== 'ALL' && apt.appointment_type !== selectedType) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const pat = apt.patient;
      const patName = `${pat?.first_name || ''} ${pat?.last_name || ''}`.toLowerCase();
      const patCode = (pat?.patient_code || apt.patient_id).toLowerCase();
      const matches = 
        patName.includes(q) || 
        patCode.includes(q) || 
        apt.appointment_code.toLowerCase().includes(q) ||
        (pat?.mobile && pat.mobile.includes(q));
      if (!matches) return false;
    }

    return true;
  });

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    clinicRepo.updateAppointmentStatus(appointmentId, newStatus);
    onStatusUpdated();
  };

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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <span>Master Appointments Schedule</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View, filter, manage, and reschedule all clinic appointments across all dates
          </p>
        </div>

        <button
          onClick={onOpenNewAppointment}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>+ Book Appointment</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, UHID, mobile..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              title="Filter by specific date (leave empty for all)"
            />
          </div>

          {/* Doctor Filter */}
          <div>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Waiting">Waiting</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          {/* Type Filter & Reset */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="New Consultation">New Consultation</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Procedure">Procedure</option>
              <option value="Emergency">Emergency</option>
              <option value="Review">Review</option>
            </select>

            {(selectedDate || selectedDoctor !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  setSelectedDoctor('ALL');
                  setSelectedStatus('ALL');
                  setSelectedType('ALL');
                  setSearchQuery('');
                }}
                className="px-2 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                title="Reset filters"
              >
                Reset
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Appointments Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Appointments List ({filtered.length})
          </div>
          {selectedDate && (
            <span className="text-xs text-sky-700 font-medium">
              Filtered for date: {selectedDate}
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No appointments match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Token</th>
                  <th className="py-3.5 px-4">Patient ID / Name</th>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Fee & Payment</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((apt) => {
                  const pat = apt.patient;
                  const doc = apt.doctor;
                  const tokenDisplay = `${settings.token_prefix ? settings.token_prefix + '-' : ''}${String(apt.token_number).padStart(2, '0')}`;
                  const isPaid = apt.payment_status === 'PAID';
                  const fee = apt.fee_amount || (apt.appointment_type === 'Follow-up' ? 300 : 500);

                  return (
                    <tr key={apt.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{apt.appointment_date}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{apt.appointment_time}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {tokenDisplay}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => pat && onOpenPatientProfile(pat.id)}
                          className="font-semibold text-slate-900 hover:text-sky-700 text-left block cursor-pointer"
                        >
                          {pat ? `${pat.first_name} ${pat.last_name}` : 'Unknown'}
                        </button>
                        <span className="font-mono text-sky-700 text-[11px]">{pat?.patient_code}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <DoctorAvatar
                            name={doc?.name || 'Doctor'}
                            photoUrl={doc?.photo_url}
                            doctorId={doc?.id}
                            size="sm"
                          />
                          <div>
                            <div className="font-semibold text-slate-800">{doc?.name}</div>
                            <div className="text-slate-400 text-[10px]">{doc?.specialization}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {apt.appointment_type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(apt.status)}`}>
                          {apt.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                            {isPaid ? 'PAID' : 'UNPAID'}
                          </span>
                          <span className="font-semibold text-slate-800 font-mono text-xs">₹{fee}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-600">
                        {apt.reason}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {isPaid ? (
                            <button
                              onClick={() => {
                                const pm = apt.payment_id ? clinicRepo.getPaymentById(apt.payment_id) : clinicRepo.getPaymentsByAppointmentId(apt.id)[0];
                                if (pm && onViewReceipt) onViewReceipt(pm);
                              }}
                              className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                              title="View Money Receipt"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            onCollectPayment && (
                              <button
                                onClick={() => onCollectPayment(apt)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-0.5 shadow-2xs transition-colors cursor-pointer"
                                title="Collect Consultation Fee"
                              >
                                <IndianRupee className="w-3 h-3" />
                                <span>Collect</span>
                              </button>
                            )
                          )}

                          <button
                            onClick={() => onPrintSlip(apt)}
                            className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                            title="Print Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                            <button
                              onClick={() => onReschedule(apt)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                              title="Reschedule"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onScheduleNextVisit(apt)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            title="Schedule Follow-up"
                          >
                            + Next Visit
                          </button>
                        </div>
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
  );
};
