import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Search, 
  Printer, 
  CalendarPlus, 
  UserPlus, 
  CalendarClock,
  Sparkles
} from 'lucide-react';
import { 
  Appointment, 
  AppointmentStatus, 
  ClinicSettings, 
  UserRole, 
  Profile,
  Payment 
} from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { DoctorAvatar } from '../common/DoctorAvatar';
import { IndianRupee, Receipt } from 'lucide-react';

interface ReceptionDashboardProps {
  userRole: UserRole;
  currentProfile: Profile;
  settings: ClinicSettings;
  onOpenNewAppointment: () => void;
  onOpenNewPatient: () => void;
  onOpenPatientProfile: (patientId: string) => void;
  onPrintSlip: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onScheduleNextVisit: (appointment: Appointment) => void;
  onStatusUpdated: () => void;
  onCollectPayment?: (appointment: Appointment) => void;
  onViewReceipt?: (payment: Payment) => void;
  onNavigateToFinance?: () => void;
}

export const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({
  userRole,
  currentProfile,
  settings,
  onOpenNewAppointment,
  onOpenNewPatient,
  onOpenPatientProfile,
  onPrintSlip,
  onReschedule,
  onScheduleNextVisit,
  onStatusUpdated,
  onCollectPayment,
  onViewReceipt,
  onNavigateToFinance,
}) => {
  const isDoctor = userRole === 'doctor';
  const myDoctorId = currentProfile.doctor_id;

  // Filter state
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>(
    isDoctor && myDoctorId ? myDoctorId : 'ALL'
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const allTodayAppointments = clinicRepo.getTodayAppointments(todayStr);
  const doctors = clinicRepo.getDoctors();

  // Statistics calculation
  const totalToday = allTodayAppointments.length;
  const waitingCount = allTodayAppointments.filter(a => a.status === 'Waiting').length;
  const checkedInCount = allTodayAppointments.filter(a => a.status === 'Checked-in').length;
  const inConsultCount = allTodayAppointments.filter(a => a.status === 'In Consultation').length;
  const completedCount = allTodayAppointments.filter(a => a.status === 'Completed').length;
  const cancelledCount = allTodayAppointments.filter(a => a.status === 'Cancelled').length;
  const noShowCount = allTodayAppointments.filter(a => a.status === 'No Show').length;
  const todaySummary = clinicRepo.getDailyFinancialSummary(todayStr);

  // Filter today's list
  const filteredAppointments = allTodayAppointments.filter((apt) => {
    if (selectedDoctorFilter !== 'ALL' && apt.doctor_id !== selectedDoctorFilter) {
      return false;
    }
    if (selectedStatusFilter !== 'ALL' && apt.status !== selectedStatusFilter) {
      return false;
    }
    if (selectedTypeFilter !== 'ALL' && apt.appointment_type !== selectedTypeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const pat = apt.patient;
      const matchName = pat ? `${pat.first_name} ${pat.last_name}`.toLowerCase().includes(q) : false;
      const matchCode = pat?.patient_code?.toLowerCase().includes(q);
      const matchMobile = pat?.mobile?.toLowerCase().includes(q);
      const matchAptCode = apt.appointment_code?.toLowerCase().includes(q);
      const matchToken = String(apt.token_number) === q || `${settings.token_prefix}-${apt.token_number}`.toLowerCase() === q;
      if (!matchName && !matchCode && !matchMobile && !matchAptCode && !matchToken) {
        return false;
      }
    }
    return true;
  });

  // Next patient in queue
  const nextInQueue = allTodayAppointments.find(
    a => a.status === 'Checked-in' || a.status === 'Waiting'
  );

  // Next doctor availability for the promo block
  const activeDoctor = doctors.find(d => d.active) || doctors[0];
  const nextTime = nextInQueue ? nextInQueue.appointment_time : '11:30 AM';

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus, reasonPrompt = false) => {
    let reason: string | undefined;
    if (reasonPrompt) {
      const input = window.prompt(`Please enter reason for marking as "${newStatus}":`, '');
      if (input === null) return;
      reason = input.trim() || undefined;
    }

    clinicRepo.updateAppointmentStatus(
      appointmentId,
      newStatus,
      reason
    );
    onStatusUpdated();
  };

  const renderStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span>Completed</span>
          </span>
        );
      case 'In Consultation':
        return (
          <span className="flex items-center gap-1.5 text-blue-600 font-semibold text-xs">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span>In Consult</span>
          </span>
        );
      case 'Waiting':
        return (
          <span className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            <span>Waiting</span>
          </span>
        );
      case 'Checked-in':
        return (
          <span className="flex items-center gap-1.5 text-sky-600 font-semibold text-xs">
            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
            <span>Checked-in</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="flex items-center gap-1.5 text-rose-500 font-semibold text-xs">
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
            <span>Cancelled</span>
          </span>
        );
      case 'No Show':
        return (
          <span className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs">
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            <span>No Show</span>
          </span>
        );
      case 'Scheduled':
      default:
        return (
          <span className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs">
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            <span>Scheduled</span>
          </span>
        );
    }
  };

  const currentDateDisplay = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  }).toUpperCase();
  const currentDayNum = new Date().getDate().toString().padStart(2, '0');
  const currentMonthStr = new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  return (
    <div className="space-y-6">
      
      {/* 5 STATS METRIC CARDS matching Sleek Interface Design */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Today's Total */}
        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm h-[90px] flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Total</p>
            <p className="text-xl font-bold text-slate-800 leading-tight">{totalToday}</p>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 transition-all duration-500" 
              style={{ width: totalToday > 0 ? '100%' : '0%' }}
            />
          </div>
        </div>

        {/* Card 2: Waiting */}
        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm h-[90px] flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Waiting</p>
            <p className="text-xl font-bold text-amber-600 leading-tight">
              {String(waitingCount).padStart(2, '0')}
            </p>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-500" 
              style={{ width: totalToday > 0 ? `${(waitingCount / totalToday) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Card 3: Checked-in */}
        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm h-[90px] flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Checked-in</p>
            <p className="text-xl font-bold text-blue-600 leading-tight">
              {String(checkedInCount).padStart(2, '0')}
            </p>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500" 
              style={{ width: totalToday > 0 ? `${(checkedInCount / totalToday) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Card 4: Completed */}
        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm h-[90px] flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-xl font-bold text-emerald-600 leading-tight">
              {String(completedCount).padStart(2, '0')}
            </p>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: totalToday > 0 ? `${(completedCount / totalToday) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Card 5: Today's Collection */}
        <div 
          onClick={onNavigateToFinance}
          className="bg-emerald-50/70 hover:bg-emerald-100/80 transition-all px-4 py-2.5 rounded-xl border border-emerald-200 shadow-sm h-[90px] flex flex-col justify-between cursor-pointer group"
          title="Click to open Finance Module"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Collections</p>
              <p className="text-xl font-bold text-emerald-800 leading-tight">
                ₹{todaySummary.totalCollection.toLocaleString('en-IN')}
              </p>
            </div>
            <Receipt className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform mt-0.5" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-700 font-medium">
            <span>Cash: ₹{todaySummary.cashCollection.toLocaleString('en-IN')}</span>
            <span>UPI: ₹{todaySummary.upiCollection.toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* TODAY'S APPOINTMENTS QUEUE CARD matching Sleek Interface Design */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
        
        {/* Card Header with Dropdown Filters */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-slate-800 text-base">Today's Appointments Queue</h3>
            <span className="text-xs text-slate-400 font-medium">({filteredAppointments.length})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-today-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter queue..."
                className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none w-36 sm:w-44"
              />
            </div>

            {/* Doctor Select */}
            <select 
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg py-1 px-2 text-slate-700 bg-slate-50 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select 
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg py-1 px-2 text-slate-700 bg-slate-50 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="Waiting">Waiting</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>

            {(selectedDoctorFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedDoctorFilter('ALL');
                  setSelectedStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold px-1 cursor-pointer"
              >
                Reset
              </button>
            )}

          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100 z-10">
              <tr>
                <th className="px-6 py-3">Token</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Patient Name / ID</th>
                <th className="px-6 py-3">Doctor</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Fee / Payment</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No appointments in today's queue matching the filter.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const pat = apt.patient;
                  const doc = apt.doctor;
                  const tokenText = `#${String(apt.token_number).padStart(3, '0')}`;
                  const isInConsult = apt.status === 'In Consultation';
                  const isPaid = apt.payment_status === 'PAID';
                  const fee = apt.fee_amount || (apt.appointment_type === 'Follow-up' ? 300 : 500);

                  return (
                    <tr 
                      key={apt.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isInConsult ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* Token */}
                      <td className="px-6 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {tokenText}
                      </td>

                      {/* Time */}
                      <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {apt.appointment_time}
                      </td>

                      {/* Patient Name / ID */}
                      <td className="px-6 py-3">
                        <button
                          onClick={() => pat && onOpenPatientProfile(pat.id)}
                          className="font-semibold text-slate-900 hover:text-sky-600 transition-colors text-left cursor-pointer"
                        >
                          {pat ? `${pat.first_name} ${pat.last_name}` : 'Unknown Patient'}
                        </button>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {pat?.patient_code || apt.patient_id}
                          {pat?.mobile ? ` • ${pat.mobile}` : ''}
                        </p>
                      </td>

                      {/* Doctor with Photo */}
                      <td className="px-6 py-3 text-xs text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <DoctorAvatar
                            name={doc?.name || 'Doctor'}
                            photoUrl={doc?.photo_url}
                            doctorId={doc?.id}
                            size="sm"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">{doc?.name || 'Doctor'}</span>
                            <span className="text-[10px] text-slate-400">{doc?.consultation_room || 'Bay 1'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Type Pill */}
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                          {apt.appointment_type}
                        </span>
                      </td>

                      {/* Status with dot indicator */}
                      <td className="px-6 py-3 whitespace-nowrap">
                        {renderStatusBadge(apt.status)}
                      </td>

                      {/* Fee & Payment Status */}
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                            {isPaid ? 'PAID' : 'UNPAID'}
                          </span>
                          <span className="font-semibold text-slate-800 font-mono text-xs">₹{fee}</span>
                        </div>
                      </td>

                      {/* Actions matching Sleek Interface styling */}
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Collect Fee / View Receipt */}
                          {isPaid ? (
                            <button
                              id={`btn-receipt-${apt.id}`}
                              onClick={() => {
                                const pm = apt.payment_id ? clinicRepo.getPaymentById(apt.payment_id) : clinicRepo.getPaymentsByAppointmentId(apt.id)[0];
                                if (pm && onViewReceipt) onViewReceipt(pm);
                              }}
                              className="text-emerald-700 hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="View Money Receipt"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          ) : (
                            onCollectPayment && (
                              <button
                                id={`btn-collect-${apt.id}`}
                                onClick={() => onCollectPayment(apt)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Collect Consultation Fee"
                              >
                                <IndianRupee className="w-2.5 h-2.5" />
                                <span>Collect</span>
                              </button>
                            )
                          )}

                          {/* Print Slip */}
                          <button
                            id={`btn-print-slip-${apt.id}`}
                            onClick={() => onPrintSlip(apt)}
                            className="text-sky-600 hover:underline text-xs font-medium cursor-pointer"
                          >
                            Print Slip
                          </button>

                          {/* Quick workflow buttons matching sleek buttons */}
                          {apt.status === 'Scheduled' && (
                            <button
                              id={`btn-checkin-${apt.id}`}
                              onClick={() => handleStatusChange(apt.id, 'Checked-in')}
                              className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              Check In
                            </button>
                          )}

                          {apt.status === 'Checked-in' && (
                            <button
                              id={`btn-mark-waiting-${apt.id}`}
                              onClick={() => handleStatusChange(apt.id, 'Waiting')}
                              className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              Waiting
                            </button>
                          )}

                          {(apt.status === 'Checked-in' || apt.status === 'Waiting') && (
                            <button
                              id={`btn-start-consult-${apt.id}`}
                              onClick={() => handleStatusChange(apt.id, 'In Consultation')}
                              className="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              Start
                            </button>
                          )}

                          {apt.status === 'In Consultation' && (
                            <button
                              id={`btn-complete-${apt.id}`}
                              onClick={() => handleStatusChange(apt.id, 'Completed')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              Complete
                            </button>
                          )}

                          {/* Next visit button */}
                          <button
                            onClick={() => onScheduleNextVisit(apt)}
                            className="text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                            title="Schedule Next Visit"
                          >
                            + Next
                          </button>

                          {/* Reschedule button */}
                          {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                            <button
                              onClick={() => onReschedule(apt)}
                              className="border border-slate-200 px-2 py-1 rounded text-[10px] text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Reschedule
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* FAST-TRACK BANNER & NEXT AVAILABILITY CARD matching Sleek Interface Design */}
      <div className="flex flex-col sm:flex-row gap-6">
        
        {/* Fast-track banner */}
        <div className="flex-1 bg-gradient-to-br from-sky-600 to-sky-700 rounded-xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="text-xs sm:text-sm opacity-80 uppercase tracking-wider font-semibold">
              New Patient Admission
            </p>
            <h2 className="text-xl font-bold mt-0.5 tracking-tight">
              Register Patient Fast-track
            </h2>
            <p className="text-xs text-sky-100 mt-1 max-w-md">
              Rapid front-desk registration with automatic UHID allocation and instant token generation
            </p>
          </div>

          <button 
            id="btn-fasttrack-register"
            onClick={onOpenNewPatient}
            className="bg-white text-sky-700 px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-md hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0 self-start sm:self-center"
          >
            + Start Registration
          </button>
        </div>

        {/* Next Availability Card */}
        <div className="w-full sm:w-72 bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-center shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Next Availability
            </span>
            <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Active Now
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border border-slate-200/60">
              <span className="text-[8px] font-bold text-slate-500">{currentMonthStr}</span>
              <span className="text-sm font-bold leading-none text-slate-800">{currentDayNum}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">
                {activeDoctor?.name || 'Dr. Mridusmita Pathak'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {activeDoctor?.specialization || 'General Dentistry'} • {nextTime}
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
